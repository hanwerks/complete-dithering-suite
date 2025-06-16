class DitheringControls {
    constructor() {
        this.originalImageData = null;
        this.currentImageData = null;
        this.isDithering = false;
        
        // Initialize logging
        if (window.devLogger) {
            this.logger = window.devLogger;
            this.logger.logInfo('DitheringControls', 'Dithering controls initialized');
        }
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateAlgorithmInfo();
        
        // Listen for image load events from imageLoader
        document.addEventListener('imageLoaded', (event) => {
            this.onImageLoaded(event.detail);
        });
    }

    setupEventListeners() {
        // Algorithm selection
        const algorithmSelect = document.getElementById('algorithm-select');
        if (algorithmSelect) {
            algorithmSelect.addEventListener('change', () => {
                this.updateAlgorithmInfo();
                if (this.logger) {
                    this.logger.logUserAction('Algorithm changed', { algorithm: algorithmSelect.value });
                }
            });
        }

        // Threshold slider
        const thresholdSlider = document.getElementById('threshold-slider');
        const thresholdValue = document.getElementById('threshold-value');
        if (thresholdSlider && thresholdValue) {
            thresholdSlider.addEventListener('input', (e) => {
                thresholdValue.textContent = e.target.value;
            });
        }

        // Error diffusion slider
        const errorDiffusionSlider = document.getElementById('error-diffusion-slider');
        const errorDiffusionValue = document.getElementById('error-diffusion-value');
        if (errorDiffusionSlider && errorDiffusionValue) {
            errorDiffusionSlider.addEventListener('input', (e) => {
                const value = (e.target.value / 100).toFixed(1);
                errorDiffusionValue.textContent = value;
            });
        }

        // Apply dithering button
        const applyBtn = document.getElementById('apply-dithering-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyDithering();
            });
        }

        // Reset button
        const resetBtn = document.getElementById('reset-image-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetToOriginal();
            });
        }

        // Export button
        const exportBtn = document.getElementById('export-image-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportImage();
            });
        }
    }

    updateAlgorithmInfo() {
        const algorithmSelect = document.getElementById('algorithm-select');
        const algorithmInfo = document.getElementById('algorithm-info');
        
        if (algorithmSelect && algorithmInfo && window.ditheringEngine) {
            const algorithm = algorithmSelect.value;
            const info = window.ditheringEngine.getAlgorithmInfo(algorithm);
            
            if (info) {
                algorithmInfo.innerHTML = `
                    <p><strong>${info.name}</strong></p>
                    <p>${info.description}</p>
                    <p>Quality: ${info.quality} | Speed: ${info.speed}</p>
                    <p>Error Pattern: ${info.errorPattern}</p>
                `;
            }
        }
    }

    onImageLoaded(imageData) {
        // Store the original image data
        this.originalImageData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
        this.currentImageData = this.originalImageData;
        
        // Enable controls
        this.enableControls(true);
        
        if (this.logger) {
            this.logger.logInfo('DitheringControls', 'Image loaded for dithering', {
                width: imageData.width,
                height: imageData.height
            });
        }
    }

    enableControls(enabled) {
        const controls = [
            'apply-dithering-btn',
            'reset-image-btn',
            'export-image-btn'
        ];
        
        controls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = !enabled;
            }
        });
    }

    async applyDithering() {
        if (!this.originalImageData || !window.ditheringEngine || this.isDithering) {
            return;
        }

        try {
            this.isDithering = true;
            this.setProcessingState(true);

            // Get current settings
            const settings = this.getCurrentSettings();
            
            if (this.logger) {
                this.logger.logInfo('DitheringControls', 'Starting dithering process', settings);
            }

            // Apply dithering (use setTimeout to allow UI to update)
            setTimeout(() => {
                try {
                    const ditheredData = window.ditheringEngine.dither(this.originalImageData, settings);
                    this.currentImageData = ditheredData;
                    
                    // Update the display
                    this.updateImageDisplay(ditheredData);
                    
                    if (this.logger) {
                        this.logger.logSuccess('DitheringControls', 'Dithering completed successfully');
                    }
                    
                } catch (error) {
                    if (this.logger) {
                        this.logger.logError('DitheringControls', 'Dithering failed', error);
                    }
                    this.showError('Dithering failed: ' + error.message);
                } finally {
                    this.isDithering = false;
                    this.setProcessingState(false);
                }
            }, 50);

        } catch (error) {
            this.isDithering = false;
            this.setProcessingState(false);
            if (this.logger) {
                this.logger.logError('DitheringControls', 'Dithering setup failed', error);
            }
            this.showError('Failed to start dithering: ' + error.message);
        }
    }

    resetToOriginal() {
        if (!this.originalImageData) return;
        
        this.currentImageData = this.originalImageData;
        this.updateImageDisplay(this.originalImageData);
        
        if (this.logger) {
            this.logger.logUserAction('Reset to original image');
        }
    }

    exportImage() {
        if (!this.currentImageData) return;
        
        try {
            // Create a temporary canvas to export the image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = this.currentImageData.width;
            canvas.height = this.currentImageData.height;
            
            ctx.putImageData(this.currentImageData, 0, 0);
            
            // Convert to blob and download
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dithered_image_${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                if (this.logger) {
                    this.logger.logSuccess('DitheringControls', 'Image exported successfully');
                }
            }, 'image/png');
            
        } catch (error) {
            if (this.logger) {
                this.logger.logError('DitheringControls', 'Export failed', error);
            }
            this.showError('Export failed: ' + error.message);
        }
    }

    getCurrentSettings() {
        const algorithmSelect = document.getElementById('algorithm-select');
        const thresholdSlider = document.getElementById('threshold-slider');
        const errorDiffusionSlider = document.getElementById('error-diffusion-slider');
        const grayscaleCheckbox = document.getElementById('grayscale-checkbox');
        
        return {
            algorithm: algorithmSelect ? algorithmSelect.value : 'floyd-steinberg',
            threshold: thresholdSlider ? parseInt(thresholdSlider.value) : 128,
            errorDiffusion: errorDiffusionSlider ? (errorDiffusionSlider.value / 100) : 1.0,
            convertToGrayscale: grayscaleCheckbox ? grayscaleCheckbox.checked : true
        };
    }

    updateImageDisplay(imageData) {
        // Get the image loader and update its display
        if (window.imageLoader && window.imageLoader.canvas) {
            const canvas = window.imageLoader.canvas;
            const ctx = canvas.getContext('2d');
            
            // Create a temporary canvas with the processed image
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = imageData.width;
            tempCanvas.height = imageData.height;
            tempCtx.putImageData(imageData, 0, 0);
            
            // Clear the main canvas and draw the processed image
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            
            // Apply current zoom and pan transformations
            ctx.translate(window.imageLoader.panX, window.imageLoader.panY);
            ctx.scale(window.imageLoader.zoom, window.imageLoader.zoom);
            
            // Calculate centering
            const canvasWidth = canvas.width / window.imageLoader.zoom;
            const canvasHeight = canvas.height / window.imageLoader.zoom;
            const x = (canvasWidth - imageData.width) / 2;
            const y = (canvasHeight - imageData.height) / 2;
            
            ctx.drawImage(tempCanvas, x, y);
            ctx.restore();
        }
    }

    setProcessingState(processing) {
        const applyBtn = document.getElementById('apply-dithering-btn');
        if (applyBtn) {
            applyBtn.disabled = processing;
            applyBtn.textContent = processing ? 'Processing...' : 'Apply Dithering';
        }
        
        // Show/hide loading indicator
        if (processing) {
            this.showProcessingIndicator();
        } else {
            this.hideProcessingIndicator();
        }
    }

    showProcessingIndicator() {
        let indicator = document.getElementById('processing-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'processing-indicator';
            indicator.className = 'processing-indicator';
            indicator.innerHTML = '⏳ Processing...';
            
            // Style the indicator
            Object.assign(indicator.style, {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                padding: '20px 30px',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                zIndex: '1000',
                textAlign: 'center'
            });
            
            document.body.appendChild(indicator);
        }
    }

    hideProcessingIndicator() {
        const indicator = document.getElementById('processing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    showError(message) {
        // Reuse the notification system from imageLoader if available
        if (window.imageLoader && window.imageLoader.showError) {
            window.imageLoader.showError(message);
        } else {
            console.error(message);
            alert(message); // Fallback
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ditheringControls = new DitheringControls();
});