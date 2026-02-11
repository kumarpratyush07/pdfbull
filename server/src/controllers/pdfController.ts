import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { mergePdfs, splitPdf } from '../services/pdfService';
import { compressPdf, pdfToImages } from '../services/pdfProcessorService';
import { getTempFilePath, cleanupFiles } from '../utils/fileHelpers';
import { AppError } from '../middlewares/errorHandler';
import archiver from 'archiver';

export const mergeController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length < 2) {
            throw new AppError('Please upload at least 2 PDF files', 400);
        }

        const filePaths = files.map(f => f.path);
        const outputPath = getTempFilePath('.pdf');

        await mergePdfs(filePaths, outputPath);

        res.download(outputPath, 'merged.pdf', async (err) => {
            await cleanupFiles([...filePaths, outputPath]);
            if (err) next(err);
        });
    } catch (error) {
        next(error);
    }
};

export const splitController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const file = req.file;
        if (!file) throw new AppError('Please upload a PDF file', 400);

        const outputDir = path.join(path.dirname(file.path), path.basename(file.path, '.pdf') + '_split');
        await fs.ensureDir(outputDir);

        const splitFiles = await splitPdf(file.path, outputDir);

        // Create zip
        const zipPath = `${outputDir}.zip`;
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            res.download(zipPath, 'split_pages.zip', async (err) => {
                await cleanupFiles([file.path, zipPath]);
                await fs.remove(outputDir);
                if (err) next(err);
            });
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);
        splitFiles.forEach(f => {
            archive.file(f, { name: path.basename(f) });
        });
        await archive.finalize();

    } catch (error) {
        next(error);
    }
};

export const compressController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const file = req.file;
        if (!file) throw new AppError('Please upload a PDF file', 400);

        const levelMap: Record<string, string> = {
            'extreme': 'screen',
            'recommended': 'ebook',
            'high_quality': 'printer'
        };

        const requestedLevel = req.body.level as string;
        const gsLevel = levelMap[requestedLevel] || 'ebook';

        const outputPath = getTempFilePath('.pdf');
        await compressPdf(file.path, outputPath, gsLevel as any);

        res.download(outputPath, 'compressed.pdf', async (err) => {
            await cleanupFiles([file.path, outputPath]);
            if (err) next(err);
        });
    } catch (error) {
        next(error);
    }
};
