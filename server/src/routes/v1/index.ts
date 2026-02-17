import { Router } from 'express';
import { upload } from '../../middlewares/upload';
import { mergeController, splitController, compressController } from '../../controllers/pdfController';
import { officeToPdfController, pdfToOfficeController } from '../../controllers/officeController';
import { dateImageToPdfController, pdfToImageController } from '../../controllers/imageController';

const router = Router();

// PDF Operations
router.post('/merge', upload.array('files', 10), mergeController);
router.post('/split', upload.single('file'), splitController);
router.post('/compress', upload.single('file'), compressController);

// Office to PDF
router.post('/word-to-pdf', upload.single('file'), officeToPdfController);
router.post('/excel-to-pdf', upload.single('file'), officeToPdfController);
router.post('/powerpoint-to-pdf', upload.single('file'), officeToPdfController);

// Image Operations
router.post('/image-to-pdf', upload.array('files', 20), dateImageToPdfController);
router.post('/pdf-to-image', upload.single('file'), pdfToImageController);

// PDF to Office
router.post('/pdf-to-word', upload.single('file'), pdfToOfficeController);
router.post('/pdf-to-excel', upload.single('file'), pdfToOfficeController);
router.post('/pdf-to-powerpoint', upload.single('file'), pdfToOfficeController);

// View PDF (just return the file if it's uploaded to view? 
// Or is this for the frontend viewer? Frontend uses pdf.js usually. 
// If backend needs to serve it, we can just echo it back. 
// But "View PDF" feature is usually client-side. 
// I'll add a simple echo route for testing or if they want to render server-side.)
router.post('/view', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');
    res.sendFile(req.file.path);
    // Cleanup after sending? tricky with sendFile. 
    // Usually view is GET with ID. But for this stateless tool:
    // We can just stream it back.
});

export default router;
