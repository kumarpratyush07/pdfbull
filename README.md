# PDFBull - Full Stack PDF Tools

A production-grade PDF manipulation platform built with React (frontend) and Node.js (backend).

## Features

- **Merge/Split PDF**: Combine multiple PDFs into one or split one into multiple.
- **Compress PDF**: Optimize PDF size using Ghostscript.
- **Office to PDF**: Convert Word, Excel, PowerPoint to PDF using LibreOffice.
- **PDF to Office**: Convert PDF to Word/Excel/PowerPoint.
- **Image Tools**: Convert Images to PDF and PDF to Images.
- **Secure Processing**: Files are processed securely and deleted immediately after download.

## Prerequisites

1.  **Node.js** (v18+)
2.  **LibreOffice**: Required for Office conversions.
    -   Windows: Install standard LibreOffice. Ensure `soffice` is in PATH or update `.env`.
    -   Linux: `sudo apt install libreoffice`
3.  **Ghostscript**: Required for compression and PDF-to-Image.
    -   Windows: Install Ghostscript. Ensure `gswin64c` is in PATH or update `.env`.
    -   Linux: `sudo apt install ghostscript`

## Project Structure

-   `client/`: React frontend (Vite + TypeScript + Tailwind).
-   `server/`: Node.js backend (Express + TypeScript + Multer).

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    # This installs root, client, and server dependencies
    ```

2.  **Configuration**:
    -   Server config is in `server/src/config/env.ts`.
    -   You can create a `.env` file in `server/` to override defaults:
        ```env
        PORT=5000
        UPLOAD_DIR=./uploads
        LIBREOFFICE_PATH="C:\\Program Files\\LibreOffice\\program\\soffice.exe"
        GHOSTSCRIPT_PATH="C:\\Program Files\\gs\\gs10.02.1\\bin\\gswin64c.exe"
        ```

3.  **Run Development**:
    ```bash
    npm run dev
    # Runs both client (port 3000) and server (port 5000)
    ```

4.  **Production Build**:
    ```bash
    npm run build
    npm start
    ```

## API Documentation

The backend exposes endpoints at `/api/`:
-   `POST /merge`
-   `POST /split`
-   `POST /compress`
-   `POST /word-to-pdf`
-   `POST /pdf-to-word`
-   ...and more.

See `server/src/routes/index.ts` for full list.
