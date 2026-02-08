import React, { useState } from 'react';
import { UploadedFile, MergeResult } from '../types';
import { Trash2, Download, ArrowRight, RefreshCw, FilePlus, GripVertical, Lock, Unlock, Key, AlertCircle, Eye } from 'lucide-react';
import { formatBytes } from '../lib/utils';
import PdfPreviewModal from './PdfPreviewModal';

interface DashboardProps {
  files: UploadedFile[];
  onRemoveFile: (id: string) => void;
  onReorder: (files: UploadedFile[]) => void;
  onMerge: () => void;
  onClear: () => void;
  onAddMore: () => void;
  onPasswordSubmit: (id: string, password: string) => Promise<boolean>;
  isMerging: boolean;
  result: MergeResult | null;
  progress?: number;
  progressMessage?: string;
  error?: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  files, 
  onRemoveFile,
  onReorder,
  onMerge, 
  onClear,
  onAddMore,
  onPasswordSubmit,
  isMerging,
  result,
  progress = 0,
  progressMessage = "",
  error
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Preview State
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);

  // Local state for password inputs
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, boolean>>({});

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
    
    // Create a transparent drag image or customize it if needed
    // e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newFiles = [...files];
    const [removed] = newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, removed);
    
    onReorder(newFiles);
    setDraggedIndex(null);
  };

  const handlePasswordChange = (id: string, value: string) => {
    setPasswords(prev => ({ ...prev, [id]: value }));
    // Clear error when typing
    if (passwordErrors[id]) {
      setPasswordErrors(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSubmitPassword = async (id: string) => {
    const pwd = passwords[id];
    if (!pwd) return;

    const success = await onPasswordSubmit(id, pwd);
    if (!success) {
      setPasswordErrors(prev => ({ ...prev, [id]: true }));
    } else {
      // Clear password input on success
      setPasswords(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSubmitPassword(id);
    }
  };

  const hasLockedFiles = files.some(f => f.isEncrypted && !f.password);

  if (result) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-center p-12 transition-colors duration-300">
           <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
             <Download className="w-10 h-10 text-green-600 dark:text-green-400" />
           </div>
           <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">Files Merged Successfully!</h2>
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
               Download PDF
             </a>
             <button 
               onClick={onClear}
               className="inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-8 py-4 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
             >
               <RefreshCw className="w-5 h-5" />
               Merge New Files
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PdfPreviewModal 
        file={previewFile} 
        onClose={() => setPreviewFile(null)} 
      />

      <div className="max-w-4xl mx-auto px-4 py-8 w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <div>
               <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Files to Merge ({files.length})</h2>
               <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                 {hasLockedFiles ? 'Some files are password protected' : 'Drag and drop to reorder files'}
               </p>
            </div>
            <button 
              onClick={onAddMore}
              disabled={isMerging}
              className={`
                flex items-center gap-2 font-medium px-4 py-2 rounded-lg transition-colors
                ${isMerging 
                  ? 'text-slate-400 cursor-not-allowed' 
                  : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                }
              `}
            >
              <FilePlus className="w-4 h-4" />
              Add Files
            </button>
          </div>
          
          {/* Global Error Display */}
          {error && (
            <div className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3">
               <AlertCircle className="w-5 h-5 flex-shrink-0" />
               <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col p-2 space-y-2">
            {files.map((file, index) => {
              const isDragged = draggedIndex === index;
              const isDragOver = dragOverIndex === index;
              const needsPassword = file.isEncrypted && !file.password;
              
              return (
                <div 
                  key={file.id} 
                  draggable={!isMerging && !needsPassword} 
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`
                    relative rounded-xl border transition-all duration-200 group
                    ${isDragged ? 'opacity-40 scale-[0.98]' : 'hover:shadow-md'}
                    ${needsPassword 
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' 
                      : 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900/50'
                    }
                  `}
                >
                  {/* Drop Indicator Line */}
                  {isDragOver && (
                    <div className="absolute -top-2 left-0 right-0 h-1 bg-indigo-500 rounded-full z-10 pointer-events-none shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                  )}

                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 overflow-hidden flex-1">
                      <div 
                        className={`
                          cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 rounded
                          ${(isMerging || needsPassword) ? 'pointer-events-none opacity-50' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}
                        `}
                      >
                        <GripVertical className="w-5 h-5" />
                      </div>
                      
                      {/* Icon State */}
                      <div className={`
                        flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm
                        ${file.password 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/50'
                          : needsPassword 
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                            : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50'
                        }
                      `}>
                        {file.password ? <Unlock className="w-5 h-5" /> : 
                         needsPassword ? <Lock className="w-5 h-5" /> :
                         (index + 1)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-200 truncate pr-4 flex items-center gap-2">
                          {file.name}
                          {file.password && <span className="text-[10px] uppercase tracking-wider bg-green-100 text-green-700 px-2 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400 font-bold">Unlocked</span>}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-2 mt-0.5">
                          {formatBytes(file.size)} 
                          {file.pageCount && <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />}
                          {file.pageCount && <span>{file.pageCount} Pages</span>}
                        </p>
                      </div>
                    </div>

                    {/* Actions Area */}
                    <div className="flex items-center gap-3 sm:ml-4">
                      {needsPassword ? (
                        <div className="flex items-center gap-2 flex-1 sm:flex-none w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-40">
                              <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input 
                                type="password"
                                value={passwords[file.id] || ''}
                                onChange={(e) => handlePasswordChange(file.id, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, file.id)}
                                placeholder="Password"
                                className={`
                                  w-full pl-9 pr-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 bg-white dark:bg-slate-950
                                  transition-all duration-200
                                  ${passwordErrors[file.id] 
                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-800 animate-pulse' 
                                    : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-200 dark:border-slate-700'
                                  }
                                `}
                              />
                            </div>
                            <button
                              onClick={() => handleSubmitPassword(file.id)}
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                              Unlock
                            </button>
                        </div>
                      ) : (
                         <button
                          onClick={() => setPreviewFile(file)}
                          className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          title="Preview Document"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      )}

                      <button 
                        onClick={() => onRemoveFile(file.id)}
                        disabled={isMerging}
                        className={`
                          p-2 rounded-lg transition-colors flex-shrink-0
                          ${isMerging 
                            ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' 
                            : 'text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                          }
                        `}
                        title="Remove file"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-4 items-center">
            {isMerging ? (
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
                  onClick={onMerge}
                  disabled={files.length < 2 || hasLockedFiles}
                  className={`
                    flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all
                    ${(files.length < 2 || hasLockedFiles)
                      ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed opacity-50' 
                      : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 dark:hover:shadow-indigo-900/30'
                    }
                  `}
                >
                  {hasLockedFiles ? 'Unlock Files to Merge' : 'Merge PDF'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
        
        {files.length < 2 && !isMerging && (
          <div className="text-center mt-6 text-slate-500 dark:text-slate-400 text-sm">
            Please add at least 2 PDF files to enable merging.
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;