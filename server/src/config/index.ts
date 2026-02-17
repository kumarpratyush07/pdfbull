import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';

// Priority: .env.{nodeEnv} > .env
dotenv.config({ path: path.join(__dirname, `../../.env.${nodeEnv}`) });
dotenv.config(); // Fallback to .env

// Define configuration schema with Zod
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('5000').transform(Number),
    CORS_ORIGIN: z.string().default('http://localhost:3000').transform(s => s.split(',').map(o => o.trim())),
    UPLOAD_DIR: z.string().default(path.join(__dirname, '../../uploads')),
    // External tools paths - can be tricky across OS, so we default to common commands
    LIBREOFFICE_PATH: z.string().default('soffice'),
    GHOSTSCRIPT_PATH: z.string().default('gs'),
});

// Parse and validate
const _env = envSchema.parse(process.env);

export const config = {
    nodeEnv: _env.NODE_ENV,
    port: _env.PORT,
    corsOrigin: _env.CORS_ORIGIN,
    uploadDir: _env.UPLOAD_DIR,
    libreOfficePath: _env.LIBREOFFICE_PATH,
    ghostscriptPath: _env.GHOSTSCRIPT_PATH,
    isDev: _env.NODE_ENV === 'development',
    isProd: _env.NODE_ENV === 'production',
    isTest: _env.NODE_ENV === 'test',
};
