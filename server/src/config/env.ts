import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
    libreOfficePath: process.env.LIBREOFFICE_PATH || 'soffice',
    ghostscriptPath: process.env.GHOSTSCRIPT_PATH || 'gswin64c', // Windows default usually
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
