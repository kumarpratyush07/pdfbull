import { Request, Response, NextFunction } from 'express';
import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import { imagesToPdf } from '../services/imageService';
import { pdfToImages } from '../services/pdfProcessorService';
import { getTempFilePath, cleanupFiles } from '../utils/fileHelpers';
import { AppError } from '../middlewares/errorHandler';

export const dateImageToPdfController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            throw new AppError('Please upload at least one image', 400);
        }

        const filePaths = files.map(f => f.path);
        const outputPath = getTempFilePath('.pdf');

        await imagesToPdf(filePaths, outputPath);

        res.download(outputPath, 'images.pdf', async (err) => {
            await cleanupFiles([...filePaths, outputPath]);
            if (err) next(err);
        });
    } catch (error) {
        next(error);
    }
};

export const pdfToImageController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const file = req.file;
        if (!file) throw new AppError('Please upload a PDF file', 400);

        const format = (req.body.format === 'jpg' || req.body.format === 'jpeg') ? 'jpg' : 'png';

        const outputDir = path.join(path.dirname(file.path), path.basename(file.path, '.pdf') + '_images');
        await fs.ensureDir(outputDir);

        const imageUrls = await pdfToImages(file.path, outputDir, format);

        // Create zip
        const zipPath = `${outputDir}.zip`;
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            res.download(zipPath, 'pdf_images.zip', async (err) => {
                await cleanupFiles([file.path, zipPath]);
                await fs.remove(outputDir);
                if (err) next(err);
            });
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);
        imageUrls.forEach(f => {
            archive.file(f, { name: path.basename(f) });
        });
        await archive.finalize();

    } catch (error) {
        next(error);
    }
};
