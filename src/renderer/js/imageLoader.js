class ImageLoader {
    constructor() {
        this.currentImage = null;
        this.canvas = null;
        this.ctx = null;
        this.supportedFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
        
        // Zoom and pan state
        this.zoom = 1;
        this.minZoom = 0.1;
        this.maxZoom = 10;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Comparison state
        this.comparisonMode = 'split';
        this.splitOrientation = 'horizontal'; // 'horizontal' or 'vertical'
        this.originalImageData = null;
        this.ditheredImageData = null;
        
        // Dual canvas for split view
        this.splitCanvasLeft = null;
        this.splitCanvasRight = null;
        this.splitCtxLeft = null;
        this.splitCtxRight = null;
        
        this.init();
        
        // Initialize logging for development
        if (window.devLogger) {
            this.logger = window.devLogger;
            this.logger.logInfo('ImageLoader', 'ImageLoader initialized');
        }
    }

    init() {
        this.setupCanvas();
        this.setupSplitCanvases();
        this.setupDragDrop();
        this.setupFileDialog();
    }

    setupCanvas() {
        const previewArea = document.querySelector('.image-preview-area');
        
        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'image-canvas';
        this.canvas.style.display = 'none';
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.maxHeight = '100%';
        this.canvas.style.objectFit = 'contain';
        
        this.ctx = this.canvas.getContext('2d');
        previewArea.appendChild(this.canvas);
        
        // Setup zoom and pan event listeners
        this.setupZoomPan();
        
        // Setup window resize handling
        this.setupWindowResize();
        
        // Create image controls overlay
        this.createImageControls();
    }

    setupSplitCanvases() {
        // Get the split canvas elements
        this.splitCanvasLeft = document.getElementById('split-canvas-left');
        this.splitCanvasRight = document.getElementById('split-canvas-right');
        
        if (this.splitCanvasLeft && this.splitCanvasRight) {
            this.splitCtxLeft = this.splitCanvasLeft.getContext('2d');
            this.splitCtxRight = this.splitCanvasRight.getContext('2d');
            
            // Setup event listeners for both canvases (they need to be synchronized)
            this.setupSplitCanvasEvents();
        }
        
        // Initialize split view container with proper CSS class
        const splitContainer = document.querySelector('.split-view-container');
        if (splitContainer) {
            splitContainer.classList.remove('horizontal', 'vertical');
            splitContainer.classList.add(this.splitOrientation);
        }
    }

    setupSplitCanvasEvents() {
        // Use container to handle events once, avoid double processing
        const splitContainer = document.querySelector('.split-view-container');
        if (!splitContainer) return;
        
        // Wheel zoom on container
        splitContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = splitContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const oldZoom = this.zoom;
            const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));
            
            if (newZoom !== oldZoom && this.originalImageData) {
                // Get current canvas dimensions
                const canvasWidth = this.splitCanvasLeft ? this.splitCanvasLeft.width : rect.width;
                const canvasHeight = this.splitCanvasLeft ? this.splitCanvasLeft.height : rect.height;
                
                // Convert mouse position to canvas coordinates
                const canvasMouseX = mouseX * (canvasWidth / rect.width);
                const canvasMouseY = mouseY * (canvasHeight / rect.height);
                
                // CRITICAL: Convert canvas coordinates to image coordinates
                // This accounts for the transform chain: translate(panX, panY) -> scale(zoom) -> drawImage(x, y)
                const imgWidth = this.originalImageData.width;
                const imgHeight = this.originalImageData.height;
                const transformedCanvasWidth = canvasWidth / oldZoom;
                const transformedCanvasHeight = canvasHeight / oldZoom;
                const imgX = (transformedCanvasWidth - imgWidth) / 2;
                const imgY = (transformedCanvasHeight - imgHeight) / 2;
                
                // Find the point in image space that the mouse is over
                const imageSpaceX = (canvasMouseX - this.panX) / oldZoom - imgX;
                const imageSpaceY = (canvasMouseY - this.panY) / oldZoom - imgY;
                
                // Update zoom
                this.zoom = newZoom;
                
                // Calculate new image position in transformed space
                const newTransformedCanvasWidth = canvasWidth / newZoom;
                const newTransformedCanvasHeight = canvasHeight / newZoom;
                const newImgX = (newTransformedCanvasWidth - imgWidth) / 2;
                const newImgY = (newTransformedCanvasHeight - imgHeight) / 2;
                
                // Adjust pan so the same image point stays under the mouse
                this.panX = canvasMouseX - (imageSpaceX + newImgX) * newZoom;
                this.panY = canvasMouseY - (imageSpaceY + newImgY) * newZoom;
                
                this.updateSplitView();
            }
        });
        
        // Mouse drag for panning on container
        splitContainer.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            splitContainer.style.cursor = 'grabbing';
        });
        
        // Use document for mousemove to handle movement outside container
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.comparisonMode === 'split') {
                e.preventDefault();
                const deltaX = e.clientX - this.lastMouseX;
                const deltaY = e.clientY - this.lastMouseY;
                
                this.panX += deltaX;
                this.panY += deltaY;
                
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                
                this.updateSplitView();
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                splitContainer.style.cursor = 'grab';
            }
        });
        
        splitContainer.addEventListener('mouseleave', () => {
            splitContainer.style.cursor = 'grab';
        });
        
        splitContainer.addEventListener('mouseenter', () => {
            if (this.comparisonMode === 'split') {
                splitContainer.style.cursor = 'grab';
            }
        });
        
        // Double-click to reset
        splitContainer.addEventListener('dblclick', () => {
            this.resetZoomPan();
        });
    }

    createImageControls() {
        const previewArea = document.querySelector('.image-preview-area');
        
        // Create controls container
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'image-controls';
        controlsContainer.style.display = 'none';
        
        // Create import button
        const importBtn = document.createElement('button');
        importBtn.className = 'control-btn import-btn';
        importBtn.innerHTML = '📁 Import New';
        importBtn.title = 'Import a new image';
        importBtn.addEventListener('click', () => this.triggerFileDialog());
        
        // Create reset zoom button
        const resetBtn = document.createElement('button');
        resetBtn.className = 'control-btn reset-btn';
        resetBtn.innerHTML = '🔄 Reset Zoom';
        resetBtn.title = 'Reset zoom and pan (or double-click canvas)';
        resetBtn.addEventListener('click', () => this.resetZoomPan());
        
        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'control-btn remove-btn';
        removeBtn.innerHTML = '🗑️ Remove';
        removeBtn.title = 'Remove current image';
        removeBtn.addEventListener('click', () => this.removeImage());
        
        controlsContainer.appendChild(importBtn);
        controlsContainer.appendChild(resetBtn);
        controlsContainer.appendChild(removeBtn);
        previewArea.appendChild(controlsContainer);
        
        this.controlsContainer = controlsContainer;
    }

    setupZoomPan() {
        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));
            
            if (newZoom !== this.zoom) {
                // Convert to canvas coordinates
                const canvasMouseX = mouseX * (this.canvas.width / rect.width);
                const canvasMouseY = mouseY * (this.canvas.height / rect.height);
                
                // Handle side-by-side mode differently
                if (this.comparisonMode === 'side-by-side') {
                    const viewportWidth = (this.canvas.width - 2) / 2; // Account for gap
                    
                    // Determine which viewport we're in and adjust mouse position
                    let adjustedMouseX;
                    if (canvasMouseX <= viewportWidth) {
                        // Left viewport - use mouse position as-is
                        adjustedMouseX = canvasMouseX;
                    } else {
                        // Right viewport - adjust mouse position relative to right viewport
                        adjustedMouseX = canvasMouseX - viewportWidth - 2; // Subtract viewport width and gap
                    }
                    
                    // Calculate zoom center for the adjusted position
                    const zoomCenterX = (adjustedMouseX - this.panX) / this.zoom;
                    const zoomCenterY = (canvasMouseY - this.panY) / this.zoom;
                    
                    this.zoom = newZoom;
                    
                    // Adjust pan to keep zoom centered on mouse in the active viewport
                    this.panX = adjustedMouseX - zoomCenterX * this.zoom;
                    this.panY = canvasMouseY - zoomCenterY * this.zoom;
                } else {
                    // Standard zoom-to-cursor for split and single views
                    const zoomCenterX = (canvasMouseX - this.panX) / this.zoom;
                    const zoomCenterY = (canvasMouseY - this.panY) / this.zoom;
                    
                    this.zoom = newZoom;
                    
                    // Adjust pan to keep zoom centered on mouse
                    this.panX = canvasMouseX - zoomCenterX * this.zoom;
                    this.panY = canvasMouseY - zoomCenterY * this.zoom;
                }
                
                this.redrawCanvas();
                
                // Update handle position if in split mode
                if (this.comparisonMode === 'split' && this.updateHandlePosition) {
                    this.updateHandlePosition();
                }
                
                if (this.logger) {
                    this.logger.logCanvasInteraction('zoom', { x: mouseX, y: mouseY }, this.zoom);
                }
            }
        });

        // Mouse drag pan
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left mouse button
                this.isDragging = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.canvas.style.cursor = 'grabbing';
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.lastMouseX;
                const deltaY = e.clientY - this.lastMouseY;
                
                this.panX += deltaX;
                this.panY += deltaY;
                
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                
                this.redrawCanvas();
            } else if (this.currentImage) {
                this.canvas.style.cursor = 'grab';
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            if (this.currentImage) {
                this.canvas.style.cursor = 'grab';
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
            if (this.currentImage) {
                this.canvas.style.cursor = 'grab';
            }
        });

        // Double-click to reset zoom
        this.canvas.addEventListener('dblclick', () => {
            this.resetZoomPan();
        });
    }

    setupWindowResize() {
        // Debounce resize events to avoid excessive calls
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleWindowResize();
            }, 100); // 100ms debounce
        });
    }

    handleWindowResize() {
        if (!this.currentImage || !this.canvas) return;
        
        // Get new container dimensions
        const previewArea = document.querySelector('.image-preview-area');
        const newWidth = previewArea.clientWidth - 40; // Account for padding
        const newHeight = previewArea.clientHeight - 80; // Account for controls
        
        // Store current zoom and pan state
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;
        
        // Calculate scale factors for maintaining relative position
        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;
        
        // Update canvas size
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        
        // Adjust pan position to maintain relative position
        this.panX *= scaleX;
        this.panY *= scaleY;
        
        // Redraw with new dimensions
        this.redrawCanvas();
    }

    setupDragDrop() {
        const uploadArea = document.querySelector('.upload-placeholder');
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => this.highlight(uploadArea), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => this.unhighlight(uploadArea), false);
        });

        // Handle dropped files
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    setupFileDialog() {
        const uploadArea = document.querySelector('.upload-placeholder');
        
        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        document.body.appendChild(fileInput);

        // Add click handler to upload area
        uploadArea.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Upload area clicked');
            fileInput.click();
        });

        // Add some visual feedback for clickability
        uploadArea.style.cursor = 'pointer';
        uploadArea.title = 'Click to select image or drag and drop';
        
        // Store file input reference for reuse
        this.fileInput = fileInput;
    }

    triggerFileDialog() {
        console.log('triggerFileDialog called');
        if (this.fileInput) {
            console.log('File input found, clicking...');
            this.fileInput.click();
        } else {
            console.log('No file input found!');
        }
    }

    removeImage() {
        // Clear current image
        this.currentImage = null;
        
        // Clear comparison data
        this.originalImageData = null;
        this.ditheredImageData = null;
        
        // Reset zoom and pan
        this.resetZoomPan();
        
        // Hide canvas and controls
        this.canvas.style.display = 'none';
        this.controlsContainer.style.display = 'none';
        
        // Hide comparison container
        const comparisonContainer = document.querySelector('.comparison-container');
        if (comparisonContainer) {
            comparisonContainer.style.display = 'none';
        }
        
        // Show upload placeholder again
        const placeholder = document.querySelector('.upload-placeholder');
        placeholder.style.display = 'block';
        
        // Remove has-image class from preview area
        const previewArea = document.querySelector('.image-preview-area');
        previewArea.classList.remove('has-image');
        
        // Clear canvas
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Reset file input
        if (this.fileInput) {
            this.fileInput.value = '';
        }
        
        this.showSuccess('Image removed successfully');
    }


    updateSplitView() {
        // NEW: Update both split canvases with synchronized transforms
        if (!this.originalImageData || !this.ditheredImageData || 
            !this.splitCtxLeft || !this.splitCtxRight) return;
        
        // Update canvas sizes to match container
        const previewArea = document.querySelector('.image-preview-area');
        const width = previewArea.clientWidth - 40;
        const height = previewArea.clientHeight - 80;
        
        this.splitCanvasLeft.width = width;
        this.splitCanvasLeft.height = height;
        this.splitCanvasRight.width = width;
        this.splitCanvasRight.height = height;
        
        // Create image objects from image data
        const originalCanvas = document.createElement('canvas');
        const ditheredCanvas = document.createElement('canvas');
        originalCanvas.width = this.originalImageData.width;
        originalCanvas.height = this.originalImageData.height;
        ditheredCanvas.width = this.ditheredImageData.width;
        ditheredCanvas.height = this.ditheredImageData.height;
        
        const originalCtx = originalCanvas.getContext('2d');
        const ditheredCtx = ditheredCanvas.getContext('2d');
        originalCtx.putImageData(this.originalImageData, 0, 0);
        ditheredCtx.putImageData(this.ditheredImageData, 0, 0);
        
        // Calculate image positioning (centered)
        const imgWidth = this.originalImageData.width;
        const imgHeight = this.originalImageData.height;
        const canvasWidth = width / this.zoom;
        const canvasHeight = height / this.zoom;
        const x = (canvasWidth - imgWidth) / 2;
        const y = (canvasHeight - imgHeight) / 2;
        
        // Handle both horizontal and vertical split orientations
        if (this.splitOrientation === 'horizontal') {
            // Horizontal split: left = original, right = dithered
            this.splitCtxLeft.clearRect(0, 0, width, height);
            this.splitCtxLeft.save();
            this.splitCtxLeft.translate(this.panX, this.panY);
            this.splitCtxLeft.scale(this.zoom, this.zoom);
            this.splitCtxLeft.drawImage(originalCanvas, x, y, imgWidth, imgHeight);
            this.splitCtxLeft.restore();
            
            this.splitCtxRight.clearRect(0, 0, width, height);
            this.splitCtxRight.save();
            this.splitCtxRight.translate(this.panX, this.panY);
            this.splitCtxRight.scale(this.zoom, this.zoom);
            this.splitCtxRight.drawImage(ditheredCanvas, x, y, imgWidth, imgHeight);
            this.splitCtxRight.restore();
        } else {
            // Vertical split: top = original, bottom = dithered
            // For vertical split, we'll use the left canvas for top half and right canvas for bottom half
            // We need to adjust the rendering to create a vertical split effect
            
            // Top half (original) - rendered on left canvas with clipping
            this.splitCtxLeft.clearRect(0, 0, width, height);
            this.splitCtxLeft.save();
            this.splitCtxLeft.beginPath();
            this.splitCtxLeft.rect(0, 0, width, height / 2);
            this.splitCtxLeft.clip();
            this.splitCtxLeft.translate(this.panX, this.panY);
            this.splitCtxLeft.scale(this.zoom, this.zoom);
            this.splitCtxLeft.drawImage(originalCanvas, x, y, imgWidth, imgHeight);
            this.splitCtxLeft.restore();
            
            // Bottom half (dithered) - rendered on right canvas with clipping and offset
            this.splitCtxRight.clearRect(0, 0, width, height);
            this.splitCtxRight.save();
            this.splitCtxRight.beginPath();
            this.splitCtxRight.rect(0, height / 2, width, height / 2);
            this.splitCtxRight.clip();
            this.splitCtxRight.translate(this.panX, this.panY);
            this.splitCtxRight.scale(this.zoom, this.zoom);
            this.splitCtxRight.drawImage(ditheredCanvas, x, y, imgWidth, imgHeight);
            this.splitCtxRight.restore();
        }
    }

    resetZoomPan() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        if (this.currentImage) {
            if (this.comparisonMode === 'split') {
                this.updateSplitView();
            } else {
                this.redrawCanvas();
            }
        }
    }

    redrawCanvas() {
        if (!this.currentImage || !this.ctx) return;
        
        // If we have comparison data, use the comparison display
        if (this.originalImageData && this.ditheredImageData) {
            this.updateComparisonDisplay(this.originalImageData, this.ditheredImageData);
            return;
        }
        
        // Otherwise, draw the original image
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context state
        this.ctx.save();
        
        // Apply transformations
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);
        
        // Calculate image position to center it initially
        const imgWidth = this.currentImage.width;
        const imgHeight = this.currentImage.height;
        const canvasWidth = this.canvas.width / this.zoom;
        const canvasHeight = this.canvas.height / this.zoom;
        
        const x = (canvasWidth - imgWidth) / 2;
        const y = (canvasHeight - imgHeight) / 2;
        
        // Draw image
        this.ctx.drawImage(this.currentImage, x, y, imgWidth, imgHeight);
        
        // Restore context state
        this.ctx.restore();
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight(element) {
        element.classList.add('drag-over');
    }

    unhighlight(element) {
        element.classList.remove('drag-over');
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFiles(files);
    }

    handleFileSelect(e) {
        const files = e.target.files;
        this.handleFiles(files);
    }

    handleFiles(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        
        if (!this.validateFile(file)) {
            this.showError('Please select a valid image file (PNG, JPEG, WebP, or GIF)');
            return;
        }

        this.loadImage(file);
    }

    validateFile(file) {
        return this.supportedFormats.includes(file.type);
    }

    loadImage(file) {
        if (this.logger) {
            this.logger.logInfo('ImageLoader', `Starting image load: ${file.name}`, {
                size: file.size,
                type: file.type
            });
        }
        
        const loadTimer = this.logger ? this.logger.startTimer(`Image Load: ${file.name}`) : null;
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                this.displayImage(img);
                this.showSuccess(`Loaded: ${file.name} (${img.width}x${img.height})`);
                
                // Get image data and dispatch event for dithering controls
                const imageData = this.getImageData();
                if (imageData) {
                    const event = new CustomEvent('imageLoaded', {
                        detail: imageData
                    });
                    document.dispatchEvent(event);
                }
                
                if (this.logger) {
                    this.logger.logImageLoaded(file.name, img.width, img.height, file.size);
                    if (loadTimer) loadTimer.end();
                }
            };
            img.onerror = () => {
                this.showError('Failed to load image. Please try a different file.');
                if (this.logger) {
                    this.logger.logFileError(file.name, 'Image decode failed');
                }
            };
            img.src = e.target.result;
        };

        reader.onerror = () => {
            this.showError('Failed to read file. Please try again.');
            if (this.logger) {
                this.logger.logFileError(file.name, 'FileReader error');
            }
        };

        reader.readAsDataURL(file);
    }

    displayImage(img) {
        // Hide upload placeholder
        const placeholder = document.querySelector('.upload-placeholder');
        placeholder.style.display = 'none';

        // Show canvas and controls
        this.canvas.style.display = 'block';
        this.controlsContainer.style.display = 'flex';
        
        // Show split view container for split mode
        const splitContainer = document.querySelector('.split-view-container');
        if (splitContainer) {
            splitContainer.style.display = this.comparisonMode === 'split' ? 'block' : 'none';
        }
        
        // Show/hide main canvas based on mode
        if (this.comparisonMode === 'split') {
            this.canvas.style.display = 'none';
        }
        
        // Add has-image class to preview area
        const previewArea = document.querySelector('.image-preview-area');
        previewArea.classList.add('has-image');
        
        // Set canvas size to fill the available space
        const containerWidth = previewArea.clientWidth - 40; // Account for padding
        const containerHeight = previewArea.clientHeight - 80; // Account for controls (no slider anymore)
        
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
        
        // Reset zoom and pan for new image
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        
        // Store original image data
        this.originalImageData = this.getImageData();
        
        // Draw the image using the new redraw system
        this.redrawCanvas();
        
        // Set cursor for interactivity
        this.canvas.style.cursor = 'grab';
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1000',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        if (type === 'error') {
            notification.style.backgroundColor = '#ef4444';
        } else if (type === 'success') {
            notification.style.backgroundColor = '#10b981';
        }

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    getCurrentImage() {
        return this.currentImage;
    }

    getImageData() {
        if (!this.currentImage || !this.canvas) return null;
        
        // Create a new canvas with original image dimensions
        const dataCanvas = document.createElement('canvas');
        const dataCtx = dataCanvas.getContext('2d');
        
        dataCanvas.width = this.currentImage.width;
        dataCanvas.height = this.currentImage.height;
        
        dataCtx.drawImage(this.currentImage, 0, 0);
        
        return dataCtx.getImageData(0, 0, this.currentImage.width, this.currentImage.height);
    }

    setComparisonMode(mode) {
        this.comparisonMode = mode;
        
        // Show/hide split view container
        const splitContainer = document.querySelector('.split-view-container');
        if (splitContainer) {
            splitContainer.style.display = mode === 'split' ? 'block' : 'none';
            
            // Ensure proper CSS class is set for split orientation
            if (mode === 'split') {
                splitContainer.classList.remove('horizontal', 'vertical');
                splitContainer.classList.add(this.splitOrientation);
            }
        }
        
        // Show/hide main canvas based on mode
        if (this.canvas) {
            this.canvas.style.display = mode === 'split' ? 'none' : 'block';
        }
        
        // Update display with new comparison mode
        if (this.originalImageData && this.ditheredImageData) {
            if (mode === 'split') {
                this.updateSplitView();
            } else {
                this.updateComparisonDisplay(this.originalImageData, this.ditheredImageData);
            }
        }
    }


    updateComparisonDisplay(originalData, ditheredData) {
        this.originalImageData = originalData;
        this.ditheredImageData = ditheredData;
        
        // Handle split view mode with dual canvas system
        if (this.comparisonMode === 'split') {
            this.updateSplitView();
            return;
        }
        
        if (!this.ctx || !originalData || !ditheredData) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        
        // Apply transformations
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);
        
        // Calculate image position
        const imgWidth = originalData.width;
        const imgHeight = originalData.height;
        const canvasWidth = this.canvas.width / this.zoom;
        const canvasHeight = this.canvas.height / this.zoom;
        const x = (canvasWidth - imgWidth) / 2;
        const y = (canvasHeight - imgHeight) / 2;
        
        // Create temporary canvases for each image
        const originalCanvas = document.createElement('canvas');
        const ditheredCanvas = document.createElement('canvas');
        originalCanvas.width = ditheredCanvas.width = imgWidth;
        originalCanvas.height = ditheredCanvas.height = imgHeight;
        
        const originalCtx = originalCanvas.getContext('2d');
        const ditheredCtx = ditheredCanvas.getContext('2d');
        
        originalCtx.putImageData(originalData, 0, 0);
        ditheredCtx.putImageData(ditheredData, 0, 0);
        
        switch (this.comparisonMode) {
            case 'split':
                // Split view now handled by separate dual canvas system
                this.updateSplitView();
                return; // Exit early since split view doesn't use main canvas
            case 'side-by-side':
                this.drawSideBySide(originalCanvas, ditheredCanvas, x, y, imgWidth, imgHeight);
                break;
            case 'original':
                this.ctx.drawImage(originalCanvas, x, y);
                break;
            case 'dithered':
                this.ctx.drawImage(ditheredCanvas, x, y);
                break;
        }
        
        this.ctx.restore();
        
        // Update handle position after rendering
        if (this.comparisonMode === 'split' && this.updateHandlePosition) {
            setTimeout(() => this.updateHandlePosition(), 10);
        }
    }


    drawSideBySide(originalCanvas, ditheredCanvas, x, y, width, height) {
        // Create dual viewport system - each half gets same zoom/pan
        const gap = 2;
        const viewportWidth = (this.canvas.width - gap) / 2;
        const viewportHeight = this.canvas.height;
        
        // Save current context state
        this.ctx.save();
        
        // Reset transformations to work in screen coordinates
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Left viewport (Original)
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, 0, viewportWidth, viewportHeight);
        this.ctx.clip();
        
        // Apply same transformations as main view but adjusted for left viewport
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);
        
        // Center image in left viewport
        const leftViewportCenterX = (viewportWidth / this.zoom) / 2;
        const leftViewportCenterY = (viewportHeight / this.zoom) / 2;
        const leftImageX = leftViewportCenterX - width / 2;
        const leftImageY = leftViewportCenterY - height / 2;
        
        this.ctx.drawImage(originalCanvas, leftImageX, leftImageY, width, height);
        
        // Add label for original
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(leftImageX, leftImageY, 60 / this.zoom, 20 / this.zoom);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `${12 / this.zoom}px Arial`;
        this.ctx.fillText('Original', leftImageX + 5 / this.zoom, leftImageY + 14 / this.zoom);
        
        this.ctx.restore();
        
        // Right viewport (Dithered)
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(viewportWidth + gap, 0, viewportWidth, viewportHeight);
        this.ctx.clip();
        
        // Apply same transformations but offset for right viewport
        this.ctx.translate(this.panX + viewportWidth + gap, this.panY);
        this.ctx.scale(this.zoom, this.zoom);
        
        // Center image in right viewport (same relative position as left)
        const rightViewportCenterX = (viewportWidth / this.zoom) / 2;
        const rightViewportCenterY = (viewportHeight / this.zoom) / 2;
        const rightImageX = rightViewportCenterX - width / 2;
        const rightImageY = rightViewportCenterY - height / 2;
        
        this.ctx.drawImage(ditheredCanvas, rightImageX, rightImageY, width, height);
        
        // Add label for dithered
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(rightImageX, rightImageY, 60 / this.zoom, 20 / this.zoom);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `${12 / this.zoom}px Arial`;
        this.ctx.fillText('Dithered', rightImageX + 5 / this.zoom, rightImageY + 14 / this.zoom);
        
        this.ctx.restore();
        
        // Draw dividing line
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = gap;
        this.ctx.beginPath();
        this.ctx.moveTo(viewportWidth, 0);
        this.ctx.lineTo(viewportWidth, viewportHeight);
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    resetViewport() {
        // Reset zoom and pan to fit-to-screen and center
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        
        // If there's an image loaded, redraw with reset viewport
        if (this.originalImageData && this.ditheredImageData) {
            this.updateComparisonDisplay(this.originalImageData, this.ditheredImageData);
        } else if (this.currentImage) {
            this.displayImage(this.currentImage);
        }
        
        if (this.logger) {
            this.logger.logUserAction('Viewport reset to original position and zoom');
        }
    }

    setSplitOrientation(orientation) {
        this.splitOrientation = orientation;
        
        // Update CSS class on split view container
        const splitContainer = document.querySelector('.split-view-container');
        if (splitContainer) {
            splitContainer.classList.remove('horizontal', 'vertical');
            splitContainer.classList.add(orientation);
        }
        
        // Redraw the comparison display with new orientation
        if (this.originalImageData && this.ditheredImageData) {
            this.updateComparisonDisplay(this.originalImageData, this.ditheredImageData);
        }
        
        if (this.logger) {
            this.logger.logUserAction('Split orientation changed', { orientation });
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.imageLoader = new ImageLoader();
});