import { pdfToImages } from '../src/services/pdfProcessorService';
import path from 'path';
import fs from 'fs-extra';

const debug = async () => {
    try {
        const inputPath = path.join(__dirname, 'test_data', 'test1.pdf');
        const outputDir = path.join(__dirname, 'test_data', 'debug_images');

        await fs.ensureDir(outputDir);
        console.log('Starting conversion...');
        const files = await pdfToImages(inputPath, outputDir);
        console.log('Conversion successful:', files);
    } catch (error) {
        console.error('Debug failed:', error);
    }
};

debug();
