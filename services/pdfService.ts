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
      PageSizes: any;
    };
    pdfjsLib: any;
    JSZip: any;
  }
}

interface DocContentItem {
  type: 'text' | 'image';
  y: number; // Vertical position
  x: number; // Horizontal position
  text?: string;
  imageData?: ArrayBuffer; // For images
  width?: number; // In points for image, or text width
  height?: number; // In points
  extension?: string;
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  relId?: string; // For images in docx generation
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

  // Clone data to avoid detached buffer errors
  const loadingTask = pdfjs.getDocument({ data: fileData.slice(), password: password });
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
  
  // Clone data to avoid detached buffer errors
  const loadingTask = pdfjs.getDocument({ data: file.data.slice(), password: file.password });
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
 * Cleans string for XML validity.
 */
const cleanXmlString = (str: string) => {
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
};

/**
 * Extracts content (text and images) from a PDF file.
 */
const extractContentFromPdf = async (
  fileData: Uint8Array, 
  password?: string,
  onProgress?: (percent: number) => void
): Promise<DocContentItem[]> => {
  if (!window.pdfjsLib) throw new Error("PDF.js not loaded");
  
  // Clone data to avoid detached buffer errors
  const loadingTask = window.pdfjsLib.getDocument({ data: fileData.slice(), password: password });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const OPS = window.pdfjsLib.OPS;
  
  let allItems: DocContentItem[] = [];

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(Math.round((i / numPages) * 100));
    const page = await pdf.getPage(i);
    
    // 1. Text Extraction
    const textContent = await page.getTextContent();
    const styles = textContent.styles;

    const pageTextItems: DocContentItem[] = textContent.items.map((item: any) => {
      const tx = item.transform;
      // Estimate font size from Y scale
      const fontSize = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]); 
      
      let isBold = false;
      let isItalic = false;
      
      if (item.fontName && styles[item.fontName]) {
        const fontData = styles[item.fontName];
        const name = (fontData.fontFamily || fontData.name || "").toLowerCase();
        if (name.includes('bold') || name.includes('black') || name.includes('heavy')) isBold = true;
        if (name.includes('italic') || name.includes('oblique')) isItalic = true;
      }

      return {
        type: 'text',
        str: item.str, 
        text: item.str,
        x: tx[4],
        y: tx[5],
        width: item.width,
        h: item.height || 0,
        fontSize: fontSize,
        isBold,
        isItalic
      };
    }).filter((t: any) => t.text.trim().length > 0);

    // 2. Image Extraction
    let pageImageItems: DocContentItem[] = [];
    
    try {
        const ops = await page.getOperatorList();
        
        let transformStack: number[][] = [];
        let currentMatrix = [1, 0, 0, 1, 0, 0]; // Identity

        for (let j = 0; j < ops.fnArray.length; j++) {
          const fn = ops.fnArray[j];
          const args = ops.argsArray[j];
          
          if (fn === OPS.save) {
            transformStack.push([...currentMatrix]);
          } else if (fn === OPS.restore) {
            if (transformStack.length > 0) currentMatrix = transformStack.pop()!;
          } else if (fn === OPS.transform) {
            const m = args;
            const [a1, b1, c1, d1, e1, f1] = currentMatrix;
            const [a2, b2, c2, d2, e2, f2] = m;
            
            currentMatrix = [
              a1 * a2 + c1 * b2,
              b1 * a2 + d1 * b2,
              a1 * c2 + c1 * d2,
              b1 * c2 + d1 * d2,
              a1 * e2 + c1 * f2 + e1,
              b1 * e2 + d1 * f2 + f1
            ];
          } else if (fn === OPS.paintImageXObject || fn === OPS.paintJpegXObject || fn === OPS.paintInlineImageXObject) {
            
            let imgObj: any = null;
            
            // Inline image (args[0] is the dict/image)
            if (fn === OPS.paintInlineImageXObject) {
                imgObj = args[0];
            } else {
                // XObject (args[0] is name)
                const imgName = args[0];
                try {
                    imgObj = await page.objs.get(imgName);
                } catch(e) { console.warn("Could not get image obj", imgName); }
            }

            if (imgObj) {
                // Determine width/height
                const w = imgObj.width;
                const h = imgObj.height;
                
                if (w && h) {
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    
                    if (ctx) {
                        // Draw logic based on type
                        // Note: If imgObj is an inline dict, PDF.js might not support drawing it directly to canvas via drawImage
                        // But usually page.objs.get returns a drawable element (Image/Canvas).
                        // For inline images, PDF.js usually converts them to something usable or we might need `page.commonObjs`.
                        
                        try {
                            ctx.drawImage(imgObj as any, 0, 0);
                            const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
                            if (blob) {
                                const buf = await blob.arrayBuffer();
                                
                                // Calculate PDF dimensions from matrix
                                // Scale factors
                                const scaleW = Math.sqrt(currentMatrix[0] * currentMatrix[0] + currentMatrix[1] * currentMatrix[1]);
                                const scaleH = Math.sqrt(currentMatrix[2] * currentMatrix[2] + currentMatrix[3] * currentMatrix[3]);
                                
                                // Position
                                const yPos = currentMatrix[5]; 
                                const xPos = currentMatrix[4];

                                pageImageItems.push({
                                  type: 'image',
                                  imageData: buf,
                                  extension: 'png',
                                  y: yPos,
                                  x: xPos,
                                  width: scaleW,
                                  height: scaleH
                                });
                            }
                        } catch (drawErr) {
                           // Fallback or ignore if not drawable
                        }
                    }
                }
            }
          }
        }
    } catch (e) {
        console.warn("Error processing operators for page", i, e);
    }

    // Combine, Sort
    const pageItems = [...pageTextItems, ...pageImageItems].sort((a: any, b: any) => {
      const yDiff = b.y - a.y; // Descending Y (Top to Bottom)
      if (Math.abs(yDiff) < 5) return a.x - b.x; // Left to right
      return yDiff;
    });

    // Merge adjacent text items if they share style and line
    let currentItem: DocContentItem | null = null;
    
    pageItems.forEach((item: any) => {
      if (!currentItem) {
        currentItem = item;
        return;
      }

      let merged = false;
      if (currentItem.type === 'text' && item.type === 'text') {
         const yDiff = Math.abs(currentItem.y - item.y);
         const sameStyle = (
             Math.abs((currentItem.fontSize || 0) - (item.fontSize || 0)) < 2 &&
             currentItem.isBold === item.isBold &&
             currentItem.isItalic === item.isItalic
         );

         if (yDiff < 4 && sameStyle) {
             // Append text
             const prevEnd = (currentItem.x || 0) + (currentItem.width || 0);
             const gap = item.x - prevEnd;
             
             // Simple heuristic for space
             let separator = "";
             if (gap > (currentItem.fontSize || 10) * 0.2) { 
                 if (!currentItem.text?.endsWith(" ") && !item.text?.startsWith(" ")) {
                     separator = " ";
                 }
             }
             
             currentItem.text += separator + item.text;
             // Update dimensions to include new item
             currentItem.width = (currentItem.width || 0) + gap + (item.width || 0);
             merged = true;
         }
      }

      if (!merged) {
        allItems.push(currentItem);
        currentItem = item;
      }
    });

    if (currentItem) {
        allItems.push(currentItem);
    }
  }

  return allItems;
};

/**
 * Generates a DOCX file from extracted content (text + images).
 */
const createDocxFromContent = async (items: DocContentItem[]): Promise<Blob> => {
  if (!window.JSZip) throw new Error("JSZip not loaded");
  const zip = new window.JSZip();

  let mediaIdCounter = 1;
  const imageRels: { id: string, target: string }[] = [];

  // Add images to zip
  const mediaFolder = zip.folder("word/media");
  
  const processedItems = await Promise.all(items.map(async (item) => {
    if (item.type === 'image' && item.imageData) {
       const id = `rIdImg${mediaIdCounter++}`;
       const fileName = `image${mediaIdCounter}.${item.extension}`;
       
       // Handle ArrayBuffer for JSZip
       mediaFolder?.file(fileName, item.imageData);
       
       imageRels.push({ id, target: `media/${fileName}` });
       return { ...item, relId: id };
    }
    return item;
  }));

  // 1. [Content_Types].xml
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
  zip.file("[Content_Types].xml", contentTypes);

  // 2. _rels/.rels
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  zip.folder("_rels")?.file(".rels", rels);

  // 3. word/_rels/document.xml.rels
  let docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
  
  imageRels.forEach(rel => {
    docRels += `<Relationship Id="${rel.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${rel.target}"/>`;
  });
  docRels += `</Relationships>`;
  zip.folder("word")?.folder("_rels")?.file("document.xml.rels", docRels);

  // 4. word/styles.xml
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Times New Roman"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
        <w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="ar-SA"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault/>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
</w:styles>`;
  zip.folder("word")?.file("styles.xml", stylesXml);

  // 5. word/document.xml (Content)
  let bodyContent = '';
  
  // Group into paragraphs based on Y coordinate
  let currentY = processedItems[0]?.y;
  let currentParaContent = '';

  const flushParagraph = () => {
    if (currentParaContent) {
      bodyContent += `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>${currentParaContent}</w:p>`;
      currentParaContent = '';
    }
  };

  processedItems.forEach((item: any) => {
     // Determine if new paragraph
     const yDiff = Math.abs(item.y - currentY);
     if (yDiff > 10) {
        flushParagraph();
        currentY = item.y;
     }

     if (item.type === 'text' && item.text) {
        const cleanPara = cleanXmlString(item.text);
        const safeText = cleanPara
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
        
        const fontSizeHalfPts = Math.round((item.fontSize || 11) * 2);
        
        const rPr = `
          <w:rPr>
            ${item.isBold ? '<w:b/>' : ''}
            ${item.isItalic ? '<w:i/>' : ''}
            <w:sz w:val="${fontSizeHalfPts}"/>
            <w:szCs w:val="${fontSizeHalfPts}"/>
          </w:rPr>
        `;

        currentParaContent += `<w:r>${rPr}<w:t xml:space="preserve">${safeText}</w:t></w:r>`;

    } else if (item.type === 'image' && item.relId) {
        // Safe conversions
        let cx = Math.round((item.width || 200) * 12700);
        let cy = Math.round((item.height || 200) * 12700);
        
        // Safety: Clamp max dimensions to prevent broken Word docs
        // Approx 20 inches max width/height
        const MAX_EMU = 20 * 914400; 
        if (cx > MAX_EMU) cx = MAX_EMU;
        if (cy > MAX_EMU) cy = MAX_EMU;
        if (cx < 0) cx = 1000;
        if (cy < 0) cy = 1000;
        
        currentParaContent += `<w:r>
            <w:drawing>
              <wp:inline distT="0" distB="0" distL="0" distR="0">
                <wp:extent cx="${cx}" cy="${cy}"/>
                <wp:effectExtent l="0" t="0" r="0" b="0"/>
                <wp:docPr id="${mediaIdCounter}" name="Picture ${mediaIdCounter}"/>
                <wp:cNvGraphicFramePr>
                  <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
                </wp:cNvGraphicFramePr>
                <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                  <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                      <pic:nvPicPr>
                        <pic:cNvPr id="${mediaIdCounter}" name="Picture"/>
                        <pic:cNvPicPr/>
                      </pic:nvPicPr>
                      <pic:blipFill>
                        <a:blip r:embed="${item.relId}"/>
                        <a:stretch>
                          <a:fillRect/>
                        </a:stretch>
                      </pic:blipFill>
                      <pic:spPr>
                        <a:xfrm>
                          <a:off x="0" y="0"/>
                          <a:ext cx="${cx}" cy="${cy}"/>
                        </a:xfrm>
                        <a:prstGeom prst="rect">
                          <a:avLst/>
                        </a:prstGeom>
                      </pic:spPr>
                    </pic:pic>
                  </a:graphicData>
                </a:graphic>
              </wp:inline>
            </w:drawing>
          </w:r>`;
    }
  });

  flushParagraph();

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>${bodyContent}</w:body>
</w:document>`;
  zip.folder("word")?.file("document.xml", documentXml);

  return await zip.generateAsync({ type: "blob" });
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
    if (onProgress) onProgress(10, "Extracting content (text & images) from PDF...");
    const items = await extractContentFromPdf(file.data, file.password, (p) => {
      if (onProgress) onProgress(10 + Math.round(p * 0.4), `Analyzing content... ${p}%`);
    });

    if (onProgress) onProgress(60, "Generating Word document...");
    const docxBlob = await createDocxFromContent(items);
    
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
  
  // Clone data to avoid detached buffer errors
  const loadingTask = pdfjs.getDocument({ 
    data: file.data.slice(), 
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

/**
 * Converts a list of images (JPG, PNG) into a single PDF document.
 */
export const convertImagesToPdf = async (
  files: UploadedFile[],
  options: { pageSize: 'a4' | 'fit'; orientation: 'portrait' | 'landscape' | 'auto'; margin: number },
  onProgress: (p: number, msg: string) => void
): Promise<{ data: Uint8Array, fileName: string }> => {
  if (!window.PDFLib) throw new Error("PDF Library not loaded");
  const { PDFDocument, PageSizes } = window.PDFLib;
  
  if (files.length === 0) throw new Error("No files selected");

  const pdfDoc = await PDFDocument.create();
  const totalFiles = files.length;
  
  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    const progress = Math.round((i / totalFiles) * 90);
    onProgress(progress, `Processing image ${i + 1} of ${totalFiles}...`);

    let image;
    try {
      // Determine image type. PDFLib supports PNG and JPG directly.
      // WEBP or others need conversion. We assume input is already filtered or converted if necessary,
      // but for robustness we can try to detect or fallback.
      // For this implementation, we assume files are JPG/PNG as enforced by input accept.
      // If we allowed WEBP, we'd need a canvas conversion step here similar to sanitization.
      
      const isPng = file.type === 'image/png';
      const isJpg = file.type === 'image/jpeg' || file.type === 'image/jpg';
      
      if (isPng) {
        image = await pdfDoc.embedPng(file.data);
      } else if (isJpg) {
        image = await pdfDoc.embedJpg(file.data);
      } else {
        // Fallback: Convert unknown/unsupported (like WEBP) to PNG via Canvas
        // This is a bit heavy but ensures compatibility
        const blob = new Blob([file.data], { type: file.type });
        const bmp = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
           ctx.drawImage(bmp, 0, 0);
           const pngBlob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
           if (pngBlob) {
             const buf = await pngBlob.arrayBuffer();
             image = await pdfDoc.embedPng(buf);
           }
        }
      }
      
      if (!image) throw new Error("Could not process image");

      const imgDims = image.scale(1);
      
      // Calculate page dimensions based on options
      let pageWidth, pageHeight;
      let drawWidth, drawHeight;
      let drawX, drawY;

      if (options.pageSize === 'fit') {
        // Page matches image size exactly (plus margin if any, but usually fit means exact)
        // We'll apply margin anyway if user specified it
        const margin2 = options.margin * 2;
        pageWidth = imgDims.width + margin2;
        pageHeight = imgDims.height + margin2;
        drawWidth = imgDims.width;
        drawHeight = imgDims.height;
        drawX = options.margin;
        drawY = options.margin;
      } else {
        // A4 Standard
        // PDFLib A4 is [595.28, 841.89] (Points)
        const A4 = PageSizes.A4; // [width, height]
        let a4Width = A4[0];
        let a4Height = A4[1];

        // Handle Orientation
        let isLandscape = false;
        if (options.orientation === 'auto') {
           isLandscape = imgDims.width > imgDims.height;
        } else {
           isLandscape = options.orientation === 'landscape';
        }

        if (isLandscape) {
           // Swap A4 dims
           const temp = a4Width; a4Width = a4Height; a4Height = temp;
        }

        pageWidth = a4Width;
        pageHeight = a4Height;

        // Calculate Scale to fit within margins
        const maxW = pageWidth - (options.margin * 2);
        const maxH = pageHeight - (options.margin * 2);

        const scale = Math.min(maxW / imgDims.width, maxH / imgDims.height);
        
        drawWidth = imgDims.width * scale;
        drawHeight = imgDims.height * scale;
        
        // Center image
        drawX = (pageWidth - drawWidth) / 2;
        drawY = (pageHeight - drawHeight) / 2;
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(image, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight,
      });

    } catch (e) {
      console.warn(`Skipping image ${file.name}:`, e);
      continue;
    }
  }

  onProgress(100, "Done!");
  const pdfBytes = await pdfDoc.save();
  return {
    data: pdfBytes,
    fileName: 'images_merged.pdf'
  };
};
