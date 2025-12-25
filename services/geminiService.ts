import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AuditResult } from "../types";

const SYSTEM_INSTRUCTION = `
**Role (角色设定):**
你是一位拥有20年经验的眼科主任医师，同时也是医院病案管理委员会的资深质控专家。你的核心职责是审核病历的**合规性**、**逻辑连贯性**和**文书质量**。

**Core Task (核心任务):**
针对 OCR 识别后的病历文本，进行深度扫描，重点找出以下三类问题并存入 \`text_quality_issues\` 列表：

1.  **语意不通 (Semantic Incoherence):**
    *   **语句中断/残缺:** 识别因 OCR 漏行、识别错误或医生书写疏忽导致的“半截话”或句子成分缺失。
        *   *示例:* “患者入院后给予，视力情况。” (缺失谓语或宾语)。
    *   **语法混乱:** 识别指代不明、主谓搭配不当或明显不通顺的句子。
    *   *示例:* “检查发现结膜，角膜透明。” (结膜怎么样了？未描述)。

2.  **逻辑矛盾 (Logical Inconsistency):**
    *   **自相矛盾:** 同一句或相邻段落中出现医学逻辑上完全对立的描述。
        *   *示例:* “现病史：无眼红眼痛... 查体：结膜混合充血(++)。” (充血通常伴红痛)。
        *   *示例:* “否认全身病史... 既往高血压10年。”
        *   *示例:* “左眼视力下降... 检查: V.A. OD 0.1, OS 1.0。” (主诉左眼，查体却是右眼差)。
    *   **诊断依据不足:** 诊断与查体数据不匹配。
        *   *示例:* 诊断“老年性白内障”，但查体描述“晶体透明”。

3.  **错别字与术语错误 (Typos & Terminology):**
    *   识别医学术语的同音错字或不规范用语。
    *   *示例:* “晶体浑浊”→“混浊”；“黄斑水种”→“水肿”；“抗炎”用于非感染性炎症时是否准确等。

**OCR Correction (OCR 纠错指南):**
在判定前，必须先在思维链中修正 OCR 引起的格式干扰（如 QD/OS 侧别混淆，Tn 眼压数值误读）。**不要**把单纯的 OCR 乱码（如格式错位）误报为病历逻辑错误，除非它确实影响了医学语义的理解。

**Output Requirement (输出要求):**
严格遵守 JSON Schema。
*   **Location:** 必须精确指出问题所在的具体段落、表头或行数（如“现病史第2行”、“查体-眼压栏”）。
*   **Suggestion:** 针对语意不通或逻辑矛盾，给出具体的**润色建议**或**修正后的通顺句子**。
`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    analysis_meta: {
      type: Type.OBJECT,
      properties: {
        patient_name: { type: Type.STRING, description: "识别到的患者姓名，若无则显示'未识别'" },
        ocr_correction_log: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "列出自动修正的OCR错误日志" 
        }
      },
      required: ["patient_name", "ocr_correction_log"]
    },
    quality_score: { 
      type: Type.INTEGER, 
      description: "0-100的质控评分" 
    },
    critical_defects: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "致命的逻辑错误及侧别错误列表"
    },
    warnings: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "缺失项或数值异常警告"
    },
    text_quality_issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING, description: "存在问题的原文片段" },
          suggestion: { type: Type.STRING, description: "修正或润色建议" },
          location: { type: Type.STRING, description: "该问题在病历中的具体位置（如：'入院记录-现病史'，'第1页-查体表格'）" }
        },
        required: ["original", "suggestion", "location"]
      },
      description: "错别字、术语不规范、语意不通及逻辑矛盾的详细清单"
    },
    medical_summary: { 
      type: Type.STRING,
      description: "一句话概括患者病情及诊疗经过"
    },
    audit_result: { 
      type: Type.STRING, 
      enum: ["合格", "需修改", "不合格"],
      description: "最终审核结论"
    }
  },
  required: ["analysis_meta", "quality_score", "critical_defects", "warnings", "text_quality_issues", "medical_summary", "audit_result"]
};

export type AnalysisInput = 
  | { type: 'text'; content: string }
  | { type: 'pdf'; contents: string[] }; 

export const analyzeMedicalRecord = async (input: AnalysisInput): Promise<AuditResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key 缺失，请检查环境变量配置。");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    let contentsPayload;

    if (input.type === 'text') {
      contentsPayload = [
        {
          role: "user",
          parts: [{ text: `请审核以下眼科病历内容：\n\n${input.content}` }]
        }
      ];
    } else {
      // PDF handling (Multiple Files)
      const pdfParts = input.contents.map(base64Data => ({
        inlineData: {
          mimeType: "application/pdf",
          data: base64Data
        }
      }));

      contentsPayload = [
        {
          role: "user",
          parts: [
            ...pdfParts,
            { text: "请审核这份（或这几份组合的）眼科病历文件。请将所有上传的文件视为同一个患者的完整病历资料，综合前后文进行一致性和完整性检查。" }
          ]
        }
      ];
    }

    // Using gemini-3-pro-preview for better logical reasoning and complex text tasks
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: contentsPayload,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini 未返回任何响应。");
    }

    const result = JSON.parse(text) as AuditResult;
    return result;

  } catch (error) {
    console.error("Audit failed:", error);
    throw error;
  }
};