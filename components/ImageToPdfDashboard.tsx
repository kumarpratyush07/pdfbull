import React, { useState } from 'react';
import { UploadedFile, MergeResult } from '../types';
import { Trash2, Download, ArrowRight, RefreshCw, FilePlus, GripVertical, Image as ImageIcon, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { formatBytes } from '../lib/utils';

interface ImageToPdfDashboardProps {
  files: UploadedFile[];
  onRemoveFile: (id: string) => void;
  onReorder: (files: UploadedFile[]) => void;
  onConvert: (settings: ImageToPdfSettings) => void;
  onClear: () => void;
  onAddMore: () => void;
  isProcessing: boolean;
  result: MergeResult | null;
  progress?: number;
  progressMessage?: string;
  error?: string | null;
}

export interface ImageToPdfSettings {
  pageSize: 'a4' | 'fit';
  orientation: 'portrait' | 'landscape' | 'auto';
  margin: number; // in points, e.g., 0, 20, 50
}

const ImageToPdfDashboard: React.FC<ImageToPdfDashboardProps> = ({ 
  files, 
  onRemoveFile,
  onReorder,
  onConvert, 
  onClear,
  onAddMore,
  isProcessing,
  result,
  progress = 0,
  progressMessage = "",
  error
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [settings, setSettings] = useState<ImageToPdfSettings>({
    pageSize: 'a4',
    orientation: 'auto',
    margin: 20
  });

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
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

  // Helper to create object URL for preview (memoize in real app, but simple for now)
  const getPreviewUrl = (file: UploadedFile) => {
    // Only for small preview, revoking logic handled by browser or GC eventually for simple blobs,
    // proper implementation would track and revoke these.
    try {
        const blob = new Blob([file.data], { type: file.type });
        return URL.createObjectURL(blob);
    } catch {
        return '';
    }
  };

  if (result) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-center p-12 transition-colors duration-300">
           <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
             <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
           </div>
           <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">PDF Created Successfully!</h2>
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
               Convert New Images
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 w-full flex flex-col lg:flex-row gap-8">
      
      {/* Settings Panel */}
      <div className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sticky top-24 transition-colors">
              <div className="flex items-center gap-2 mb-6 text-slate-900 dark:text-slate-100 font-bold text-lg">
                  <Settings className="w-5 h-5" />
                  <h3>PDF Settings</h3>
              </div>

              <div className="space-y-6">
                  {/* Page Size */}
                  <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Page Size</label>
                      <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSettings(s => ({ ...s, pageSize: 'a4' }))}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                settings.pageSize === 'a4'
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-500 dark:text-indigo-300'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                            }`}
                          >
                              A4
                          </button>
                          <button
                            onClick={() => setSettings(s => ({ ...s, pageSize: 'fit' }))}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                settings.pageSize === 'fit'
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-500 dark:text-indigo-300'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                            }`}
                          >
                              Fit Image
                          </button>
                      </div>
                  </div>

                  {/* Orientation (Only for A4) */}
                  {settings.pageSize === 'a4' && (
                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Orientation</label>
                          <select 
                            value={settings.orientation}
                            onChange={(e) => setSettings(s => ({ ...s, orientation: e.target.value as any }))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                              <option value="auto">Auto (Detect)</option>
                              <option value="portrait">Portrait</option>
                              <option value="landscape">Landscape</option>
                          </select>
                      </div>
                  )}

                  {/* Margin */}
                  <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Margin</label>
                      <select 
                            value={settings.margin}
                            onChange={(e) => setSettings(s => ({ ...s, margin: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                              <option value={0}>No Margin</option>
                              <option value={20}>Small</option>
                              <option value={50}>Big</option>
                          </select>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button 
                        onClick={() => onConvert(settings)}
                        disabled={isProcessing}
                        className={`
                          w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all
                          ${isProcessing 
                            ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed opacity-50' 
                            : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 dark:hover:shadow-indigo-900/30'
                          }
                        `}
                      >
                        {isProcessing ? 'Converting...' : 'Convert to PDF'}
                        {!isProcessing && <ArrowRight className="w-5 h-5" />}
                      </button>
                  </div>
              </div>
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <div>
               <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Images ({files.length})</h2>
               <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                 Drag and drop to reorder images
               </p>
            </div>
            <button 
              onClick={onAddMore}
              disabled={isProcessing}
              className="flex items-center gap-2 font-medium px-4 py-2 rounded-lg text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              Add Images
            </button>
          </div>
          
          {error && (
            <div className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3">
               <AlertCircle className="w-5 h-5 flex-shrink-0" />
               <span>{error}</span>
            </div>
          )}

          {isProcessing && (
             <div className="p-6 border-b border-slate-100 dark:border-slate-800">
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
          )}

          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
            {files.map((file, index) => {
              const isDragged = draggedIndex === index;
              const isDragOver = dragOverIndex === index;
              
              return (
                <div 
                  key={file.id} 
                  draggable={!isProcessing}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`
                    relative group rounded-xl border aspect-[3/4] flex flex-col overflow-hidden transition-all duration-200
                    ${isDragged ? 'opacity-40 scale-[0.98]' : 'hover:shadow-md'}
                    ${isDragOver ? 'border-indigo-500 shadow-[0_0_0_2px_rgba(99,102,241,0.5)]' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}
                  `}
                >
                  {/* Image Preview */}
                  <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-2 overflow-hidden">
                      <img 
                        src={getPreviewUrl(file)} 
                        alt={file.name} 
                        className="max-w-full max-h-full object-contain shadow-sm" 
                        loading="lazy"
                      />
                  </div>

                  {/* Info & Controls */}
                  <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2">
                         <div className="min-w-0">
                             <p className="text-xs font-medium text-slate-900 dark:text-slate-200 truncate" title={file.name}>{file.name}</p>
                             <p className="text-[10px] text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p>
                         </div>
                         <button 
                           onClick={() => onRemoveFile(file.id)}
                           disabled={isProcessing}
                           className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                         >
                            <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                  </div>
                  
                  {/* Reorder Handle overlay */}
                  <div className="absolute top-2 left-2 cursor-grab active:cursor-grabbing p-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="w-4 h-4" />
                  </div>
                  
                  {/* Number Badge */}
                  <div className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-indigo-600 text-white text-xs font-bold rounded-full shadow-sm">
                      {index + 1}
                  </div>
                </div>
              );
            })}
          </div>
          
          {files.length === 0 && (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No images selected</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default ImageToPdfDashboard;
