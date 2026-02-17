import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { setupSwagger } from './config/swagger';

const server = app.listen(config.port, () => {
    logger.info(`Server running in ${config.nodeEnv} mode on port ${config.port}`);

    if (config.isDev) {
        setupSwagger(app);
        logger.info(`Swagger docs: http://localhost:${config.port}/api-docs`);
    }

    logger.info(`Health check: http://localhost:${config.port}/health`);
});

process.on('unhandledRejection', (err: Error) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
    logger.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});
