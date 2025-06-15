import React, { useRef, useEffect, useState, useCallback } from 'react';

interface LoadedImage {
  buffer: Buffer;
  filePath: string;
  width: number;
  height: number;
}

interface ImageCanvasProps {
  imageData: LoadedImage;
  onLoadNewImage: () => void;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({ imageData, onLoadNewImage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);

  // Load and draw image
  useEffect(() => {
    if (!imageData) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    const blob = new Blob([imageData.buffer]);
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      setImageElement(img);
      drawImage(img);
      URL.revokeObjectURL(url);
    };

    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageData]);

  // Redraw when zoom or pan changes
  useEffect(() => {
    if (imageElement) {
      drawImage(imageElement);
    }
  }, [zoom, pan, imageElement]);

  const drawImage = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to container size
    const containerRect = container.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scaled dimensions
    const scaledWidth = img.width * zoom;
    const scaledHeight = img.height * zoom;

    // Calculate position (centered + pan offset)
    const x = (canvas.width - scaledWidth) / 2 + pan.x;
    const y = (canvas.height - scaledHeight) / 2 + pan.y;

    // Draw image
    ctx.imageSmoothingEnabled = zoom < 1;
    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

    // Draw border around image
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, scaledWidth, scaledHeight);
  }, [zoom, pan]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * delta));
    
    // Zoom towards mouse position
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomFactor = newZoom / zoom;
      const newPanX = pan.x - (mouseX - pan.x) * (zoomFactor - 1);
      const newPanY = pan.y - (mouseY - pan.y) * (zoomFactor - 1);
      
      setPan({ x: newPanX, y: newPanY });
    }
    
    setZoom(newZoom);
  }, [zoom, pan]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, lastMousePos]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const fitToScreen = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;

    const containerRect = canvas.getBoundingClientRect();
    const scaleX = containerRect.width / imageData.width;
    const scaleY = containerRect.height / imageData.height;
    const scale = Math.min(scaleX, scaleY, 1) * 0.9; // 90% to leave some margin

    setZoom(scale);
    setPan({ x: 0, y: 0 });
  }, [imageData]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {imageData.filePath} ({imageData.width}×{imageData.height})
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            Zoom: {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={fitToScreen}
            className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
          >
            Fit
          </button>
          <button
            onClick={resetView}
            className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
          >
            Reset
          </button>
          <button
            onClick={onLoadNewImage}
            className="px-2 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded"
          >
            New Image
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-gray-100"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
};

export default ImageCanvas;