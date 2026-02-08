import React from 'react';
import { UploadedFile, MergeResult } from '../types';
import { Download, RefreshCw, FileText, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { formatBytes } from '../lib/utils';

interface ConversionDashboardProps {
  file: UploadedFile;
  targetFormat: string;
  onRemoveFile: () => void;
  onConvert: () => void;
  onClear: () => void;
  isProcessing: boolean;
  result: MergeResult | null;
  progress?: number;
  progressMessage?: string;
  error?: string | null;
}

const ConversionDashboard: React.FC<ConversionDashboardProps> = ({ 
  file,
  targetFormat,
  onRemoveFile,
  onConvert,
  onClear,
  isProcessing,
  result,
  progress = 0,
  progressMessage = "",
  error
}) => {

  if (result) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-center p-12 transition-colors duration-300">
           <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
             <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
           </div>
           <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
             Conversion Successful!
           </h2>
           
           <div className="flex justify-center gap-8 mb-8 text-sm sm:text-base">
              <div className="text-right">
                <p className="text-slate-500 dark:text-slate-400">Original Size</p>
                <p className="font-semibold text-slate-900 dark:text-slate-200 line-through">{formatBytes(file.size)}</p>
              </div>
              <div className="text-left">
                <p className="text-slate-500 dark:text-slate-400">New Size</p>
                <p className="font-bold text-green-600 dark:text-green-400">{formatBytes(result.size)}</p>
              </div>
           </div>

           <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <a 
               href={result.url} 
               download={result.fileName}
               className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-indigo-200 dark:hover:shadow-indigo-900/30"
             >
               <Download className="w-5 h-5" />
               Download {targetFormat.toUpperCase()}
             </a>
             <button 
               onClick={onClear}
               className="inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-8 py-4 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
             >
               <RefreshCw className="w-5 h-5" />
               Convert Another
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div>
             <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Convert to {targetFormat.toUpperCase()}</h2>
             <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
               Secure client-side conversion
             </p>
          </div>
          <button 
             onClick={onRemoveFile}
             className="text-slate-400 hover:text-red-500 transition-colors"
             title="Remove File"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3">
             <AlertCircle className="w-5 h-5 flex-shrink-0" />
             <span>{error}</span>
          </div>
        )}

        <div className="p-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-24 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-700">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{file.name}</h3>
                <span className="flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400">
                  Ready
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-sm mb-6">
                 <span className="text-slate-500 dark:text-slate-500">{formatBytes(file.size)}</span>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 text-sm text-blue-800 dark:text-blue-300">
                 <p><strong>Note:</strong> Client-side conversion for this format is complex. We will perform a simulated high-quality conversion for this demo.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-4 items-center">
          {isProcessing ? (
            <div className="flex-1 flex flex-col justify-center max-w-sm ml-auto">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700 dark:text-slate-300 truncate mr-2">{progressMessage}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <>
              <button 
                 onClick={onClear}
                 className="px-6 py-3 text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={onConvert}
                disabled={isProcessing}
                className={`
                  flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all
                  ${isProcessing
                    ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed opacity-50' 
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 dark:hover:shadow-indigo-900/30'
                  }
                `}
              >
                Convert to {targetFormat.toUpperCase()}
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversionDashboard;