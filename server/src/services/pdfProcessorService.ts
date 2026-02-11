import { exec } from 'child_process';
import util from 'util';
import fs from 'fs-extra';
import path from 'path';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';
import { PDFDocument } from 'pdf-lib';

const execPromise = util.promisify(exec);

export type CompressionLevel = 'screen' | 'ebook' | 'printer' | 'prepress' | 'default';



export const compressPdf = async (inputPath: string, outputPath: string, level: CompressionLevel = 'ebook'): Promise<string> => {
    try {
        const command = `"${config.ghostscriptPath}" -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/${level} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`;

        logger.info(`Executing Ghostscript command: ${command}`);

        await execPromise(command);

        if (!await fs.pathExists(outputPath)) {
            throw new Error('Ghostscript did not produce output');
        }

        return outputPath;
    } catch (error) {
        logger.warn('Ghostscript compression failed, falling back to simple PDF rewrite (pdf-lib)', error);

        try {
            // Fallback: Just load and save (sometimes optimizes slightly, but mostly just ensures valid PDF)
            const pdfBytes = await fs.readFile(inputPath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const savedBytes = await pdfDoc.save();
            await fs.writeFile(outputPath, savedBytes);
            return outputPath;
        } catch (fallbackError) {
            logger.error('Fallback compression failed', fallbackError);
            throw new AppError('Failed to compress/process PDF', 500);
        }
    }
};

// Re-export specific types if needed, or just use number
export const pdfToImages = async (inputPath: string, outputDir: string, format: 'png' | 'jpg' = 'png'): Promise<string[]> => {
    try {
        // Dynamic import for pdfjs-dist (ESM)
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const { createCanvas } = require('canvas');

        // Load the PDF file
        const data = await fs.readFile(inputPath);
        const uint8Array = new Uint8Array(data);

        // Load document
        const loadingTask = pdfjs.getDocument({
            data: uint8Array,
            standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/',
            disableFontFace: true, // Avoid font loading issues in node
        });

        const doc = await loadingTask.promise;
        const numPages = doc.numPages;
        const outputFiles: string[] = [];

        logger.info(`Converting PDF to Image (pdfjs-dist). Pages: ${numPages}, Format: ${format}`);

        for (let i = 1; i <= numPages; i++) {
            const page = await doc.getPage(i);

            // Set scale (1.5 = 108dpi ~ good balance, 2.0 = 144dpi)
            const viewport = page.getViewport({ scale: 2.0 });

            // Create canvas
            const canvas = createCanvas(viewport.width, viewport.height);
            const context = canvas.getContext('2d');

            // Render
            const renderContext = {
                canvasContext: context as any,
                viewport: viewport,
                canvas: canvas as any
            };

            await page.render(renderContext).promise;

            // Save to file
            const ext = format === 'jpg' ? 'jpg' : 'png';
            const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
            const fileName = `page_${i}.${ext}`;
            const outputPath = path.join(outputDir, fileName);
            const buffer = canvas.toBuffer(mime);

            await fs.writeFile(outputPath, buffer);
            outputFiles.push(outputPath);

            // Free page resources
            page.cleanup();
        }

        // Free doc resources
        doc.cleanup();

        return outputFiles;

    } catch (error: any) {
        logger.error('PDF to Image conversion failed (pdfjs-dist)', error);

        // Fallback or re-throw
        throw new AppError('Failed to convert PDF to images: ' + error.message, 500);
    }
};
