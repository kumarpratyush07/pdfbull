export type ToolMode = 
  | 'home' 
  | 'merge' 
  | 'split' 
  | 'view' 
  | 'compress'
  | 'pdf-to-word'
  | 'word-to-pdf'
  | 'pdf-to-excel'
  | 'excel-to-pdf'
  | 'pdf-to-ppt'
  | 'ppt-to-pdf'
  | 'pdf-to-image';

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: Uint8Array; // Raw buffer for pdf-lib
  isEncrypted: boolean;
  password?: string;
  pageCount?: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface MergeResult {
  fileName: string;
  url: string;
  size: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type CompressionLevel = 'extreme' | 'recommended' | 'high_quality';

export interface CompressionSettings {
  scale: number; // Viewport scale (affects resolution)
  quality: number; // JPEG quality (0 to 1)
}