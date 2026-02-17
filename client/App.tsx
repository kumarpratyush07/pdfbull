import React, { useState, useCallback, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import SplitDashboard from './components/SplitDashboard';
import CompressDashboard from './components/CompressDashboard';
import ConversionDashboard from './components/ConversionDashboard';
import PdfToImageDashboard from './components/PdfToImageDashboard';
import ImageToPdfDashboard, { ImageToPdfSettings } from './components/ImageToPdfDashboard';
import PdfPreviewModal from './components/PdfPreviewModal';
import Home from './components/Home';
import { UploadedFile, AppStatus, MergeResult, ToolMode, CompressionLevel } from './types';
import { fileToUint8Array, generateId } from './lib/utils';
import { mergePdfs, checkForEncryption, validatePassword, getPageCount, splitPdf, compressPdf, convertPdf, convertPdfToImages, convertImagesToPdf } from './services/pdfService';
import { Component as EtheralShadow } from './components/ui/etheral-shadow';
import { useTheme } from 'next-themes';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTool = (location.pathname.substring(1) || 'home') as ToolMode;



  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MergeResult | null>(null);

  // Progress state
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === 'dark';

  // Helper to trigger hidden file input from Dashboard if needed
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const handleToolSelect = (tool: ToolMode) => {
    // Reset state when switching tools
    setFiles([]);
    setResult(null);
    setError(null);
    setStatus(AppStatus.IDLE);
    navigate(tool === 'home' ? '/' : `/${tool}`);
  };

  const handleBackToHome = () => {
    handleToolSelect('home');
  };

  const handleFilesSelect = useCallback(async (fileList: FileList) => {
    setError(null);

    try {
      const newFiles: UploadedFile[] = [];
      const isMergeMode = activeTool === 'merge';
      const isImageToPdfMode = activeTool === 'image-to-pdf';
      const allowMultiple = isMergeMode || isImageToPdfMode;

      // If single file mode and we already have a file, check count
      if (!allowMultiple && fileList.length > 1) {
        throw new Error("Please select only one file.");
      }

      const limit = Math.min(fileList.length, allowMultiple ? 999 : 1);

      for (let i = 0; i < limit; i++) {
        const file = fileList[i];

        // Validation logic based on tool
        if (activeTool === 'word-to-pdf') {
          if (!file.name.match(/\.(doc|docx)$/i)) continue;
        } else if (activeTool === 'excel-to-pdf') {
          if (!file.name.match(/\.(xls|xlsx)$/i)) continue;
        } else if (activeTool === 'ppt-to-pdf') {
          if (!file.name.match(/\.(ppt|pptx)$/i)) continue;
        } else if (activeTool === 'image-to-pdf') {
          if (!file.type.startsWith('image/')) continue;
        } else {
          // Default to PDF for other tools
          if (file.type !== 'application/pdf') continue;
        }

        if (file.size === 0) continue;

        const data = await fileToUint8Array(file);

        // Check for encryption immediately only for PDF
        let isEncrypted = false;
        let pageCount = undefined;

        if (file.type === 'application/pdf') {
          isEncrypted = await checkForEncryption(data);
          // Try to get page count if not encrypted
          if (!isEncrypted) {
            try {
              pageCount = await getPageCount(data);
            } catch (e) { console.warn("Could not read page count", e); }
          }
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
        throw new Error("No valid files selected for this tool.");
      }

      if (allowMultiple) {
        setFiles(prev => [...prev, ...newFiles]); // Append
      } else {
        setFiles(newFiles); // Replace
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

      const blob = new Blob([mergedBytes as any], { type: 'application/pdf' });
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
      const blob = new Blob([data as any], { type: isZip ? 'application/zip' : 'application/pdf' });
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

      const blob = new Blob([data as any], { type: 'application/pdf' });
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

  const handleConvert = async () => {
    if (files.length === 0) return;
    const file = files[0];

    // Determine target format
    let targetFormat: 'word' | 'excel' | 'ppt' | 'pdf' = 'pdf';
    if (activeTool === 'pdf-to-word') targetFormat = 'word';
    else if (activeTool === 'pdf-to-excel') targetFormat = 'excel';
    else if (activeTool === 'pdf-to-ppt') targetFormat = 'ppt';
    else if (['word-to-pdf', 'excel-to-pdf', 'ppt-to-pdf'].includes(activeTool)) targetFormat = 'pdf';

    try {
      setStatus(AppStatus.PROCESSING);
      setProgress(0);
      setProgressMessage("Starting conversion...");
      setError(null);

      const { data, fileName } = await convertPdf(file, targetFormat, (p, msg) => {
        setProgress(p);
        setProgressMessage(msg);
      });

      // Mime type guess
      let mimeType = 'application/octet-stream';
      if (fileName.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (fileName.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (fileName.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      else if (fileName.endsWith('.pptx')) mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

      const blob = new Blob([data as any], { type: mimeType });
      const url = URL.createObjectURL(blob);

      setResult({
        fileName: fileName,
        url: url,
        size: blob.size
      });

      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Conversion failed.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handlePdfToImage = async (format: 'jpg' | 'png') => {
    if (files.length === 0) return;
    const file = files[0];

    try {
      setStatus(AppStatus.PROCESSING);
      setProgress(0);
      setProgressMessage("Converting pages...");
      setError(null);

      const { data, fileName } = await convertPdfToImages(file, format, (p, msg) => {
        setProgress(p);
        setProgressMessage(msg);
      });

      const isZip = fileName.endsWith('.zip');
      const mimeType = isZip ? 'application/zip' : (format === 'png' ? 'image/png' : 'image/jpeg');

      const blob = new Blob([data as any], { type: mimeType });
      const url = URL.createObjectURL(blob);

      setResult({
        fileName: fileName,
        url: url,
        size: blob.size
      });

      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "PDF to Image conversion failed.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleImageToPdf = async (settings: ImageToPdfSettings) => {
    if (files.length === 0) return;

    try {
      setStatus(AppStatus.PROCESSING);
      setProgress(0);
      setProgressMessage("Initializing...");
      setError(null);

      const { data, fileName } = await convertImagesToPdf(files, settings, (p, msg) => {
        setProgress(p);
        setProgressMessage(msg);
      });

      const blob = new Blob([data as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setResult({
        fileName: fileName,
        url: url,
        size: blob.size
      });

      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Image to PDF conversion failed.");
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

  // Wrapper for Hero to handle file selection
  const HeroWrapper = ({ tool }: { tool: ToolMode }) => (
    <Hero
      mode={tool}
      onFilesSelect={handleFilesSelect}
      isProcessing={status === AppStatus.PROCESSING}
      error={error}
    />
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300 relative">
      {/* Global Etheral Shadow Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <EtheralShadow
          color={darkMode ? "rgba(128, 128, 128, 1)" : "#6366f1"}
          animation={{ scale: 100, speed: 90 }}
          noise={{ opacity: darkMode ? 0.5 : 0.2, scale: 1 }}
          sizing="fill"
          className="w-full h-full opacity-60 dark:opacity-100 transition-opacity duration-500"
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar
          activeTool={activeTool}
          onBackHome={handleBackToHome}
        />

        {/* Hidden input for "Add More" functionality */}
        <input
          type="file"
          multiple={activeTool === 'merge' || activeTool === 'image-to-pdf'}
          className="hidden"
          ref={hiddenInputRef}
          onChange={handleHiddenInputChange}
        />

        <Routes>
          <Route path="/" element={<Home onSelectTool={handleToolSelect} />} />

          <Route path="/merge" element={
            files.length === 0 && !result ? <HeroWrapper tool="merge" /> : (
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
            )
          } />

          <Route path="/image-to-pdf" element={
            files.length === 0 && !result ? <HeroWrapper tool="image-to-pdf" /> : (
              <ImageToPdfDashboard
                files={files}
                onRemoveFile={handleRemoveFile}
                onReorder={handleReorder}
                onConvert={handleImageToPdf}
                onClear={handleClear}
                onAddMore={triggerAddMore}
                isProcessing={status === AppStatus.PROCESSING}
                result={result}
                progress={progress}
                progressMessage={progressMessage}
                error={error}
              />
            )
          } />

          <Route path="/split" element={
            files.length === 0 && !result ? <HeroWrapper tool="split" /> : (
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
            )
          } />

          <Route path="/compress" element={
            files.length === 0 && !result ? <HeroWrapper tool="compress" /> : (
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
            )
          } />

          <Route path="/pdf-to-image" element={
            files.length === 0 && !result ? <HeroWrapper tool="pdf-to-image" /> : (
              <PdfToImageDashboard
                file={files[0]}
                onRemoveFile={() => setFiles([])}
                onConvert={handlePdfToImage}
                onClear={handleClear}
                onPasswordSubmit={(pwd) => handlePasswordSubmit(files[0].id, pwd)}
                isProcessing={status === AppStatus.PROCESSING}
                result={result}
                progress={progress}
                progressMessage={progressMessage}
                error={error}
              />
            )
          } />

          <Route path="/view" element={
            files.length === 0 && !result ? <HeroWrapper tool="view" /> : (
              <PdfPreviewModal
                file={files[0]}
                onClose={handleClear}
              />
            )
          } />

          {/* Conversion Routes */}
          {['pdf-to-word', 'pdf-to-excel', 'pdf-to-ppt', 'word-to-pdf', 'excel-to-pdf', 'ppt-to-pdf'].map(tool => (
            <Route key={tool} path={`/${tool}`} element={
              files.length === 0 && !result ? <HeroWrapper tool={tool as ToolMode} /> : (
                <ConversionDashboard
                  file={files[0]}
                  targetFormat={
                    tool === 'pdf-to-word' ? 'word' :
                      tool === 'pdf-to-excel' ? 'excel' :
                        tool === 'pdf-to-ppt' ? 'ppt' : 'pdf'
                  }
                  onRemoveFile={() => setFiles([])}
                  onConvert={handleConvert}
                  onClear={handleClear}
                  isProcessing={status === AppStatus.PROCESSING}
                  result={result}
                  progress={progress}
                  progressMessage={progressMessage}
                  error={error}
                />
              )
            } />
          ))}

          {/* Catch all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;