import React, { useRef, useState } from 'react';
import { Layers, AlertCircle, CheckCircle, FileUp, Scissors, Eye, Minimize2 } from 'lucide-react';
import { ToolMode } from '../types';

interface HeroProps {
  mode: ToolMode;
  onFilesSelect: (files: FileList) => void;
  isProcessing: boolean;
  error?: string | null;
}

const Hero: React.FC<HeroProps> = ({ mode, onFilesSelect, isProcessing, error }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isMerge = mode === 'merge';
  const isSplit = mode === 'split';
  const isCompress = mode === 'compress';

  let title, subtitle, icon;

  if (isMerge) {
    title = <>Merge your <span className="text-indigo-600 dark:text-indigo-400">PDFs</span> instantly</>;
    subtitle = "Combine multiple PDF files into one single document. Fast, secure, and completely free.";
    icon = <Layers className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />;
  } else if (isSplit) {
    title = <>Split your <span className="text-indigo-600 dark:text-indigo-400">PDF</span> easily</>;
    subtitle = "Extract pages from your PDF document. Fast, secure, and completely free.";
    icon = <Scissors className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />;
  } else if (isCompress) {
    title = <>Compress your <span className="text-indigo-600 dark:text-indigo-400">PDF</span> files</>;
    subtitle = "Reduce PDF file size while maintaining quality. Fast, secure, and completely free.";
    icon = <Minimize2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />;
  } else {
    // View
    title = <>View your <span className="text-indigo-600 dark:text-indigo-400">PDF</span> securely</>;
    subtitle = "Read and inspect your PDF document directly in your browser. No upload required.";
    icon = <Eye className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />;
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelect(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelect(e.target.files);
    }
  };

  return (
    <div className="relative overflow-hidden bg-slate-50 dark:bg-slate-950 pt-16 pb-20 transition-colors duration-300">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-6">
          {title}
        </h1>
        
        <p className="max-w-2xl text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-10">
          {subtitle} Processed directly in your browser.
        </p>

        <div className="w-full max-w-xl">
          <div 
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative group cursor-pointer
              border-2 border-dashed rounded-2xl p-10 transition-all duration-300
              flex flex-col items-center justify-center
              ${isDragging 
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02]' 
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg dark:hover:shadow-indigo-900/10'
              }
            `}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="application/pdf"
              multiple={isMerge} // Only allow multiple for merge
              onChange={handleFileChange}
            />
            
            <div className={`
              w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4
              group-hover:scale-110 transition-transform duration-300
            `}>
              {isProcessing ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
              ) : icon}
            </div>
            
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {isProcessing ? 'Processing...' : (isMerge ? 'Click to select PDF files' : 'Click to select a PDF file')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isMerge ? 'or drag and drop multiple files here' : 'or drag and drop a file here'}
            </p>

            {error && (
              <div className="mt-4 flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg text-sm animate-pulse">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
          
          <div className="mt-8 flex justify-center gap-8 text-sm font-medium text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
              <span>100% Client-side</span>
            </div>
            {isMerge && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                <span>No File Limits</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
              <span>Drag & Drop</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;