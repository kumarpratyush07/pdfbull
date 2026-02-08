import { UploadedFile, CompressionLevel, CompressionSettings } from '../types';
import { parseSplitRanges } from '../lib/utils';

// Declare global libraries attached to window
declare global {
  interface Window {
    PDFLib: {
      PDFDocument: any;
      PDFPage: any;
    };
    pdfjsLib: any;
    JSZip: any;
  }
}

/**
 * Checks if a PDF is encrypted (password protected).
 */
export const checkForEncryption = async (data: Uint8Array): Promise<boolean> => {
  if (!window.PDFLib) throw new Error("PDF Library not loaded");
  try {
    // Attempt to load without password. If it throws "Encrypted", it is password protected.
    await window.PDFLib.PDFDocument.load(data);
    return false;
  } catch (e: any) {
    const msg = e.message?.toLowerCase() || "";
    if (msg.includes('encrypted') || msg.includes('password')) {
      return true;
    }
    // If it's another error (corruption), we assume false for encryption check 
    // and let the main loader handle the corruption error later.
    return false;
  }
};

/**
 * Validates if a password can open the PDF.
 */
export const validatePassword = async (data: Uint8Array, password: string): Promise<boolean> => {
  if (!window.PDFLib) throw new Error("PDF Library not loaded");
  try {
    await window.PDFLib.PDFDocument.load(data, { password });
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Gets the total page count of a PDF.
 */
export const getPageCount = async (data: Uint8Array, password?: string): Promise<number> => {
  if (!window.PDFLib) throw new Error("PDF Library not loaded");
  const { PDFDocument } = window.PDFLib;
  const doc = await PDFDocument.load(data, { password, ignoreEncryption: true });
  return doc.getPageCount();
};

/**
 * Helper function to fallback and "sanitize" a PDF using PDF.js
 * This renders pages to images and creates a new valid PDF-lib document.
 * Used when the file is structurally "corrupt" but visually viewable.
 */
const sanitizePdfWithPdfJs = async (
  fileData: Uint8Array, 
  fileName: string,
  onProgress?: (percent: number) => void,
  password?: string
): Promise<any> => {
  console.log(`Starting fallback sanitation for: ${fileName}`);
  
  if (!window.pdfjsLib || !window.PDFLib) {
    throw new Error("Required libraries (PDF.js or PDF-lib) not loaded.");
  }

  const { PDFDocument } = window.PDFLib;
  const pdfjs = window.pdfjsLib;

  // Load the document using PDF.js (which is very robust)
  // Pass password if provided
  const loadingTask = pdfjs.getDocument({ data: fileData, password: password });
  
  let pdfjsDoc;
  try {
    pdfjsDoc = await loadingTask.promise;
  } catch (e: any) {
    if (e.name === 'PasswordException' || e.message.includes('Password')) {
      throw new Error("Password required or incorrect during sanitization.");
    }
    throw e;
  }

  const numPages = pdfjsDoc.numPages;
  
  // Create a clean new PDF-lib document
  const newPdf = await PDFDocument.create();

  // Iterate through all pages
  for (let i = 1; i <= numPages; i++) {
    if (onProgress) {
      onProgress(Math.round((i / numPages) * 100));
    }

    const page = await pdfjsDoc.getPage(i);
    
    // Set scale to 2.0 for decent print quality (144 DPI roughly)
    const scale = 2.0;
    const viewport = page.getViewport({ scale });

    // Render to an off-screen canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) throw new Error("Could not create canvas context");

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // Convert canvas to JPEG (smaller than PNG for full pages)
    const imgDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    
    // Fetch the data URL to get bytes
    const res = await fetch(imgDataUrl);
    const imgBytes = await res.arrayBuffer();

    // Embed the image into the new PDF
    const embeddedImage = await newPdf.embedJpg(imgBytes);

    // Add a page of the same size
    const newPage = newPdf.addPage([viewport.width, viewport.height]);
    
    // Draw the image onto the page
    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    });
  }

  console.log(`Successfully sanitized ${fileName} via fallback.`);
  return newPdf;
};

/**
 * Backend logic for merging PDFs.
 * Uses pdf-lib with a fallback to pdf.js rasterization for problematic files.
 */
export const mergePdfs = async (
  files: UploadedFile[],
  onProgress?: (percent: number, message: string) => void
): Promise<Uint8Array> => {
  if (files.length === 0) {
    throw new Error("No files provided for merging.");
  }

  // Ensure library is loaded
  if (!window.PDFLib) {
    throw new Error("PDF Library not loaded. Please refresh the page.");
  }

  const { PDFDocument } = window.PDFLib;

  // Phase 1: Load and Normalize all documents
  const loadedDocs: { file: UploadedFile; doc: any }[] = [];
  const errors: string[] = [];
  const invalidFiles: string[] = [];
  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    // Calculate progress range for this file (0-80% of total process allocated to loading)
    const startProgress = (i / totalFiles) * 80;
    const endProgress = ((i + 1) / totalFiles) * 80;
    
    if (onProgress) onProgress(Math.round(startProgress), `Processing ${file.name}...`);

    let pdfDoc;
    
    // Attempt 1: Standard Load (Preserves text, vectors, small size)
    try {
      // Pass the password if the user provided one
      pdfDoc = await PDFDocument.load(file.data, { 
        ignoreEncryption: true, 
        password: file.password 
      });
      
      // Basic integrity check
      if (pdfDoc.getPageCount() === 0) {
        throw new Error("File contains 0 pages");
      }
    } catch (stdError: any) {
      // Attempt 2: Fallback (Rasterization via PDF.js)
      console.warn(`Standard parsing failed for "${file.name}". Attempting fallback...`, stdError);
      
      try {
        if (onProgress) onProgress(Math.round(startProgress), `Sanitizing ${file.name} (repairing structure)...`);
        
        pdfDoc = await sanitizePdfWithPdfJs(
          file.data, 
          file.name, 
          (p) => {
            // Map local sanitation progress (0-100) to global progress range for this file
            const currentGlobal = startProgress + ((endProgress - startProgress) * (p / 100));
            if (onProgress) onProgress(Math.round(currentGlobal), `Sanitizing ${file.name} (${p}%)...`);
          },
          file.password // Pass password to fallback
        );
      } catch (fallbackError: any) {
        console.error(`Fallback failed for "${file.name}":`, fallbackError);
        
        invalidFiles.push(file.name);
        if (stdError.message && stdError.message.includes("Password")) {
          errors.push(`${file.name}: Password protected (Please unlock first)`);
        } else {
          errors.push(`${file.name}: File is corrupted or incompatible.`);
        }
        continue;
      }
    }

    if (pdfDoc) {
      loadedDocs.push({ file, doc: pdfDoc });
    }
  }

  // If any files failed BOTH standard and fallback methods, abort.
  if (invalidFiles.length > 0) {
    throw new Error(`Unable to process files:\n${errors.join('\n')}`);
  }

  // Phase 2: Merge Normalized Documents
  if (onProgress) onProgress(85, "Merging pages...");
  
  try {
    const mergedPdf = await PDFDocument.create();

    for (const { file, doc } of loadedDocs) {
      try {
        const indices = doc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(doc, indices);
        
        copiedPages.forEach((page: any) => {
          mergedPdf.addPage(page);
        });
      } catch (mergeError: any) {
         console.error(`Error merging file "${file.name}":`, mergeError);
         throw new Error(`Failed to merge "${file.name}" even after loading. Internal structure mismatch.`);
      }
    }

    // Phase 3: Save
    if (onProgress) onProgress(95, "Finalizing document...");
    const pdfBytes = await mergedPdf.save();
    
    if (onProgress) onProgress(100, "Done!");
    return pdfBytes;
    
  } catch (error: any) {
    console.error("Merge process failed:", error);
    throw new Error(error.message || "An unexpected error occurred while merging PDFs.");
  }
};

/**
 * Extracts specific pages from a PDF to create a new one.
 * @param file The uploaded source file
 * @param pageNumbers Array of 1-based page numbers to extract
 */
export const extractPages = async (
  file: UploadedFile,
  pageNumbers: number[]
): Promise<Uint8Array> => {
  if (!window.PDFLib) throw new Error("PDF Library not loaded");
  const { PDFDocument } = window.PDFLib;

  // Load the document
  const srcDoc = await PDFDocument.load(file.data, { 
    ignoreEncryption: true,
    password: file.password 
  });

  const totalPages = srcDoc.getPageCount();
  const validPages = pageNumbers.filter(p => p >= 1 && p <= totalPages);

  if (validPages.length === 0) {
    throw new Error("No valid pages selected for extraction.");
  }

  // Create new document
  const newDoc = await PDFDocument.create();

  // Convert to 0-based indices
  const indices = validPages.map(p => p - 1);
  
  // Copy pages
  const copiedPages = await newDoc.copyPages(srcDoc, indices);
  
  // Add to new doc
  copiedPages.forEach((page: any) => newDoc.addPage(page));

  return await newDoc.save();
};

/**
 * Handles split operation. 
 * If single range -> returns PDF
 * If multiple ranges -> returns ZIP containing PDFs
 */
export const splitPdf = async (
  file: UploadedFile, 
  rangeStr: string,
  onProgress?: (percent: number, message: string) => void
): Promise<{ data: Uint8Array | Blob, fileName: string }> => {
  if (!file.pageCount) throw new Error("Page count not available");
  
  const ranges = parseSplitRanges(rangeStr, file.pageCount);
  if (ranges.length === 0) throw new Error("No valid page ranges found");

  if (ranges.length === 1) {
    // Single file output
    if (onProgress) onProgress(50, "Extracting pages...");
    const pdfBytes = await extractPages(file, ranges[0]);
    if (onProgress) onProgress(100, "Done!");
    
    // Create label e.g. _pages_1-5
    const r = ranges[0];
    const label = r.length > 1 ? `pages_${r[0]}-${r[r.length-1]}` : `page_${r[0]}`;
    
    return {
      data: pdfBytes,
      fileName: `${file.name.replace('.pdf', '')}_${label}.pdf`
    };
  } else {
    // Multiple files -> ZIP
    if (!window.JSZip) throw new Error("JSZip library not loaded");
    const zip = new window.JSZip();

    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      const percent = Math.round(((i) / ranges.length) * 90);
      if (onProgress) onProgress(percent, `Processing part ${i + 1}/${ranges.length}...`);
      
      const pdfBytes = await extractPages(file, r);
      
      const label = r.length > 1 ? `pages_${r[0]}-${r[r.length-1]}` : `page_${r[0]}`;
      zip.file(`${file.name.replace('.pdf', '')}_${label}.pdf`, pdfBytes);
    }
    
    if (onProgress) onProgress(95, "Compressing files...");
    const zipContent = await zip.generateAsync({ type: "blob" });
    if (onProgress) onProgress(100, "Done!");

    return {
      data: zipContent,
      fileName: `${file.name.replace('.pdf', '')}_split_files.zip`
    };
  }
};

/**
 * Compresses a PDF by rendering pages to JPEG images at reduced quality/resolution
 * and creating a new PDF from those images.
 */
export const compressPdf = async (
  file: UploadedFile,
  level: CompressionLevel,
  onProgress?: (percent: number, message: string) => void
): Promise<{ data: Uint8Array, fileName: string }> => {
  if (!window.pdfjsLib || !window.PDFLib) {
    throw new Error("Required libraries (PDF.js or PDF-lib) not loaded.");
  }

  // Configure settings based on compression level
  let settings: CompressionSettings;
  switch (level) {
    case 'extreme':
      // Low resolution (72 DPI approx), Low Quality
      settings = { scale: 1.0, quality: 0.5 };
      break;
    case 'high_quality':
      // High resolution (200 DPI approx), High Quality
      settings = { scale: 2.5, quality: 0.85 };
      break;
    case 'recommended':
    default:
      // Medium resolution (144 DPI approx), Medium Quality
      settings = { scale: 1.5, quality: 0.7 };
      break;
  }

  const { PDFDocument } = window.PDFLib;
  const pdfjs = window.pdfjsLib;

  // Load document with pdf.js
  const loadingTask = pdfjs.getDocument({ 
    data: file.data, 
    password: file.password 
  });
  
  const pdfjsDoc = await loadingTask.promise;
  const numPages = pdfjsDoc.numPages;
  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    const percent = Math.round((i / numPages) * 90);
    if (onProgress) onProgress(percent, `Compressing page ${i} of ${numPages}...`);

    const page = await pdfjsDoc.getPage(i);
    const viewport = page.getViewport({ scale: settings.scale });

    // Create Canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) throw new Error("Canvas context creation failed");

    // Render Page
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // Convert to JPEG with quality setting
    const imgDataUrl = canvas.toDataURL('image/jpeg', settings.quality);
    const res = await fetch(imgDataUrl);
    const imgBytes = await res.arrayBuffer();

    // Embed in PDF-lib doc
    const embeddedImage = await newPdf.embedJpg(imgBytes);

    // Use original dimensions (unscaled) for the page size so it prints correctly
    // We need the viewport at scale 1.0 to get physical dimensions
    const originalViewport = page.getViewport({ scale: 1.0 });
    
    const newPage = newPdf.addPage([originalViewport.width, originalViewport.height]);
    
    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: originalViewport.width,
      height: originalViewport.height,
    });
  }

  if (onProgress) onProgress(95, "Finalizing compressed file...");
  const pdfBytes = await newPdf.save();
  
  if (onProgress) onProgress(100, "Done!");

  return {
    data: pdfBytes,
    fileName: file.name.replace('.pdf', '_compressed.pdf')
  };
};