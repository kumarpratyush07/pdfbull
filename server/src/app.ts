import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs-extra';
import { config } from './config';
import { errorHandler } from './middlewares/errorHandler';

import apiRoutes from './routes/v1';

const app = express();

// Ensure upload directory exists
fs.ensureDirSync(config.uploadDir);

// Middleware
app.use(helmet());
app.use(cors({
    origin: config.corsOrigin,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1', apiRoutes);

// Error handling
app.use(errorHandler);

export default app;
