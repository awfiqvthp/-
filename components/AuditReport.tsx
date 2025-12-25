import React, { useState } from 'react';
import { AuditResult } from '../types';
import { AlertTriangle, CheckCircle, ShieldAlert, AlertOctagon, Activity, User, FileSearch, ChevronDown, ChevronUp, Type as TypeIcon, Highlighter, MapPin } from 'lucide-react';

interface AuditReportProps {
  result: AuditResult | null;
}

const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  
  let colorClass = 'text-green-500';
  if (score < 60) colorClass = 'text-red-500';
  else if (score < 85) colorClass = 'text-yellow-500';

  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="56"
          cy="56"
          r="40"
          className="text-slate-100"
          strokeWidth="8"
          fill="none"
          stroke="currentColor"
        />
        <circle
          cx="56"
          cy="56"
          r="40"
          className={`${colorClass} transition-all duration-1000 ease-out`}
          strokeWidth="8"
          fill="none"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700">
        <span className="text-3xl font-bold">{score}</span>
        <span className="text-xs uppercase text-slate-400 font-medium">得分</span>
      </div>
    </div>
  );
};

export const AuditReport: React.FC<AuditReportProps> = ({ result }) => {
  const [showOcrLogs, setShowOcrLogs] = useState(false);

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
        <Activity className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">准备就绪</p>
        <p className="text-sm">请输入病历文本或上传 PDF 文件开始质控分析。</p>
      </div>
    );
  }

  const getResultColor = (status: string) => {
    switch (status) {
      case '不合格': return 'bg-red-100 text-red-700 border-red-200';
      case '需修改': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case '合格': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full animate-fadeIn">
      {/* Header Summary */}
      <div className="p-6 border-b border-slate-100 bg-white">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="flex-shrink-0">
             <ScoreGauge score={result.quality_score} />
          </div>
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-slate-800">质控报告</h2>
              <span className={`px-4 py-1.5 rounded-lg text-sm font-bold border uppercase tracking-wider ${getResultColor(result.audit_result)}`}>
                {result.audit_result}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2 bg-slate-50 p-2 rounded-md inline-flex">
              <User className="w-4 h-4" />
              <span>患者: {result.analysis_meta.patient_name}</span>
            </div>

            <p className="text-slate-600 text-sm leading-relaxed mb-3 font-medium">
              {result.medical_summary}
            </p>
          </div>
        </div>

        {/* OCR Logs Toggle */}
        {result.analysis_meta.ocr_correction_log.length > 0 && (
          <div className="mt-4">
             <button 
              onClick={() => setShowOcrLogs(!showOcrLogs)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
             >
               <FileSearch className="w-3 h-3" />
               {showOcrLogs ? '收起 OCR 自动纠错日志' : `查看 ${result.analysis_meta.ocr_correction_log.length} 条 OCR 纠错记录`}
               {showOcrLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
             </button>
             {showOcrLogs && (
               <div className="mt-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-slate-600 space-y-1 font-mono">
                 {result.analysis_meta.ocr_correction_log.map((log, i) => (
                   <div key={i}>• {log}</div>
                 ))}
               </div>
             )}
          </div>
        )}
      </div>

      <div className="overflow-y-auto flex-1 p-6 space-y-6 bg-slate-50/30">
        
        {/* Critical Defects */}
        <section>
          <h3 className="flex items-center gap-2 font-semibold text-red-600 mb-3">
            <ShieldAlert className="w-5 h-5" />
            致命缺陷 (Critical Defects)
            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">{result.critical_defects.length}</span>
          </h3>
          {result.critical_defects.length > 0 ? (
            <div className="grid gap-3">
              {result.critical_defects.map((error, idx) => (
                <div key={idx} className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg shadow-sm">
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
              ))}
            </div>
          ) : (
             <div className="flex items-center gap-2 text-green-600 text-sm italic bg-green-50 p-3 rounded-lg border border-green-100">
               <CheckCircle className="w-4 h-4" /> 逻辑链完整，未发现侧别或诊断依据错误。
             </div>
          )}
        </section>

        {/* Text Quality Issues (Typos & Semantics) */}
        <section>
          <h3 className="flex items-center gap-2 font-semibold text-purple-600 mb-3">
            <TypeIcon className="w-5 h-5" />
            文书质量监测 (Text Quality)
             <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">{result.text_quality_issues.length}</span>
          </h3>
          {result.text_quality_issues.length > 0 ? (
            <div className="grid gap-2">
              {result.text_quality_issues.map((issue, idx) => (
                <div key={idx} className="bg-purple-50 border border-purple-100 p-3 rounded-lg flex flex-col gap-2 shadow-sm">
                  
                  {/* Location Badge */}
                  <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-purple-500" />
                      <span className="text-xs font-bold text-purple-600 bg-white px-2 py-0.5 rounded border border-purple-200 shadow-sm">
                        {issue.location}
                      </span>
                  </div>

                  {/* Diff View */}
                  <div className="pl-5 text-sm text-slate-700 leading-relaxed">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-red-500 line-through decoration-red-300 decoration-2 opacity-80" title="原文">
                            {issue.original}
                        </span>
                        <span className="text-slate-300">→</span>
                        <span className="text-green-700 font-bold bg-green-100/50 px-1.5 py-0.5 rounded border border-green-200" title="建议修改">
                            {issue.suggestion}
                        </span>
                      </div>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-sm italic px-2">
               <CheckCircle className="w-4 h-4 text-slate-300" /> 未发现错别字或语意不通问题。
            </div>
          )}
        </section>

        {/* Warnings */}
        <section>
          <h3 className="flex items-center gap-2 font-semibold text-amber-600 mb-3">
            <AlertTriangle className="w-5 h-5" />
            缺失项与警告 (Warnings)
             <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">{result.warnings.length}</span>
          </h3>
          {result.warnings.length > 0 ? (
            <div className="grid gap-2">
              {result.warnings.map((warning, idx) => (
                <div key={idx} className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex items-start gap-3">
                  <AlertOctagon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">{warning}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-400 text-sm italic px-2">未发现书写规范问题。</div>
          )}
        </section>

      </div>
    </div>
  );
};