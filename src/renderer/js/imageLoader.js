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
        
        this.init();
        
        // Initialize logging for development
        if (window.devLogger) {
            this.logger = window.devLogger;
            this.logger.logInfo('ImageLoader', 'ImageLoader initialized');
        }
    }

    init() {
        this.setupCanvas();
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
                // Calculate zoom center to maintain mouse position
                const zoomCenterX = (mouseX - this.panX) / this.zoom;
                const zoomCenterY = (mouseY - this.panY) / this.zoom;
                
                this.zoom = newZoom;
                
                // Adjust pan to keep zoom centered on mouse
                this.panX = mouseX - zoomCenterX * this.zoom;
                this.panY = mouseY - zoomCenterY * this.zoom;
                
                this.redrawCanvas();
                
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
        
        // Reset zoom and pan
        this.resetZoomPan();
        
        // Hide canvas and controls
        this.canvas.style.display = 'none';
        this.controlsContainer.style.display = 'none';
        
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

    resetZoomPan() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        if (this.currentImage) {
            this.redrawCanvas();
        }
    }

    redrawCanvas() {
        if (!this.currentImage || !this.ctx) return;
        
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
        
        // Add has-image class to preview area
        const previewArea = document.querySelector('.image-preview-area');
        previewArea.classList.add('has-image');
        
        // Set canvas size to fill the available space
        const containerWidth = previewArea.clientWidth - 40; // Account for padding
        const containerHeight = previewArea.clientHeight - 80; // Account for controls
        
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
        
        // Reset zoom and pan for new image
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.imageLoader = new ImageLoader();
});