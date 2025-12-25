export interface TextQualityIssue {
  original: string;
  suggestion: string;
  location: string;
}

export interface AuditResult {
  analysis_meta: {
    patient_name: string;
    ocr_correction_log: string[];
  };
  quality_score: number;
  critical_defects: string[];
  warnings: string[];
  text_quality_issues: TextQualityIssue[]; // Updated to object array
  medical_summary: string;
  audit_result: '合格' | '需修改' | '不合格';
}

export interface AuditHistoryItem extends AuditResult {
  id: string;
  timestamp: number;
  originalText: string;
}