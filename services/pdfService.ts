import { UploadedFile, CompressionLevel, CompressionSettings } from '../types';
import { parseSplitRanges } from '../lib/utils';

// Declare global libraries attached to window
declare global {
  interface Window {
    PDFLib: {
      PDFDocument: any;
      PDFPage: any;
      StandardFonts: any;
      rgb: any;
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
 */
const sanitizePdfWithPdfJs = async (
  fileData: Uint8Array, 
  fileName: string,
  onProgress?: (percent: number) => void,
  password?: string
): Promise<any> => {
  if (!window.pdfjsLib || !window.PDFLib) {
    throw new Error("Required libraries (PDF.js or PDF-lib) not loaded.");
  }

  const { PDFDocument } = window.PDFLib;
  const pdfjs = window.pdfjsLib;

  const loadingTask = pdfjs.getDocument({ data: fileData, password: password });
  let pdfjsDoc = await loadingTask.promise;
  const numPages = pdfjsDoc.numPages;
  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(Math.round((i / numPages) * 100));
    const page = await pdfjsDoc.getPage(i);
    const scale = 2.0;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) throw new Error("Could not create canvas context");

    await page.render({ canvasContext: context, viewport: viewport }).promise;
    const imgDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const res = await fetch(imgDataUrl);
    const imgBytes = await res.arrayBuffer();
    const embeddedImage = await newPdf.embedJpg(imgBytes);
    const newPage = newPdf.addPage([viewport.width, viewport.height]);
    newPage.drawImage(embeddedImage, {
      x: 0, y: 0, width: viewport.width, height: viewport.height,
    });
  }
  return newPdf;
};

/**
 * Backend logic for merging PDFs.
 */
export const mergePdfs = async (
  files: UploadedFile[],
  onProgress?: (percent: number, message: string) => void
): Promise<Uint8Array> => {
  if (files.length === 0) throw new Error("No files provided for merging.");
  if (!window.PDFLib) throw new Error("PDF Library not loaded.");

  const { PDFDocument } = window.PDFLib;
  const loadedDocs: { file: UploadedFile; doc: any }[] = [];
  const errors: string[] = [];
  const invalidFiles: string[] = [];
  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    const startProgress = (i / totalFiles) * 80;
    const endProgress = ((i + 1) / totalFiles) * 80;
    
    if (onProgress) onProgress(Math.round(startProgress), `Processing ${file.name}...`);

    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(file.data, { 
        ignoreEncryption: true, 
        password: file.password 
      });
      if (pdfDoc.getPageCount() === 0) throw new Error("File contains 0 pages");
    } catch (stdError: any) {
      try {
        if (onProgress) onProgress(Math.round(startProgress), `Sanitizing ${file.name}...`);
        pdfDoc = await sanitizePdfWithPdfJs(
          file.data, file.name, 
          (p) => {
            const currentGlobal = startProgress + ((endProgress - startProgress) * (p / 100));
            if (onProgress) onProgress(Math.round(currentGlobal), `Sanitizing ${file.name} (${p}%)...`);
          },
          file.password
        );
      } catch (fallbackError: any) {
        invalidFiles.push(file.name);
        errors.push(`${file.name}: Corrupted or encrypted.`);
        continue;
      }
    }

    if (pdfDoc) loadedDocs.push({ file, doc: pdfDoc });
  }

  if (invalidFiles.length > 0) throw new Error(`Unable to process files:\n${errors.join('\n')}`);

  if (onProgress) onProgress(85, "Merging pages...");
  const mergedPdf = await PDFDocument.create();

  for (const { file, doc } of loadedDocs) {
    const indices = doc.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(doc, indices);
    copiedPages.forEach((page: any) => mergedPdf.addPage(page));
  }

  if (onProgress) onProgress(95, "Finalizing document...");
  const pdfBytes = await mergedPdf.save();
  if (onProgress) onProgress(100, "Done!");
  return pdfBytes;
};

/**
 * Extracts specific pages from a PDF.
 */
export const extractPages = async (file: UploadedFile, pageNumbers: number[]): Promise<Uint8Array> => {
  if (!window.PDFLib) throw new Error("PDF Library not loaded");
  const { PDFDocument } = window.PDFLib;
  const srcDoc = await PDFDocument.load(file.data, { ignoreEncryption: true, password: file.password });
  const totalPages = srcDoc.getPageCount();
  const validPages = pageNumbers.filter(p => p >= 1 && p <= totalPages);
  if (validPages.length === 0) throw new Error("No valid pages selected.");

  const newDoc = await PDFDocument.create();
  const indices = validPages.map(p => p - 1);
  const copiedPages = await newDoc.copyPages(srcDoc, indices);
  copiedPages.forEach((page: any) => newDoc.addPage(page));
  return await newDoc.save();
};

/**
 * Handles split operation. 
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
    if (onProgress) onProgress(50, "Extracting pages...");
    const pdfBytes = await extractPages(file, ranges[0]);
    if (onProgress) onProgress(100, "Done!");
    const r = ranges[0];
    const label = r.length > 1 ? `pages_${r[0]}-${r[r.length-1]}` : `page_${r[0]}`;
    return { data: pdfBytes, fileName: `${file.name.replace('.pdf', '')}_${label}.pdf` };
  } else {
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
    return { data: zipContent, fileName: `${file.name.replace('.pdf', '')}_split_files.zip` };
  }
};

/**
 * Compresses a PDF by rendering pages to JPEG images.
 */
export const compressPdf = async (
  file: UploadedFile,
  level: CompressionLevel,
  onProgress?: (percent: number, message: string) => void
): Promise<{ data: Uint8Array, fileName: string }> => {
  if (!window.pdfjsLib || !window.PDFLib) throw new Error("Required libraries not loaded.");

  let settings: CompressionSettings;
  switch (level) {
    case 'extreme': settings = { scale: 1.0, quality: 0.5 }; break;
    case 'high_quality': settings = { scale: 2.5, quality: 0.85 }; break;
    case 'recommended': default: settings = { scale: 1.5, quality: 0.7 }; break;
  }

  const { PDFDocument } = window.PDFLib;
  const pdfjs = window.pdfjsLib;
  const loadingTask = pdfjs.getDocument({ data: file.data, password: file.password });
  const pdfjsDoc = await loadingTask.promise;
  const numPages = pdfjsDoc.numPages;
  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    const percent = Math.round((i / numPages) * 90);
    if (onProgress) onProgress(percent, `Compressing page ${i} of ${numPages}...`);
    const page = await pdfjsDoc.getPage(i);
    const viewport = page.getViewport({ scale: settings.scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    if (!context) throw new Error("Canvas context creation failed");
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    const imgDataUrl = canvas.toDataURL('image/jpeg', settings.quality);
    const res = await fetch(imgDataUrl);
    const imgBytes = await res.arrayBuffer();
    const embeddedImage = await newPdf.embedJpg(imgBytes);
    const originalViewport = page.getViewport({ scale: 1.0 });
    const newPage = newPdf.addPage([originalViewport.width, originalViewport.height]);
    newPage.drawImage(embeddedImage, {
      x: 0, y: 0, width: originalViewport.width, height: originalViewport.height,
    });
  }

  if (onProgress) onProgress(95, "Finalizing compressed file...");
  const pdfBytes = await newPdf.save();
  if (onProgress) onProgress(100, "Done!");
  return { data: pdfBytes, fileName: file.name.replace('.pdf', '_compressed.pdf') };
};

/**
 * Generates a valid minimal .docx file containing the provided text paragraphs.
 */
const createDocxFromText = async (paragraphs: string[]): Promise<Blob> => {
  if (!window.JSZip) throw new Error("JSZip not loaded");
  const zip = new window.JSZip();

  // 1. [Content_Types].xml
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  zip.file("[Content_Types].xml", contentTypes);

  // 2. _rels/.rels
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  zip.folder("_rels")?.file(".rels", rels);

  // 3. word/_rels/document.xml.rels
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
  zip.folder("word")?.folder("_rels")?.file("document.xml.rels", docRels);

  // 4. word/document.xml (Content)
  let bodyContent = '';
  paragraphs.forEach(para => {
    // Escape XML characters
    const safeText = para
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
      
    bodyContent += `<w:p><w:r><w:t>${safeText}</w:t></w:r></w:p>`;
  });

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyContent}</w:body>
</w:document>`;
  zip.folder("word")?.file("document.xml", documentXml);

  return await zip.generateAsync({ type: "blob" });
};

/**
 * Extracts text content from a PDF file.
 */
const extractTextFromPdf = async (
  fileData: Uint8Array, 
  password?: string,
  onProgress?: (percent: number) => void
): Promise<string[]> => {
  if (!window.pdfjsLib) throw new Error("PDF.js not loaded");
  
  const loadingTask = window.pdfjsLib.getDocument({ data: fileData, password: password });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const paragraphs: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(Math.round((i / numPages) * 100));
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Simple text extraction strategy: join items with space
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
      
    if (pageText.trim().length > 0) {
      paragraphs.push(pageText);
      paragraphs.push(""); // Empty line between pages
    }
  }
  
  return paragraphs;
};

/**
 * Creates a simple PDF from text (used for Word->PDF simulation to valid file)
 */
const createPdfFromText = async (text: string): Promise<Uint8Array> => {
  if (!window.PDFLib) throw new Error("PDFLib not loaded");
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;

  page.drawText(text, {
    x: 50,
    y: height - 4 * fontSize,
    size: fontSize,
    font: font,
    color: rgb(0, 0, 0),
    maxWidth: width - 100
  });
  
  return await pdfDoc.save();
};

/**
 * Handles format conversion (PDF <-> Office).
 */
export const convertPdf = async (
  file: UploadedFile,
  targetFormat: 'word' | 'excel' | 'ppt' | 'pdf',
  onProgress?: (percent: number, message: string) => void
): Promise<{ data: Uint8Array | Blob, fileName: string }> => {
  
  // PDF TO WORD (REAL IMPLEMENTATION)
  if (targetFormat === 'word' && file.type === 'application/pdf') {
    if (onProgress) onProgress(10, "Extracting text from PDF...");
    const paragraphs = await extractTextFromPdf(file.data, file.password, (p) => {
      if (onProgress) onProgress(10 + Math.round(p * 0.4), `Extracting text... ${p}%`);
    });

    if (onProgress) onProgress(60, "Generating Word document...");
    const docxBlob = await createDocxFromText(paragraphs);
    
    if (onProgress) onProgress(100, "Done!");
    return {
      data: docxBlob,
      fileName: `${file.name.replace('.pdf', '')}.docx`
    };
  }

  // WORD/EXCEL/PPT TO PDF (SIMULATION - Return valid PDF with placeholder)
  if (targetFormat === 'pdf') {
    if (onProgress) onProgress(50, "Converting to PDF...");
    await new Promise(resolve => setTimeout(resolve, 800)); // Sim delay
    
    const message = `Demo Mode: Content conversion from ${file.name} to PDF is a complex server-side task.\n\nThis file is a placeholder to demonstrate the file generation pipeline works.`;
    const pdfBytes = await createPdfFromText(message);
    
    if (onProgress) onProgress(100, "Done!");
    return {
      data: pdfBytes,
      fileName: `${file.name.split('.')[0]}.pdf`
    };
  }

  // OTHER FORMATS (Simulation)
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    await new Promise(resolve => setTimeout(resolve, 200));
    if (onProgress) onProgress(i * 10, `Converting... ${i * 10}%`);
  }

  let extension = '';
  // We only reach here if not 'word' (from PDF) and not 'pdf' (to PDF)
  // Meaning we are handling PDF -> Excel or PDF -> PPT simulations
  if (targetFormat === 'excel') extension = 'xlsx';
  else if (targetFormat === 'ppt') extension = 'pptx';
  
  return {
    data: file.data, // Return original data for unsupported demos
    fileName: `${file.name.split('.')[0]}_converted.${extension}`
  };
};

/**
 * Converts PDF pages to images (JPG or PNG).
 */
export const convertPdfToImages = async (
  file: UploadedFile,
  format: 'png' | 'jpg',
  onProgress?: (percent: number, message: string) => void
): Promise<{ data: Blob, fileName: string }> => {
  if (!window.pdfjsLib || !window.JSZip) {
    throw new Error("Required libraries (PDF.js or JSZip) not loaded.");
  }

  const pdfjs = window.pdfjsLib;
  const loadingTask = pdfjs.getDocument({ 
    data: file.data, 
    password: file.password 
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const zip = new window.JSZip();

  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const ext = format === 'png' ? 'png' : 'jpg';

  const blobs: { blob: Blob, name: string }[] = [];

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(Math.round((i / numPages) * 90), `Processing page ${i} of ${numPages}...`);
    
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); 
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (!context) throw new Error("Canvas context failed");
    
    if (format === 'jpg') {
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);
    }

    await page.render({ canvasContext: context, viewport }).promise;

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType, 0.9));
    
    if (blob) {
       const pageNum = i.toString().padStart(Math.max(2, numPages.toString().length), '0');
       const fileName = `page_${pageNum}.${ext}`;
       blobs.push({ blob, name: fileName });
       zip.file(fileName, blob);
    }
  }

  if (numPages === 1 && blobs.length > 0) {
      if (onProgress) onProgress(100, "Done!");
      return {
          data: blobs[0].blob,
          fileName: `${file.name.replace('.pdf', '')}.${ext}`
      };
  }

  if (onProgress) onProgress(95, "Creating ZIP archive...");
  const content = await zip.generateAsync({ type: "blob" });
  if (onProgress) onProgress(100, "Done!");

  return {
    data: content,
    fileName: `${file.name.replace('.pdf', '')}_images.zip`
  };
};