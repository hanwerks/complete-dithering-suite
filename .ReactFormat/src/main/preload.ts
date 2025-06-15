import { contextBridge, ipcRenderer } from 'electron';

// Define the API that will be exposed to the renderer process
export interface ElectronAPI {
  // File operations
  openFile: () => Promise<{ filePath: string; buffer: Buffer } | null>;
  saveFile: (data: Buffer, suggestedName?: string) => Promise<string | null>;
  
  // Image processing (will be implemented later)
  processImage: (imageData: ImageData, algorithm: string, params: any) => Promise<ImageData>;
  
  // App operations
  getVersion: () => Promise<string>;
  showErrorDialog: (title: string, content: string) => Promise<void>;
}

// Expose the API to the renderer process
const electronAPI: ElectronAPI = {
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (data: Buffer, suggestedName?: string) => 
    ipcRenderer.invoke('file:save', data, suggestedName),
  processImage: (imageData: ImageData, algorithm: string, params: any) => 
    ipcRenderer.invoke('image:process', imageData, algorithm, params),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  showErrorDialog: (title: string, content: string) => 
    ipcRenderer.invoke('dialog:showError', title, content),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for the renderer process
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}