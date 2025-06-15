// Shared TypeScript definitions for the dithering application

export interface ImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface DitheringAlgorithm {
  name: string;
  id: string;
  parameters?: Record<string, any>;
}

export interface ExportSettings {
  format: 'png' | 'jpeg' | 'webp';
  quality?: number;
  filename?: string;
}

export interface ApplicationState {
  currentImage?: ImageData;
  selectedAlgorithm?: DitheringAlgorithm;
  exportSettings: ExportSettings;
  isProcessing: boolean;
}