import React, { useEffect, useRef, useState } from 'react';
import { UploadedFile } from '../types';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Maximize, ArrowLeftRight } from 'lucide-react';

interface PdfPreviewModalProps {
  file: UploadedFile | null;
  onClose: () => void;
}

const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ file, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Local state for the page input field
  const [pageInput, setPageInput] = useState("1");
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  // Sync pageInput when currentPage changes (e.g. via Next/Prev buttons)
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    if (!file) return;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        setCurrentPage(1);

        if (!window.pdfjsLib) {
          throw new Error("PDF.js library not loaded");
        }

        // Fix: Clone the data using slice() to prevent the worker from detaching the original ArrayBuffer
        const loadingTask = window.pdfjsLib.getDocument({
          data: file.data.slice(),
          password: file.password || '', // Pass password if available
        });

        const pdf = await loadingTask.promise;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (err: any) {
        console.error("Error loading PDF preview:", err);
        setLoading(false);
        if (err.name === 'PasswordException') {
          setError("Password required to preview this file.");
        } else {
          setError("Failed to load PDF preview.");
        }
      }
    };

    loadPdf();

    // Cleanup
    return () => {
       if (renderTaskRef.current) {
         renderTaskRef.current.cancel();
       }
       if (pdfDocRef.current) {
         pdfDocRef.current.destroy();
       }
    };
  }, [file]);

  useEffect(() => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          await renderTaskRef.current.cancel();
        }

        const page = await pdfDocRef.current.getPage(currentPage);
        
        // Handle High DPI screens for crisp rendering
        const outputScale = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale });
        
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');

        if (!canvas || !context) return;

        // Set dimensions taking pixel ratio into account
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        
        // Set CSS styling to the actual viewport size
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1
          ? [outputScale, 0, 0, outputScale, 0, 0]
          : null;

        const renderContext = {
          canvasContext: context,
          transform: transform,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        // Ignore cancelled errors
        if (err?.name !== 'RenderingCancelledException') {
          console.error("Page render error:", err);
        }
      }
    };

    renderPage();
  }, [currentPage, scale, numPages]);

  const handleFit = async (mode: 'width' | 'page') => {
    if (!pdfDocRef.current || !containerRef.current) return;
    try {
      const page = await pdfDocRef.current.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.0 }); // Get unscaled dimensions
      
      const containerWidth = containerRef.current.clientWidth - 64; // -64 for padding
      const containerHeight = containerRef.current.clientHeight - 64;
      
      let newScale = 1.0;

      if (mode === 'width') {
         newScale = containerWidth / viewport.width;
      } else {
         // Fit Page (contain)
         const scaleW = containerWidth / viewport.width;
         const scaleH = containerHeight / viewport.height;
         newScale = Math.min(scaleW, scaleH);
      }
      
      // Keep strictly roughly between 0.2 and 5.0
      newScale = Math.max(0.2, Math.min(5.0, newScale));
      setScale(newScale);

    } catch (e) {
      console.error("Error fitting page", e);
    }
  };

  const handlePageInputSubmit = () => {
    const page = parseInt(pageInput);
    if (!isNaN(page) && page >= 1 && page <= numPages) {
      setCurrentPage(page);
    } else {
      // Reset to current valid page if invalid
      setPageInput(currentPage.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit();
    }
  };

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex-1 min-w-0 mr-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate" title={file.name}>
              {file.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {loading ? 'Loading...' : `${numPages} pages`}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Controls */}
            <div className="hidden sm:flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
               <button 
                onClick={() => handleFit('width')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400"
                title="Fit to Width"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleFit('page')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 ml-1 pl-2"
                title="Fit to Page"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
              <button 
                onClick={() => setScale(s => Math.max(0.25, s - 0.25))}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs w-12 text-center font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                {Math.round(scale * 100)}%
              </span>
              <button 
                onClick={() => setScale(s => Math.min(5.0, s + 0.25))}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            
            <button 
              onClick={onClose}
              className="p-2 ml-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable Area */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950/50 relative"
        >
          <div className="min-h-full w-full flex items-center justify-center p-8">
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-indigo-600 dark:text-indigo-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm font-medium">Loading Document...</span>
              </div>
            ) : error ? (
              <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-xl shadow-sm max-w-sm">
                  <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
                    <X className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Preview Unavailable</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{error}</p>
              </div>
            ) : (
              <div className="shadow-lg border border-slate-200 dark:border-slate-800 bg-white">
                <canvas ref={canvasRef} className="block" />
              </div>
            )}
          </div>
        </div>

        {/* Footer / Pagination */}
        {!loading && !error && numPages > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-center items-center gap-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400 transition-colors shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <span>Page</span>
              <input 
                type="text" 
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={handlePageInputSubmit}
                onKeyDown={handleKeyDown}
                className="w-12 text-center py-1 px-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
              <span>of {numPages}</span>
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400 transition-colors shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfPreviewModal;