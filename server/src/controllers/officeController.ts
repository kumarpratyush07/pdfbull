import { Request, Response, NextFunction } from 'express';
import { convertToPdf } from '../services/libreOfficeService';
import { getTempFilePath, cleanupFiles } from '../utils/fileHelpers';
import { AppError } from '../middlewares/errorHandler';

export const officeToPdfController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const file = req.file;
        if (!file) throw new AppError('Please upload an Office document', 400);

        // Output dir same as upload dir for simplicity, but getTempFilePath uses uploadDir
        const outputDir = file.destination;
        const pdfPath = await convertToPdf(file.path, outputDir);

        res.download(pdfPath, 'converted.pdf', async (err) => {
            await cleanupFiles([file.path, pdfPath]);
            if (err) next(err);
        });
    } catch (error) {
        next(error);
    }
};

export const pdfToOfficeController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const file = req.file;
        if (!file) throw new AppError('Please upload a PDF file', 400);

        const outputDir = file.destination;
        // LibreOffice can convert PDF to docx/xlsx/pptx, though with varying quality.
        // We'll trust convertToPdf (which actually just runs libreoffice command) can be generalized.
        // I should refactor convertToPdf to convertToFormat.
        // But for now I'll just use a new service method or genericize it.
        // Let's assume I'll update the service in a moment.

        // Determine target format based on route path or body? 
        // Req.path is like /pdf-to-word.
        let format = 'docx';
        if (req.path.includes('excel')) format = 'xlsx';
        if (req.path.includes('powerpoint')) format = 'pptx';

        // We need a generic convert function. 
        // I will update LibreOfficeService to receive a target extension.
        const convertedPath = await import('../services/libreOfficeService').then(m => m.convertDocument(file.path, outputDir, format));

        res.download(convertedPath, `converted.${format}`, async (err) => {
            await cleanupFiles([file.path, convertedPath]);
            if (err) next(err);
        });
    } catch (error) {
        next(error);
    }
};
