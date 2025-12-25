import React, { useState } from 'react';
import { analyzeMedicalRecord, AnalysisInput } from './services/geminiService';
import { AuditForm } from './components/AuditForm';
import { AuditReport } from './components/AuditReport';
import { AuditResult } from './types';
import { Eye, Stethoscope } from 'lucide-react';

export default function App() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (input: AnalysisInput) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const auditResult = await analyzeMedicalRecord(input);
      setResult(auditResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析过程中发生意外错误。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
               <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-none">眼科病历智能质控</h1>
              <p className="text-xs text-slate-500 font-medium tracking-wide mt-0.5">MEDICAL QUALITY CONTROL</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            <Stethoscope className="w-4 h-4" />
            <span>AI 辅助主任医师审核系统</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 animate-fadeIn">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-160px)] min-h-[600px]">
          {/* Left Column: Input */}
          <div className="h-full">
            <AuditForm onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
          </div>

          {/* Right Column: Output */}
          <div className="h-full">
            <AuditReport result={result} />
          </div>
        </div>
      </main>

       {/* Footer */}
       <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400">
          <p>© 2024 OphthoAudit AI. 本工具仅用于教学和质控辅助，不能替代专业医师的临床判断。</p>
        </div>
      </footer>
    </div>
  );
}