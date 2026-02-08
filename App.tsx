import React, { useState, useCallback, useRef, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import SplitDashboard from './components/SplitDashboard';
import CompressDashboard from './components/CompressDashboard';
import PdfPreviewModal from './components/PdfPreviewModal';
import Home from './components/Home';
import { UploadedFile, AppStatus, MergeResult, ToolMode, CompressionLevel } from './types';
import { fileToUint8Array, generateId } from './lib/utils';
import { mergePdfs, checkForEncryption, validatePassword, getPageCount, splitPdf, compressPdf } from './services/pdfService';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolMode>('home');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MergeResult | null>(null);
  
  // Progress state
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  // Dark mode state initialization
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  // Helper to trigger hidden file input from Dashboard if needed
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const handleToolSelect = (tool: ToolMode) => {
    setActiveTool(tool);
    // Reset state when switching tools
    setFiles([]);
    setResult(null);
    setError(null);
    setStatus(AppStatus.IDLE);
  };

  const handleBackToHome = () => {
    handleToolSelect('home');
  };

  const handleFilesSelect = useCallback(async (fileList: FileList) => {
    setError(null);
    
    try {
      const newFiles: UploadedFile[] = [];
      const isSingleFileMode = activeTool === 'split' || activeTool === 'view' || activeTool === 'compress';
      const maxFiles = isSingleFileMode ? 1 : 999;

      // If split/view/compress mode and we already have a file, check count
      if (isSingleFileMode && fileList.length > 1) {
         throw new Error("Please select only one file.");
      }

      const limit = Math.min(fileList.length, maxFiles);

      for (let i = 0; i < limit; i++) {
        const file = fileList[i];
        if (file.type !== 'application/pdf') continue;
        if (file.size === 0) continue;

        const data = await fileToUint8Array(file);
        
        // Check for encryption immediately
        const isEncrypted = await checkForEncryption(data);
        let pageCount = undefined;

        // Try to get page count if not encrypted, or if we can (some encrypted files allow metadata reading)
        if (!isEncrypted) {
           try {
             pageCount = await getPageCount(data);
           } catch (e) { console.warn("Could not read page count", e); }
        }

        newFiles.push({
          id: generateId(),
          name: file.name,
          type: file.type,
          size: file.size,
          data: data,
          isEncrypted: isEncrypted,
          pageCount: pageCount
        });
      }

      if (newFiles.length === 0) {
        throw new Error("No valid PDF files selected.");
      }

      if (isSingleFileMode) {
        setFiles(newFiles); // Replace
      } else {
        setFiles(prev => [...prev, ...newFiles]); // Append for merge
      }
      
      setStatus(AppStatus.IDLE); 
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process files.");
    }
  }, [activeTool]);

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleReorder = (newFiles: UploadedFile[]) => {
    setFiles(newFiles);
  };

  const handlePasswordSubmit = async (id: string, password: string): Promise<boolean> => {
    const fileIndex = files.findIndex(f => f.id === id);
    if (fileIndex === -1) return false;

    const file = files[fileIndex];
    const isValid = await validatePassword(file.data, password);
    
    if (isValid) {
      // If valid, also try to get page count if we don't have it
      let pageCount = file.pageCount;
      if (!pageCount) {
        try {
          pageCount = await getPageCount(file.data, password);
        } catch (e) { console.warn("Could not count pages after unlock", e); }
      }

      const updatedFiles = [...files];
      updatedFiles[fileIndex] = { ...file, password, pageCount };
      setFiles(updatedFiles);
      return true;
    }
    return false;
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError("Please upload at least 2 files.");
      return;
    }

    const lockedFiles = files.filter(f => f.isEncrypted && !f.password);
    if (lockedFiles.length > 0) {
      setError(`Please unlock the following files before merging: ${lockedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    try {
      setStatus(AppStatus.PROCESSING);
      setProgress(0);
      setProgressMessage("Initializing...");
      setError(null);
      
      await new Promise(resolve => setTimeout(resolve, 500));

      const mergedBytes = await mergePdfs(files, (percent, msg) => {
        setProgress(percent);
        setProgressMessage(msg);
      });
      
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResult({
        fileName: 'merged-document.pdf',
        url: url,
        size: blob.size
      });
      
      setStatus(AppStatus.SUCCESS);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Merge failed.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleSplitExtract = async (rangeStr: string) => {
    if (files.length === 0) return;
    const file = files[0];

    try {
      if (!file.pageCount) {
         throw new Error("Page count unknown. Cannot split.");
      }

      setStatus(AppStatus.PROCESSING);
      setProgress(0);
      setProgressMessage("Initializing...");
      setError(null);

      // Use the service to handle split (and potential zipping)
      const { data, fileName } = await splitPdf(file, rangeStr, (p, msg) => {
        setProgress(p);
        setProgressMessage(msg);
      });
      
      const isZip = fileName.endsWith('.zip');
      const blob = new Blob([data], { type: isZip ? 'application/zip' : 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setResult({
        fileName: fileName,
        url: url,
        size: blob.size
      });
      
      setStatus(AppStatus.SUCCESS);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Split failed.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleCompress = async (level: CompressionLevel) => {
    if (files.length === 0) return;
    const file = files[0];

    try {
      setStatus(AppStatus.PROCESSING);
      setProgress(0);
      setProgressMessage("Analyzing PDF...");
      setError(null);

      // Short delay for UI update
      await new Promise(resolve => setTimeout(resolve, 300));

      const { data, fileName } = await compressPdf(file, level, (p, msg) => {
        setProgress(p);
        setProgressMessage(msg);
      });

      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setResult({
        fileName: fileName,
        url: url,
        size: blob.size
      });

      setStatus(AppStatus.SUCCESS);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Compression failed.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setResult(null);
    setStatus(AppStatus.IDLE);
    setError(null);
    setProgress(0);
    setProgressMessage("");
  };

  const triggerAddMore = () => {
    hiddenInputRef.current?.click();
  };

  const handleHiddenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelect(e.target.files);
    }
    if (hiddenInputRef.current) hiddenInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
      <Header 
        darkMode={darkMode} 
        toggleDarkMode={toggleDarkMode} 
        activeTool={activeTool}
        onBackHome={handleBackToHome}
      />
      
      {/* Hidden input for "Add More" functionality */}
      <input 
        type="file" 
        multiple={activeTool === 'merge'}
        accept="application/pdf"
        className="hidden"
        ref={hiddenInputRef}
        onChange={handleHiddenInputChange}
      />

      {activeTool === 'home' ? (
        <Home onSelectTool={handleToolSelect} />
      ) : (
        <>
           {files.length === 0 && !result ? (
            <Hero 
              mode={activeTool}
              onFilesSelect={handleFilesSelect} 
              isProcessing={status === AppStatus.PROCESSING}
              error={error}
            />
          ) : activeTool === 'merge' ? (
            <Dashboard 
              files={files}
              onRemoveFile={handleRemoveFile}
              onReorder={handleReorder}
              onMerge={handleMerge}
              onClear={handleClear}
              onAddMore={triggerAddMore}
              onPasswordSubmit={handlePasswordSubmit}
              isMerging={status === AppStatus.PROCESSING}
              result={result}
              progress={progress}
              progressMessage={progressMessage}
              error={error}
            />
          ) : activeTool === 'split' ? (
            <SplitDashboard 
              file={files[0]}
              onRemoveFile={() => setFiles([])}
              onExtract={handleSplitExtract}
              onClear={handleClear}
              onPasswordSubmit={(pwd) => handlePasswordSubmit(files[0].id, pwd)}
              isProcessing={status === AppStatus.PROCESSING}
              result={result}
              error={error}
            />
          ) : activeTool === 'compress' ? (
            <CompressDashboard 
              file={files[0]}
              onRemoveFile={() => setFiles([])}
              onCompress={handleCompress}
              onClear={handleClear}
              onPasswordSubmit={(pwd) => handlePasswordSubmit(files[0].id, pwd)}
              isProcessing={status === AppStatus.PROCESSING}
              result={result}
              progress={progress}
              progressMessage={progressMessage}
              error={error}
            />
          ) : (
            // View Mode
            <PdfPreviewModal 
              file={files[0]} 
              onClose={handleClear} 
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;