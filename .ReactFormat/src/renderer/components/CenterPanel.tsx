import React, { useRef, useState, useCallback } from 'react';
import PanelHeader from './PanelHeader';
import ImageCanvas from './ImageCanvas';

interface LoadedImage {
  buffer: Buffer;
  filePath: string;
  width: number;
  height: number;
}

const CenterPanel: React.FC = () => {
  const [loadedImage, setLoadedImage] = useState<LoadedImage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileLoad = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Create image to get dimensions
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        setLoadedImage({
          buffer,
          filePath: file.name,
          width: img.width,
          height: img.height
        });
        URL.revokeObjectURL(url);
        setIsLoading(false);
      };
      
      img.onerror = () => {
        console.error('Error loading image');
        setIsLoading(false);
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    } catch (error) {
      console.error('Error processing file:', error);
      setIsLoading(false);
    }
  }, []);

  const handleElectronFileOpen = useCallback(async () => {
    try {
      // Try Electron API first
      if (window.electronAPI) {
        const result = await window.electronAPI.openFile();
        if (result) {
          const { buffer, filePath } = result;
          
          // Create blob from buffer to get image dimensions
          const blob = new Blob([buffer]);
          const url = URL.createObjectURL(blob);
          const img = new Image();
          
          img.onload = () => {
            setLoadedImage({
              buffer,
              filePath,
              width: img.width,
              height: img.height
            });
            URL.revokeObjectURL(url);
          };
          
          img.src = url;
        }
      } else {
        // Fallback to HTML file input
        fileInputRef.current?.click();
      }
    } catch (error) {
      console.error('Error opening file:', error);
      // Fallback to HTML file input on error
      fileInputRef.current?.click();
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleFileLoad(file);
      }
    }
  }, [handleFileLoad]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleFileLoad(file);
      }
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFileLoad]);

  return (
    <div className="panel center-panel">
      <PanelHeader title="Image Preview" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
      <div className="panel-content relative">
        {loadedImage ? (
          <ImageCanvas 
            imageData={loadedImage}
            onLoadNewImage={handleElectronFileOpen}
          />
        ) : (
          <div 
            ref={dropZoneRef}
            className={`image-preview-area flex items-center justify-center min-h-[400px] border-2 border-dashed transition-colors ${
              dragOver 
                ? 'border-orange-400 bg-orange-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="text-center">
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
                  <p className="text-gray-600">Loading image...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <div className="text-6xl text-gray-400">📁</div>
                  <div>
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Drop an image file here
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      or click to select a file
                    </p>
                    <button 
                      onClick={handleElectronFileOpen}
                      className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                    >
                      Browse Files
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Supports: PNG, JPG, JPEG, WebP, GIF, BMP
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CenterPanel;