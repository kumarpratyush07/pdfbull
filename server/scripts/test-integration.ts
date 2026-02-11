import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { PDFDocument } from 'pdf-lib';

const API_URL = 'http://localhost:5000/api';
const TEST_DIR = path.join(__dirname, 'test_data');

// Helper to create a dummy PDF
async function createDummyPdf(filename: string, text: string) {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    page.drawText(text, { x: 50, y: 500 });
    const bytes = await doc.save();
    await fs.writeFile(path.join(TEST_DIR, filename), bytes);
}

// Helper to create a dummy PNG (1x1 pixel red dot)
async function createDummyPng(filename: string) {
    const pngBuffer = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d763f8cfc000000301010018dd8dca0000000049454e44ae426082', 'hex');
    await fs.writeFile(path.join(TEST_DIR, filename), pngBuffer);
}

async function runTests() {
    try {
        console.log('Setup: Creating test data...');
        await fs.ensureDir(TEST_DIR);
        await createDummyPdf('test1.pdf', 'Test PDF 1');
        await createDummyPdf('test2.pdf', 'Test PDF 2');
        await createDummyPng('test_image.png');

        // 1. MERGE
        console.log('\n--- Testing /merge (PDF Merge) ---');
        try {
            const form = new FormData();
            form.append('files', fs.createReadStream(path.join(TEST_DIR, 'test1.pdf')));
            form.append('files', fs.createReadStream(path.join(TEST_DIR, 'test2.pdf')));

            const res = await axios.post(`${API_URL}/merge`, form, { headers: form.getHeaders(), responseType: 'arraybuffer' });
            if (res.status === 200 && res.headers['content-type'].includes('pdf')) {
                console.log('✅ Merge Success');
                await fs.writeFile(path.join(TEST_DIR, 'result_merged.pdf'), res.data);
            } else throw new Error(`Status ${res.status}`);
        } catch (e: any) { console.error('❌ Merge Failed:', e.message, e.response?.data?.toString()); }

        // 2. SPLIT
        console.log('\n--- Testing /split (PDF Split) ---');
        try {
            const form = new FormData();
            form.append('file', fs.createReadStream(path.join(TEST_DIR, 'test1.pdf')));

            const res = await axios.post(`${API_URL}/split`, form, { headers: form.getHeaders(), responseType: 'arraybuffer' });
            if (res.status === 200) {
                console.log('✅ Split Success');
                await fs.writeFile(path.join(TEST_DIR, 'result_split.zip'), res.data);
            } else throw new Error(`Status ${res.status}`);
        } catch (e: any) { console.error('❌ Split Failed:', e.message, e.response?.data?.toString()); }

        // 3. COMPRESS
        console.log('\n--- Testing /compress (PDF Compress) ---');
        try {
            const form = new FormData();
            form.append('file', fs.createReadStream(path.join(TEST_DIR, 'test1.pdf')));
            form.append('level', 'recommended');

            const res = await axios.post(`${API_URL}/compress`, form, { headers: form.getHeaders(), responseType: 'arraybuffer' });
            if (res.status === 200) {
                console.log('✅ Compress Success');
                await fs.writeFile(path.join(TEST_DIR, 'result_compressed.pdf'), res.data);
            } else throw new Error(`Status ${res.status}`);
        } catch (e: any) { console.error('❌ Compress Failed:', e.message, e.response?.data?.toString()); }

        // 4. IMAGE TO PDF
        console.log('\n--- Testing /image-to-pdf ---');
        try {
            const form = new FormData();
            form.append('files', fs.createReadStream(path.join(TEST_DIR, 'test_image.png')));

            const res = await axios.post(`${API_URL}/image-to-pdf`, form, { headers: form.getHeaders(), responseType: 'arraybuffer' });
            if (res.status === 200 && res.headers['content-type'].includes('pdf')) {
                console.log('✅ Image-to-PDF Success');
                await fs.writeFile(path.join(TEST_DIR, 'result_image_to_pdf.pdf'), res.data);
            } else throw new Error(`Status ${res.status}`);
        } catch (e: any) { console.error('❌ Image-to-PDF Failed:', e.message, e.response?.data?.toString()); }

        // 5. PDF TO IMAGE
        console.log('\n--- Testing /pdf-to-image ---');
        try {
            const form = new FormData();
            form.append('file', fs.createReadStream(path.join(TEST_DIR, 'test1.pdf')));

            const res = await axios.post(`${API_URL}/pdf-to-image`, form, { headers: form.getHeaders(), responseType: 'arraybuffer' });
            if (res.status === 200) {
                console.log('✅ PDF-to-Image Success');
                await fs.writeFile(path.join(TEST_DIR, 'result_pdf_to_image.zip'), res.data);
            } else throw new Error(`Status ${res.status}`);
        } catch (e: any) {
            console.error('❌ PDF-to-Image Failed:', e.message);
            if (e.response?.data) console.log('   Response:', e.response.data.toString());
            console.log('   (Requires Ghostscript)');
        }

        // 5b. PDF TO IMAGE (JPG)
        console.log('\n--- Testing /pdf-to-image (JPG) ---');
        try {
            const form = new FormData();
            form.append('file', fs.createReadStream(path.join(TEST_DIR, 'test1.pdf')));
            form.append('format', 'jpg');

            const res = await axios.post(`${API_URL}/pdf-to-image`, form, { headers: form.getHeaders(), responseType: 'arraybuffer' });
            if (res.status === 200) {
                console.log('✅ PDF-to-Image (JPG) Success');
                await fs.writeFile(path.join(TEST_DIR, 'result_pdf_to_image_jpg.zip'), res.data);
            } else throw new Error(`Status ${res.status}`);
        } catch (e: any) {
            console.error('❌ PDF-to-Image (JPG) Failed:', e.message);
            if (e.response?.data) console.log('   Response:', e.response.data.toString());
        }

        // 6. PDF TO WORD (LibreOffice)
        console.log('\n--- Testing /pdf-to-word ---');
        try {
            const form = new FormData();
            form.append('file', fs.createReadStream(path.join(TEST_DIR, 'test1.pdf')));

            const res = await axios.post(`${API_URL}/pdf-to-word`, form, { headers: form.getHeaders(), responseType: 'arraybuffer' });
            if (res.status === 200) {
                console.log('✅ PDF-to-Word Success');
                await fs.writeFile(path.join(TEST_DIR, 'result_converted.docx'), res.data);
            } else throw new Error(`Status ${res.status}`);
        } catch (e: any) {
            console.error('❌ PDF-to-Word Failed:', e.message);
            if (e.response?.data) console.log('   Response:', e.response.data.toString());
            if (e.response && e.response.status === 500) {
                console.log('   (Likely LibreOffice not found or configured)');
            }
        }

    } catch (err) {
        console.error('Test Suite Error:', err);
    } finally {
        console.log('\nTest Run Complete. Check server/scripts/test_data/ for results.');
    }
}

runTests();
