export const fileToUint8Array = (file: File): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const parsePageRange = (range: string, maxPages: number): number[] => {
  const pages = new Set<number>();
  const parts = range.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr);
      const end = parseInt(endStr);

      if (!isNaN(start) && !isNaN(end)) {
        // Handle reverse ranges or normal ranges
        const min = Math.min(start, end);
        const max = Math.max(start, end);

        for (let i = min; i <= max; i++) {
          if (i >= 1 && i <= maxPages) pages.add(i);
        }
      }
    } else {
      const page = parseInt(trimmed);
      if (!isNaN(page) && page >= 1 && page <= maxPages) {
        pages.add(page);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
};

export const parseSplitRanges = (rangeInput: string, maxPages: number): number[][] => {
  const fileGroups: number[][] = [];
  const parts = rangeInput.split(',');

  for (const part of parts) {
    if (!part.trim()) continue;

    // Within a comma-separated part, we look for ranges or numbers separated by whitespace
    // We want to preserve order of user input for constructing the page list

    const pages: number[] = [];
    const regex = /(\d+)\s*-\s*(\d+)|(\d+)/g;
    let match;

    // We need to loop through matches in the string `part`
    while ((match = regex.exec(part)) !== null) {
      if (match[1] && match[2]) {
        // Range start-end
        const start = parseInt(match[1]);
        const end = parseInt(match[2]);

        if (!isNaN(start) && !isNaN(end)) {
          // Handle ascending or descending
          if (start <= end) {
            for (let i = start; i <= end; i++) {
              if (i >= 1 && i <= maxPages) pages.push(i);
            }
          } else {
            // Descending range
            for (let i = start; i >= end; i--) {
              if (i >= 1 && i <= maxPages) pages.push(i);
            }
          }
        }
      } else if (match[3]) {
        // Single page
        const page = parseInt(match[3]);
        if (!isNaN(page) && page >= 1 && page <= maxPages) {
          pages.push(page);
        }
      }
    }

    if (pages.length > 0) {
      fileGroups.push(pages);
    }
  }

  return fileGroups;
};

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}