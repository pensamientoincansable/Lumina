
export interface User {
  id: string;
  username: string;
  email: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  originalPrompt: string;
  timestamp: number;
  aspectRatio: string;
  format: string;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export enum ImageFormat {
  PNG = 'image/png',
  JPEG = 'image/jpeg',
  WEBP = 'image/webp',
  BMP = 'image/bmp'
}
