import { PDFDocument } from 'pdf-lib';
import fs from 'fs-extra';
import sharp from 'sharp';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';

export const imagesToPdf = async (imagePaths: string[], outputPath: string): Promise<string> => {
    try {
        const pdfDoc = await PDFDocument.create();

        for (const imgPath of imagePaths) {
            const imgBuffer = await fs.readFile(imgPath);
            let processedBuffer: Uint8Array | Buffer = imgBuffer;

            // Metadata check
            const metadata = await sharp(imgBuffer).metadata();
            const isPng = metadata.format === 'png';
            const isJpg = metadata.format === 'jpeg' || metadata.format === 'jpg';

            if (!isPng && !isJpg) {
                // Convert to PNG if not supported
                processedBuffer = await sharp(imgBuffer).png().toBuffer();
            }

            let image;
            if (isJpg) {
                image = await pdfDoc.embedJpg(processedBuffer);
            } else {
                // Default to PNG embedding for PNGs and converted images
                image = await pdfDoc.embedPng(processedBuffer);
            }

            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
            });
        }

        const pdfBytes = await pdfDoc.save();
        await fs.writeFile(outputPath, pdfBytes);
        return outputPath;
    } catch (error) {
        logger.error('Images to PDF failed', error);
        throw new AppError('Failed to convert images to PDF', 500);
    }
};
