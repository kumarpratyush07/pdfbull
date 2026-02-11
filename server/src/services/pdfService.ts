import { PDFDocument } from 'pdf-lib';
import fs from 'fs-extra';
import path from 'path';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';

export const mergePdfs = async (filePaths: string[], outputPath: string): Promise<string> => {
    try {
        const mergedPdf = await PDFDocument.create();

        for (const filePath of filePaths) {
            const pdfBytes = await fs.readFile(filePath);
            const pdf = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        await fs.writeFile(outputPath, mergedPdfBytes);
        return outputPath;
    } catch (error) {
        logger.error('Merge PDFs failed', error);
        throw new AppError('Failed to merge PDFs', 500);
    }
};

export const splitPdf = async (inputPath: string, outputDir: string): Promise<string[]> => {
    try {
        const pdfBytes = await fs.readFile(inputPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const pageCount = pdf.getPageCount();
        const outputFiles: string[] = [];

        for (let i = 0; i < pageCount; i++) {
            const newPdf = await PDFDocument.create();
            const [page] = await newPdf.copyPages(pdf, [i]);
            newPdf.addPage(page);

            const outputName = `page_${i + 1}.pdf`;
            const outputPath = path.join(outputDir, outputName);
            const newPdfBytes = await newPdf.save();

            await fs.writeFile(outputPath, newPdfBytes);
            outputFiles.push(outputPath);
        }

        return outputFiles;
    } catch (error) {
        logger.error('Split PDF failed', error);
        throw new AppError('Failed to split PDF', 500);
    }
};
