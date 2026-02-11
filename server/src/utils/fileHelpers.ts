import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';

export const getTempFilePath = (extension: string = '') => {
    const fileName = `${uuidv4()}${extension.startsWith('.') ? extension : `.${extension}`}`;
    return path.join(config.uploadDir, fileName);
};

export const ensureUploadDir = async () => {
    await fs.ensureDir(config.uploadDir);
};

export const deleteFile = async (filePath: string) => {
    try {
        if (await fs.pathExists(filePath)) {
            await fs.unlink(filePath);
        }
    } catch (err) {
        console.error(`Failed to delete file ${filePath}:`, err);
    }
};

export const cleanupFiles = async (filePaths: string[]) => {
    await Promise.all(filePaths.map(deleteFile));
};
