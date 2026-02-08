import React, { useState } from 'react';
import { UploadedFile, MergeResult, CompressionLevel } from '../types';
import { Download, Minimize2, RefreshCw, FileText, Lock, Unlock, Key, AlertCircle, Eye, Gauge, ArrowRight } from 'lucide-react';
import { formatBytes } from '../lib/utils';
import PdfPreviewModal from './PdfPreviewModal';

interface CompressDashboardProps {
  file: UploadedFile;
  onRemoveFile: () => void;
  onCompress: (level: CompressionLevel) => void;
  onClear: () => void;
  onPasswordSubmit: (password: string) => Promise<boolean>;
  isProcessing: boolean;
  result: MergeResult | null;
  progress?: number;
  progressMessage?: string;
  error?: string | null;
}

const CompressDashboard: React.FC<CompressDashboardProps> = ({ 
  file, 
  onRemoveFile,
  onCompress,
  onClear,
  onPasswordSubmit,
  isProcessing,
  result,
  progress = 0,
  progressMessage = "",
  error
}) => {
  const [level, setLevel] = useState<CompressionLevel>('recommended');
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
    const savings = Math.max(0, file.size - result.size);
    const savingsPercent = Math.round((savings / file.size) * 100);

    return (
      <div className="max-w-3xl mx-auto px-4 py-12 w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-center p-12 transition-colors duration-300">
           <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
             <Download className="w-10 h-10 text-orange-600 dark:text-orange-400" />
           </div>
           <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
             Compressed Successfully!
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

           {savings > 0 ? (
             <div className="inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full font-bold mb-8">
               Saved {savingsPercent}% ({formatBytes(savings)})
             </div>
           ) : (
             <div className="inline-block bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-4 py-2 rounded-full font-bold mb-8 text-sm">
               Already optimized (No significant reduction)
             </div>
           )}
           
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <a 
               href={result.url} 
               download={result.fileName}
               className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-indigo-200 dark:hover:shadow-indigo-900/30"
             >
               <Download className="w-5 h-5" />
               Download Compressed PDF
             </a>
             <button 
               onClick={onClear}
               className="inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-8 py-4 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
             >
               <RefreshCw className="w-5 h-5" />
               Compress Another File
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
               <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Compress Document</h2>
               <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                 Reduce file size while maintaining quality
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
                  <div className="max-w-full">
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                       Compression Level
                     </label>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       {/* Extreme Compression */}
                       <div 
                         onClick={() => setLevel('extreme')}
                         className={`
                           cursor-pointer p-4 rounded-xl border-2 transition-all
                           ${level === 'extreme' 
                             ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                             : 'border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-800'
                           }
                         `}
                       >
                         <div className="flex items-center gap-2 mb-2">
                           <Minimize2 className={`w-5 h-5 ${level === 'extreme' ? 'text-orange-600' : 'text-slate-400'}`} />
                           <span className={`font-bold ${level === 'extreme' ? 'text-orange-700 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'}`}>
                             Extreme
                           </span>
                         </div>
                         <p className="text-xs text-slate-500 dark:text-slate-400">
                           Low visual quality, maximum size reduction. Good for text-heavy drafts.
                         </p>
                       </div>

                       {/* Recommended Compression */}
                       <div 
                         onClick={() => setLevel('recommended')}
                         className={`
                           cursor-pointer p-4 rounded-xl border-2 transition-all
                           ${level === 'recommended' 
                             ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                             : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-800'
                           }
                         `}
                       >
                         <div className="flex items-center gap-2 mb-2">
                           <Gauge className={`w-5 h-5 ${level === 'recommended' ? 'text-indigo-600' : 'text-slate-400'}`} />
                           <span className={`font-bold ${level === 'recommended' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                             Recommended
                           </span>
                         </div>
                         <p className="text-xs text-slate-500 dark:text-slate-400">
                           Balanced visual quality and file size reduction. Standard choice.
                         </p>
                       </div>

                       {/* High Quality */}
                       <div 
                         onClick={() => setLevel('high_quality')}
                         className={`
                           cursor-pointer p-4 rounded-xl border-2 transition-all
                           ${level === 'high_quality' 
                             ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                             : 'border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-800'
                           }
                         `}
                       >
                         <div className="flex items-center gap-2 mb-2">
                           <Eye className={`w-5 h-5 ${level === 'high_quality' ? 'text-green-600' : 'text-slate-400'}`} />
                           <span className={`font-bold ${level === 'high_quality' ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                             High Quality
                           </span>
                         </div>
                         <p className="text-xs text-slate-500 dark:text-slate-400">
                           Excellent visual quality, less size reduction.
                         </p>
                       </div>
                     </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-4 items-center">
            {isProcessing ? (
              <div className="flex-1 flex flex-col justify-center max-w-sm ml-auto">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate mr-2">{progressMessage}</span>
                  <span className="font-bold text-orange-600 dark:text-orange-400">{progress}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-orange-600 dark:bg-orange-500 h-full rounded-full transition-all duration-300 ease-out"
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
                  onClick={() => onCompress(level)}
                  disabled={needsPassword || isProcessing}
                  className={`
                    flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all
                    ${(needsPassword || isProcessing)
                      ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed opacity-50' 
                      : 'bg-orange-600 hover:bg-orange-700 hover:shadow-orange-200 dark:hover:shadow-orange-900/30'
                    }
                  `}
                >
                  Compress PDF
                  <ArrowRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CompressDashboard;