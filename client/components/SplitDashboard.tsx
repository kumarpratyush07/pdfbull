import React, { useState } from 'react';
import { UploadedFile, MergeResult } from '../types';
import { Download, Scissors, RefreshCw, FileText, Lock, Unlock, Key, AlertCircle, FileArchive, Eye } from 'lucide-react';
import { formatBytes } from '../lib/utils';
import PdfPreviewModal from './PdfPreviewModal';

interface SplitDashboardProps {
  file: UploadedFile;
  onRemoveFile: () => void;
  onExtract: (range: string) => void;
  onClear: () => void;
  onPasswordSubmit: (password: string) => Promise<boolean>;
  isProcessing: boolean;
  result: MergeResult | null;
  error?: string | null;
}

const SplitDashboard: React.FC<SplitDashboardProps> = ({ 
  file, 
  onRemoveFile,
  onExtract,
  onClear,
  onPasswordSubmit,
  isProcessing,
  result,
  error
}) => {
  const [range, setRange] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const needsPassword = file.isEncrypted && !file.password;

  const handlePasswordSubmit = async () => {
    if (!password) return;
    const success = await onPasswordSubmit(password);
    if (!success) {
      setPasswordError(true);
    } else {
      setPasswordError(false);
      setPassword('');
    }
  };

  if (result) {
    const isZip = result.fileName.endsWith('.zip');

    return (
      <div className="max-w-3xl mx-auto px-4 py-12 w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-center p-12 transition-colors duration-300">
           <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
             {isZip ? (
                <FileArchive className="w-10 h-10 text-green-600 dark:text-green-400" />
             ) : (
                <Download className="w-10 h-10 text-green-600 dark:text-green-400" />
             )}
           </div>
           <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
             {isZip ? 'Files Created Successfully!' : 'File Created Successfully!'}
           </h2>
           <p className="text-slate-600 dark:text-slate-400 mb-8">
             Your document <strong>{result.fileName}</strong> ({formatBytes(result.size)}) is ready.
           </p>
           
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <a 
               href={result.url} 
               download={result.fileName}
               className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-indigo-200 dark:hover:shadow-indigo-900/30"
             >
               <Download className="w-5 h-5" />
               {isZip ? 'Download ZIP' : 'Download PDF'}
             </a>
             <button 
               onClick={onClear}
               className="inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-8 py-4 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
             >
               <RefreshCw className="w-5 h-5" />
               Split Another File
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showPreview && (
        <PdfPreviewModal 
          file={file} 
          onClose={() => setShowPreview(false)} 
        />
      )}

      <div className="max-w-4xl mx-auto px-4 py-8 w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <div>
               <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Split Document</h2>
               <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                 Extract pages into separate files
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
                  {needsPassword ? (
                    <span className="flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full dark:bg-red-900/30 dark:text-red-400">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  ) : (
                     <span className="flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400">
                      <Unlock className="w-3 h-3" /> {file.pageCount ? `${file.pageCount} Pages` : 'Ready'}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm mb-6">
                   <span className="text-slate-500 dark:text-slate-500">{formatBytes(file.size)}</span>
                   {!needsPassword && (
                     <button 
                       onClick={() => setShowPreview(true)}
                       className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                     >
                       <Eye className="w-4 h-4" /> Preview
                     </button>
                   )}
                </div>

                {needsPassword ? (
                   <div className="max-w-md">
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                       Password Required
                     </label>
                     <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setPasswordError(false);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                            placeholder="Enter password to unlock"
                            className={`
                              w-full pl-9 pr-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 bg-white dark:bg-slate-900
                              ${passwordError
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-800 animate-pulse' 
                                : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-200 dark:border-slate-700'
                              }
                            `}
                          />
                        </div>
                        <button
                          onClick={handlePasswordSubmit}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Unlock
                        </button>
                     </div>
                     {passwordError && <p className="text-red-500 text-xs mt-1">Incorrect password</p>}
                   </div>
                ) : (
                  <div className="max-w-lg">
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                       Ranges (Separate with comma for multiple files)
                     </label>
                     <div className="flex gap-2 mb-2">
                       <input 
                         type="text" 
                         value={range}
                         onChange={(e) => setRange(e.target.value)}
                         placeholder="e.g. 1-4, 8-10"
                         className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                       />
                     </div>
                     <p className="text-xs text-slate-500 dark:text-slate-400">
                       Use commas to separate files. Use spaces to merge ranges (e.g. "1-3 5" is one file).
                     </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-4 items-center">
            <button 
               onClick={onClear}
               className="px-6 py-3 text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => onExtract(range)}
              disabled={needsPassword || !range.trim() || isProcessing}
              className={`
                flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all
                ${(needsPassword || !range.trim() || isProcessing)
                  ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed opacity-50' 
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 dark:hover:shadow-indigo-900/30'
                }
              `}
            >
              {isProcessing ? 'Processing...' : 'Split PDF'}
              <Scissors className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SplitDashboard;