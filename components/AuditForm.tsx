import React, { useState, useRef } from 'react';
import { Clipboard, FileText, Eraser, Play, Upload, X, FileUp, Files } from 'lucide-react';
import { AnalysisInput } from '../services/geminiService';

interface AuditFormProps {
  onAnalyze: (input: AnalysisInput) => void;
  isAnalyzing: boolean;
}

const EXAMPLE_RECORD = `主诉：左眼视力下降1年。
现病史：患者1年前无明显诱因出现左眼视力下降，无眼红、眼痛。
查体：V.A. OD 0.8, OS 0.1。IOP OD 15mmHg, OS 16mmHg。
双眼结膜无充血，角膜透明。
右眼晶状体轻度混浊(C1N1)。
左眼晶状体混浊明显(C3N2)。
眼底：双眼视盘边界清，C/D 0.3，黄斑中心凹反光可见。
诊断：老年性白内障（双眼）。`;

export const AuditForm: React.FC<AuditFormProps> = ({ onAnalyze, isAnalyzing }) => {
  const [text, setText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFiles.length > 0) {
      // Handle Multiple PDFs
      try {
        const filePromises = selectedFiles.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              // Extract base64 part
              const result = reader.result as string;
              const base64 = result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        });

        const base64Contents = await Promise.all(filePromises);
        onAnalyze({ type: 'pdf', contents: base64Contents });
      } catch (err) {
        console.error("File reading error", err);
        alert("文件读取失败，请重试");
      }
    } else if (text.trim()) {
      // Handle Text
      onAnalyze({ type: 'text', content: text });
    }
  };

  const loadExample = () => {
    setText(EXAMPLE_RECORD);
    setSelectedFiles([]);
  };

  const clearAll = () => {
    setText('');
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter((f) => (f as File).type === 'application/pdf') as File[];
      
      if (newFiles.length !== e.target.files.length) {
        alert('部分非 PDF 格式文件已被自动过滤。');
      }

      setSelectedFiles(prev => [...prev, ...newFiles]);
      setText(''); // Clear text when file is selected to avoid confusion
    }
    // Reset input so same files can be selected again if needed (though we append now)
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          病历输入
        </h2>
        <div className="flex gap-2">
           <button 
            type="button"
            onClick={loadExample}
            disabled={isAnalyzing}
            className="text-xs px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors flex items-center gap-1"
          >
            <Clipboard className="w-3 h-3" />
            加载范例
          </button>
          <button 
            type="button"
            onClick={clearAll}
            disabled={isAnalyzing}
            className="text-xs px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 transition-colors flex items-center gap-1"
          >
            <Eraser className="w-3 h-3" />
            清空
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4">
        
        {/* File Upload Area */}
        <div className="mb-4 space-y-3">
            <input 
                type="file" 
                ref={fileInputRef}
                accept="application/pdf"
                className="hidden" 
                multiple
                onChange={handleFileChange}
                disabled={isAnalyzing}
            />
            
            {selectedFiles.length === 0 ? (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing}
                    className="w-full py-6 px-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 text-sm font-medium"
                >
                    <Upload className="w-6 h-6 mb-1" />
                    <span>点击上传 PDF 病历文件</span>
                    <span className="text-xs text-slate-400 font-normal">支持同时上传多个文件（如：入院记录、手术记录等）</span>
                </button>
            ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                   {selectedFiles.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="w-full py-2 px-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between animate-fadeIn">
                          <div className="flex items-center gap-3 overflow-hidden">
                              <div className="bg-blue-100 p-1.5 rounded-md flex-shrink-0">
                                  <FileUp className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-medium text-slate-800 truncate" title={file.name}>{file.name}</span>
                                  <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                              </div>
                          </div>
                          <button 
                              type="button" 
                              onClick={() => removeFile(idx)}
                              disabled={isAnalyzing}
                              className="p-1 hover:bg-red-100 rounded-full text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                          >
                              <X className="w-4 h-4" />
                          </button>
                      </div>
                   ))}
                   
                   <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing}
                    className="w-full py-2 text-xs text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-md transition-colors flex items-center justify-center gap-1"
                   >
                     <Files className="w-3 h-3" />
                     添加更多文件...
                   </button>
                </div>
            )}
        </div>

        {/* Text Area */}
        <div className="relative flex-1">
             <textarea
                value={text}
                onChange={(e) => {
                    setText(e.target.value);
                    if (selectedFiles.length > 0) setSelectedFiles([]); // Prioritize typing if user types
                }}
                placeholder={selectedFiles.length > 0 ? "已选择 PDF 文件模式（若需输入文本，请先清空文件列表）..." : "在此粘贴眼科病历文本..."}
                className={`w-full h-full p-4 rounded-lg border bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none font-mono text-sm leading-relaxed transition-all ${selectedFiles.length > 0 ? 'border-slate-200 text-slate-400 bg-slate-100 cursor-not-allowed' : 'border-slate-200'}`}
                disabled={isAnalyzing || selectedFiles.length > 0}
            />
            {selectedFiles.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg text-slate-500 text-sm shadow-sm border border-slate-200">
                        正在使用 PDF 多文件模式 ({selectedFiles.length} 个文件)
                    </span>
                </div>
            )}
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={isAnalyzing || (!text.trim() && selectedFiles.length === 0)}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white shadow-md transition-all
              ${isAnalyzing || (!text.trim() && selectedFiles.length === 0)
                ? 'bg-slate-300 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-95'}
            `}
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                正在审核 ({selectedFiles.length > 0 ? `${selectedFiles.length}份文档` : '文本'})...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                开始质控
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
