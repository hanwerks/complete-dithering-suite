class DitheringControls {
    constructor() {
        this.originalImageData = null;
        this.currentImageData = null;
        this.isDithering = false;
        this.realtimeEnabled = true;
        this.debounceTimeout = null;
        this.debounceDelay = 150; // 150ms debounce delay for better performance
        this.isProcessing = false;
        this.processingQueue = 0;
        
        // Color adjustment state
        this.colorAdjustments = {
            grayscale: { hueOffset: 0, saturation: 0, brightness: 100 },
            palette: { hueShift: 0, saturation: 100, brightness: 100, contrast: 100 },
            hsv: { hueShift: 0, saturation: 100, brightness: 100 }
        };


        // Chromatic effects state
        this.chromaticEffects = {
            intensity: 0,
            redOffsetX: 0,
            redOffsetY: 0,
            greenOffsetX: 0,
            greenOffsetY: 0,
            blueOffsetX: 0,
            blueOffsetY: 0
        };

        // Optional basic image adjustments (debug feature)
        this.basicImageAdjustments = {
            enabled: false,
            brightness: 100,
            contrast: 100
        };
        
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
        this.updateColorModeUI();
        this.setupColorAdjustmentControls();
        this.setupGameBoySwatches();
        this.setupCGASwatches();
        this.setupRetroSwatches();
        this.setupEGASwatches();
        this.setupC64Swatches();
        this.setupNESSwatches();
        this.setupChromaticEffectsControls();
        this.setupBasicImageControls();
        
        // Initialize comparison mode
        this.setComparisonMode('split');
        
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
                this.onParameterChange();
                if (this.logger) {
                    this.logger.logUserAction('Algorithm changed', { algorithm: algorithmSelect.value });
                }
            });
        }

        // Threshold slider and input
        const thresholdSlider = document.getElementById('threshold-slider');
        const thresholdValue = document.getElementById('threshold-value');
        if (thresholdSlider && thresholdValue) {
            this.setupSliderInputPair(thresholdSlider, thresholdValue, (value) => parseInt(value));
        }

        // Error diffusion slider and input
        const errorDiffusionSlider = document.getElementById('error-diffusion-slider');
        const errorDiffusionValue = document.getElementById('error-diffusion-value');
        if (errorDiffusionSlider && errorDiffusionValue) {
            this.setupSliderInputPair(errorDiffusionSlider, errorDiffusionValue, (value) => parseFloat((value / 100).toFixed(1)), (value) => value * 100);
        }

        // Color mode selection
        const colorModeSelect = document.getElementById('color-mode-select');
        if (colorModeSelect) {
            colorModeSelect.addEventListener('change', () => {
                // Show immediate feedback
                this.showColorModeChangeIndicator();
                this.updateColorModeUI();
                this.onParameterChange();
                if (this.logger) {
                    this.logger.logUserAction('Color mode changed', { mode: colorModeSelect.value });
                }
            });
        }

        // Palette selection
        const paletteSelect = document.getElementById('palette-select');
        if (paletteSelect) {
            paletteSelect.addEventListener('change', () => {
                this.onParameterChange();
                if (this.logger) {
                    this.logger.logUserAction('Palette changed', { palette: paletteSelect.value });
                }
            });
        }

        // Color count slider and input
        const colorCountSlider = document.getElementById('color-count-slider');
        const colorCountValue = document.getElementById('color-count-value');
        if (colorCountSlider && colorCountValue) {
            this.setupSliderInputPair(colorCountSlider, colorCountValue, (value) => parseInt(value));
        }

        // Dither size slider and input
        const ditherSizeSlider = document.getElementById('dither-size-slider');
        const ditherSizeValue = document.getElementById('dither-size-value');
        if (ditherSizeSlider && ditherSizeValue) {
            this.setupSliderInputPair(ditherSizeSlider, ditherSizeValue, (value) => parseFloat((value / 100).toFixed(1)), (value) => value * 100);
        }

        // Real-time toggle
        const realtimeCheckbox = document.getElementById('realtime-checkbox');
        if (realtimeCheckbox) {
            realtimeCheckbox.addEventListener('change', (e) => {
                this.realtimeEnabled = e.target.checked;
                const applyBtn = document.getElementById('apply-dithering-btn');
                if (applyBtn) {
                    applyBtn.style.display = this.realtimeEnabled ? 'none' : 'block';
                }
                if (this.logger) {
                    this.logger.logUserAction('Real-time toggled', { enabled: this.realtimeEnabled });
                }
            });
        }

        // Comparison mode selector
        const comparisonMode = document.getElementById('comparison-mode');
        if (comparisonMode) {
            comparisonMode.addEventListener('change', (e) => {
                this.setComparisonMode(e.target.value);
            });
        }


        // Apply dithering button
        const applyBtn = document.getElementById('apply-dithering-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyDithering();
            });
        }

        // Reset buttons
        const resetBtn = document.getElementById('reset-image-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetToOriginal();
            });
        }

        // Reset Algorithm button
        const resetAlgorithmBtn = document.getElementById('reset-algorithm-btn');
        if (resetAlgorithmBtn) {
            resetAlgorithmBtn.addEventListener('click', () => {
                this.resetAlgorithmSettings();
            });
        }

        // Reset Colors buttons for each mode
        const resetGrayscaleColorsBtn = document.getElementById('reset-grayscale-colors-btn');
        if (resetGrayscaleColorsBtn) {
            resetGrayscaleColorsBtn.addEventListener('click', () => {
                this.resetColorAdjustments('grayscale');
            });
        }

        const resetRgbColorsBtn = document.getElementById('reset-rgb-colors-btn');
        if (resetRgbColorsBtn) {
            resetRgbColorsBtn.addEventListener('click', () => {
                this.resetColorAdjustments('rgb-channels');
            });
        }

        const resetHsvColorsBtn = document.getElementById('reset-hsv-colors-btn');
        if (resetHsvColorsBtn) {
            resetHsvColorsBtn.addEventListener('click', () => {
                this.resetColorAdjustments('hsv');
            });
        }

        // Reset View button
        const resetViewBtn = document.getElementById('reset-view-btn');
        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', () => {
                this.resetViewSettings();
            });
        }

        // Split orientation selector
        const splitOrientation = document.getElementById('split-orientation');
        if (splitOrientation) {
            splitOrientation.addEventListener('change', (e) => {
                this.setSplitOrientation(e.target.value);
            });
        }

        // Reset Chromatic button
        const resetChromaticBtn = document.getElementById('reset-chromatic-btn');
        if (resetChromaticBtn) {
            resetChromaticBtn.addEventListener('click', () => {
                this.resetChromaticEffects();
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

    setupColorAdjustmentControls() {
        // Grayscale adjustments
        const grayscaleHueSlider = document.getElementById('grayscale-hue-slider');
        const grayscaleHueValue = document.getElementById('grayscale-hue-value');
        if (grayscaleHueSlider && grayscaleHueValue) {
            this.setupSliderInputPair(grayscaleHueSlider, grayscaleHueValue, (value) => parseInt(value));
        }

        const grayscaleSaturationSlider = document.getElementById('grayscale-saturation-slider');
        const grayscaleSaturationValue = document.getElementById('grayscale-saturation-value');
        if (grayscaleSaturationSlider && grayscaleSaturationValue) {
            this.setupSliderInputPair(grayscaleSaturationSlider, grayscaleSaturationValue, (value) => parseInt(value));
        }

        const grayscaleBrightnessSlider = document.getElementById('grayscale-brightness-slider');
        const grayscaleBrightnessValue = document.getElementById('grayscale-brightness-value');
        if (grayscaleBrightnessSlider && grayscaleBrightnessValue) {
            this.setupSliderInputPair(grayscaleBrightnessSlider, grayscaleBrightnessValue, (value) => parseInt(value));
        }

        // Palette adjustments
        const paletteHueSlider = document.getElementById('palette-hue-slider');
        const paletteHueValue = document.getElementById('palette-hue-value');
        if (paletteHueSlider && paletteHueValue) {
            this.setupSliderInputPair(paletteHueSlider, paletteHueValue, (value) => parseInt(value));
        }

        const paletteSaturationSlider = document.getElementById('palette-saturation-slider');
        const paletteSaturationValue = document.getElementById('palette-saturation-value');
        if (paletteSaturationSlider && paletteSaturationValue) {
            this.setupSliderInputPair(paletteSaturationSlider, paletteSaturationValue, (value) => parseInt(value));
        }

        const paletteBrightnessSlider = document.getElementById('palette-brightness-slider');
        const paletteBrightnessValue = document.getElementById('palette-brightness-value');
        if (paletteBrightnessSlider && paletteBrightnessValue) {
            this.setupSliderInputPair(paletteBrightnessSlider, paletteBrightnessValue, (value) => parseInt(value));
        }

        const paletteContrastSlider = document.getElementById('palette-contrast-slider');
        const paletteContrastValue = document.getElementById('palette-contrast-value');
        if (paletteContrastSlider && paletteContrastValue) {
            this.setupSliderInputPair(paletteContrastSlider, paletteContrastValue, (value) => parseInt(value));
        }

        // RGB adjustments
        const rgbBrightnessSlider = document.getElementById('rgb-brightness-slider');
        const rgbBrightnessValue = document.getElementById('rgb-brightness-value');
        if (rgbBrightnessSlider && rgbBrightnessValue) {
            this.setupSliderInputPair(rgbBrightnessSlider, rgbBrightnessValue, (value) => parseInt(value));
        }

        const rgbContrastSlider = document.getElementById('rgb-contrast-slider');
        const rgbContrastValue = document.getElementById('rgb-contrast-value');
        if (rgbContrastSlider && rgbContrastValue) {
            this.setupSliderInputPair(rgbContrastSlider, rgbContrastValue, (value) => parseInt(value));
        }

        // HSV adjustments
        const hsvHueSlider = document.getElementById('hsv-hue-slider');
        const hsvHueValue = document.getElementById('hsv-hue-value');
        if (hsvHueSlider && hsvHueValue) {
            this.setupSliderInputPair(hsvHueSlider, hsvHueValue, (value) => parseInt(value));
        }

        const hsvSaturationSlider = document.getElementById('hsv-saturation-slider');
        const hsvSaturationValue = document.getElementById('hsv-saturation-value');
        if (hsvSaturationSlider && hsvSaturationValue) {
            this.setupSliderInputPair(hsvSaturationSlider, hsvSaturationValue, (value) => parseInt(value));
        }

        const hsvBrightnessSlider = document.getElementById('hsv-brightness-slider');
        const hsvBrightnessValue = document.getElementById('hsv-brightness-value');
        if (hsvBrightnessSlider && hsvBrightnessValue) {
            this.setupSliderInputPair(hsvBrightnessSlider, hsvBrightnessValue, (value) => parseInt(value));
        }

        // Reset adjustments button
        const resetAdjustmentsBtn = document.getElementById('reset-adjustments-btn');
        if (resetAdjustmentsBtn) {
            resetAdjustmentsBtn.addEventListener('click', () => {
                this.resetColorAdjustments();
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
        
        // Auto-apply dithering with current settings
        this.applyDithering();
        
        if (this.logger) {
            this.logger.logInfo('DitheringControls', 'Image loaded for dithering', {
                width: imageData.width,
                height: imageData.height
            });
        }
    }

    onParameterChange() {
        if (!this.realtimeEnabled || !this.originalImageData) return;
        
        // Increment processing queue
        this.processingQueue++;
        
        // Clear existing timeout
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        
        // Set new debounced timeout with queue management
        this.debounceTimeout = setTimeout(() => {
            // Only process if this is the latest request and not currently processing
            if (this.processingQueue > 0 && !this.isProcessing) {
                this.processingQueue = 0; // Reset queue
                requestAnimationFrame(() => {
                    this.applyDithering();
                });
            }
        }, this.debounceDelay);
    }

    setupSliderInputPair(slider, input, sliderToInput = (v) => v, inputToSlider = (v) => v) {
        let isDragging = false;
        let isInputFocused = false;
        
        const updateFromSlider = (e) => {
            const sliderValue = e.target.value;
            const inputValue = sliderToInput(sliderValue);
            input.value = inputValue;
            if (!isInputFocused) {
                this.onParameterChange();
            }
        };
        
        const updateFromInput = (e) => {
            const inputValue = parseFloat(e.target.value) || 0;
            const sliderValue = inputToSlider(inputValue);
            
            // Validate bounds
            const min = parseFloat(slider.min) || 0;
            const max = parseFloat(slider.max) || 100;
            const boundedSliderValue = Math.max(min, Math.min(max, sliderValue));
            
            slider.value = boundedSliderValue;
            input.value = sliderToInput(boundedSliderValue);
            
            // Only trigger parameter change on blur/enter, not during typing
            if (e.type === 'blur' || e.type === 'change' || e.key === 'Enter') {
                this.onParameterChange();
            }
        };
        
        // Standard input event for slider
        slider.addEventListener('input', updateFromSlider);
        
        // Enhanced input field events
        input.addEventListener('focus', () => {
            isInputFocused = true;
            input.classList.add('input-paused');
            input.select(); // Select all text for easy replacement
        });
        
        input.addEventListener('blur', (e) => {
            isInputFocused = false;
            input.classList.remove('input-paused');
            updateFromInput(e);
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur(); // Trigger blur which will call updateFromInput
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                input.blur();
                // Restore original value from slider
                input.value = sliderToInput(slider.value);
            }
        });
        
        // Remove the old input event that was causing live updates during typing
        input.addEventListener('change', updateFromInput);
        
        // Enhanced drag tracking
        slider.addEventListener('mousedown', (e) => {
            isDragging = true;
            slider.setPointerCapture && slider.setPointerCapture(e.pointerId);
        });
        
        slider.addEventListener('mousemove', (e) => {
            if (isDragging) {
                updateFromSlider(e);
            }
        });
        
        slider.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        // Touch events for mobile
        slider.addEventListener('touchstart', () => {
            isDragging = true;
        });
        
        slider.addEventListener('touchmove', updateFromSlider);
        
        slider.addEventListener('touchend', () => {
            isDragging = false;
        });
        
        // Global mouse events for when cursor goes outside slider
        document.addEventListener('mousemove', (e) => {
            if (isDragging && e.buttons === 1) {
                const rect = slider.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                const min = parseFloat(slider.min) || 0;
                const max = parseFloat(slider.max) || 100;
                const value = min + (percentage / 100) * (max - min);
                
                slider.value = value;
                const inputValue = sliderToInput(value);
                input.value = inputValue;
                this.onParameterChange();
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
            }
        });
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
        if (!this.originalImageData || !window.ditheringEngine || this.isDithering || this.isProcessing) {
            return;
        }

        try {
            this.isDithering = true;
            this.isProcessing = true;
            this.setProcessingState(true);

            // Get current settings
            const settings = this.getCurrentSettings();
            
            if (this.logger) {
                this.logger.logInfo('DitheringControls', 'Starting dithering process', settings);
            }

            // Apply dithering immediately without setTimeout for maximum responsiveness
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
                this.isProcessing = false;
                this.setProcessingState(false);
            }

        } catch (error) {
            this.isDithering = false;
            this.isProcessing = false;
            this.setProcessingState(false);
            if (this.logger) {
                this.logger.logError('DitheringControls', 'Dithering setup failed', error);
            }
            this.showError('Failed to start dithering: ' + error.message);
        }
    }

    resetToOriginal() {
        // Reset viewport zoom and pan only
        if (window.imageLoader) {
            window.imageLoader.resetViewport();
        }
        
        if (this.logger) {
            this.logger.logUserAction('Reset viewport to original');
        }
    }

    resetAlgorithmSettings() {
        // Reset algorithm parameters to defaults
        const algorithmSelect = document.getElementById('algorithm-select');
        const thresholdSlider = document.getElementById('threshold-slider');
        const thresholdValue = document.getElementById('threshold-value');
        const errorDiffusionSlider = document.getElementById('error-diffusion-slider');
        const errorDiffusionValue = document.getElementById('error-diffusion-value');
        const ditherSizeSlider = document.getElementById('dither-size-slider');
        const ditherSizeValue = document.getElementById('dither-size-value');
        const colorModeSelect = document.getElementById('color-mode-select');
        const colorCountSlider = document.getElementById('color-count-slider');
        const colorCountValue = document.getElementById('color-count-value');

        // Set default values
        if (algorithmSelect) algorithmSelect.value = 'floyd-steinberg';
        if (thresholdSlider) thresholdSlider.value = 128;
        if (thresholdValue) thresholdValue.value = 128;
        if (errorDiffusionSlider) errorDiffusionSlider.value = 100;
        if (errorDiffusionValue) errorDiffusionValue.value = 1.0;
        if (ditherSizeSlider) ditherSizeSlider.value = 100;
        if (ditherSizeValue) ditherSizeValue.value = 1.0;
        if (colorModeSelect) colorModeSelect.value = 'grayscale';
        if (colorCountSlider) colorCountSlider.value = 16;
        if (colorCountValue) colorCountValue.value = 16;

        // Update UI and apply changes
        this.updateColorModeUI();
        this.updateAlgorithmInfo();
        this.onParameterChange();

        if (this.logger) {
            this.logger.logUserAction('Algorithm settings reset to defaults');
        }
    }

    resetViewSettings() {
        // Reset view options to defaults
        const realtimeCheckbox = document.getElementById('realtime-checkbox');
        const comparisonMode = document.getElementById('comparison-mode');
        const splitOrientation = document.getElementById('split-orientation');

        if (realtimeCheckbox) {
            realtimeCheckbox.checked = true;
            this.realtimeEnabled = true;
            const applyBtn = document.getElementById('apply-dithering-btn');
            if (applyBtn) {
                applyBtn.style.display = 'none';
            }
        }
        
        if (comparisonMode) {
            comparisonMode.value = 'split';
            this.setComparisonMode('split');
        }
        
        if (splitOrientation) {
            splitOrientation.value = 'horizontal';
            this.setSplitOrientation('horizontal');
        }

        if (this.logger) {
            this.logger.logUserAction('View settings reset to defaults');
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
        const ditherSizeSlider = document.getElementById('dither-size-slider');
        const colorModeSelect = document.getElementById('color-mode-select');
        const paletteSelect = document.getElementById('palette-select');
        const colorCountSlider = document.getElementById('color-count-slider');
        
        const colorMode = colorModeSelect ? colorModeSelect.value : 'grayscale';
        let palette = null;
        
        // Get palette if in palette mode
        if (colorMode === 'palette' && paletteSelect) {
            const paletteType = paletteSelect.value;
            if (paletteType !== 'custom' && window.colorPalettes) {
                palette = window.colorPalettes.getPresetPalette(paletteType);
                
                // Apply color adjustments to the palette if any
                const colorAdjustments = this.getCurrentColorAdjustments();
                if (Object.keys(colorAdjustments).length > 0) {
                    palette = window.colorPalettes.adjustPalette(palette, colorAdjustments);
                }
            }
        }
        
        const settings = {
            algorithm: algorithmSelect ? algorithmSelect.value : 'floyd-steinberg',
            threshold: thresholdSlider ? parseInt(thresholdSlider.value) : 128,
            errorDiffusion: errorDiffusionSlider ? (errorDiffusionSlider.value / 100) : 1.0,
            ditherSize: ditherSizeSlider ? (ditherSizeSlider.value / 100) : 1.0,
            colorMode: colorMode,
            palette: palette,
            colorCount: colorCountSlider ? parseInt(colorCountSlider.value) : 16,
            colorAdjustments: this.getCurrentColorAdjustments(),
            chromaticEffects: this.getCurrentChromaticEffects()
        };

        // Only add basic image adjustments if enabled (debug feature)
        if (this.basicImageAdjustments.enabled) {
            settings.basicImageAdjustments = this.getCurrentBasicImageAdjustments();
        }

        return settings;
    }

    updateImageDisplay(imageData) {
        // Store the dithered image data for comparison
        this.currentImageData = imageData;
        
        // Update the display based on current comparison mode
        if (window.imageLoader) {
            window.imageLoader.updateComparisonDisplay(this.originalImageData, imageData);
        }
    }

    setComparisonMode(mode) {
        if (window.imageLoader) {
            window.imageLoader.setComparisonMode(mode);
            
            // Show/hide comparison slider based on mode
            const comparisonContainer = document.querySelector('.comparison-container');
            if (comparisonContainer) {
                comparisonContainer.style.display = mode === 'split' ? 'block' : 'none';
            }
            
            // Show/hide split orientation controls
            const splitOrientationControls = document.getElementById('split-orientation-controls');
            if (splitOrientationControls) {
                splitOrientationControls.style.display = mode === 'split' ? 'block' : 'none';
            }
        }
    }

    setSplitOrientation(orientation) {
        if (window.imageLoader) {
            window.imageLoader.setSplitOrientation(orientation);
        }
        
        if (this.logger) {
            this.logger.logUserAction('Split orientation changed', { orientation });
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

    showColorModeChangeIndicator() {
        let indicator = document.getElementById('color-mode-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'color-mode-indicator';
            indicator.className = 'color-mode-indicator';
            indicator.innerHTML = '🎨 Switching color mode...';
            
            Object.assign(indicator.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '10px 15px',
                backgroundColor: 'rgba(217, 119, 6, 0.9)',
                color: 'white',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                zIndex: '1000',
                transition: 'opacity 0.3s ease'
            });
            
            document.body.appendChild(indicator);
        }
        
        // Auto-hide after processing starts
        setTimeout(() => {
            if (indicator) {
                indicator.style.opacity = '0';
                setTimeout(() => {
                    if (indicator && indicator.parentNode) {
                        indicator.remove();
                    }
                }, 300);
            }
        }, 800);
    }

    updateColorModeUI() {
        const colorModeSelect = document.getElementById('color-mode-select');
        const paletteControls = document.getElementById('palette-controls');
        const colorCountControls = document.getElementById('color-count-controls');
        
        if (!colorModeSelect) return;
        
        const colorMode = colorModeSelect.value;
        
        // Show/hide palette controls based on color mode
        if (paletteControls) {
            paletteControls.style.display = colorMode === 'palette' ? 'block' : 'none';
        }
        
        if (colorCountControls) {
            colorCountControls.style.display = colorMode === 'palette' ? 'block' : 'none';
        }

        // Show/hide all palette swatches based on palette selection
        this.updateGameBoySwatchesVisibility();
        this.updateCGASwatchesVisibility();
        this.updateRetroSwatchesVisibility();
        this.updateEGASwatchesVisibility();
        this.updateC64SwatchesVisibility();
        this.updateNESSwatchesVisibility();

        // Show/hide color adjustment controls based on color mode
        const grayscaleAdjustments = document.getElementById('grayscale-adjustments');
        const paletteAdjustments = document.getElementById('palette-adjustments');
        const hsvAdjustments = document.getElementById('hsv-adjustments');

        // Hide all adjustment groups first
        if (grayscaleAdjustments) grayscaleAdjustments.style.display = 'none';
        if (paletteAdjustments) paletteAdjustments.style.display = 'none';
        if (hsvAdjustments) hsvAdjustments.style.display = 'none';

        // Show the appropriate adjustment group
        switch (colorMode) {
            case 'grayscale':
                if (grayscaleAdjustments) grayscaleAdjustments.style.display = 'block';
                break;
            case 'palette':
                if (paletteAdjustments) paletteAdjustments.style.display = 'block';
                break;
            case 'hsv':
                if (hsvAdjustments) hsvAdjustments.style.display = 'block';
                break;
        }
        
        if (this.logger) {
            this.logger.logInfo('DitheringControls', `Color mode UI updated: ${colorMode}`);
        }
    }

    resetColorAdjustments(specificMode = null) {
        const colorModeSelect = document.getElementById('color-mode-select');
        if (!colorModeSelect) return;
        
        const colorMode = specificMode || colorModeSelect.value;
        
        // Reset adjustments based on specified or current color mode
        switch (colorMode) {
            case 'grayscale':
                this.colorAdjustments.grayscale = { hueOffset: 0, saturation: 0, brightness: 100 };
                this.setAdjustmentValues('grayscale', this.colorAdjustments.grayscale);
                break;
            case 'palette':
                this.colorAdjustments.palette = { hueShift: 0, saturation: 100, brightness: 100, contrast: 100 };
                this.setAdjustmentValues('palette', this.colorAdjustments.palette);
                break;
            case 'rgb-channels':
                this.colorAdjustments.rgb = { hueShift: 0, saturation: 100, brightness: 100, contrast: 100 };
                this.setAdjustmentValues('rgb', this.colorAdjustments.rgb);
                break;
            case 'hsv':
                this.colorAdjustments.hsv = { hueShift: 0, saturation: 100, brightness: 100 };
                this.setAdjustmentValues('hsv', this.colorAdjustments.hsv);
                break;
        }
        
        // Trigger parameter change to update the display
        this.onParameterChange();
        
        if (this.logger) {
            this.logger.logUserAction('Color adjustments reset', { colorMode });
        }
    }

    setAdjustmentValues(mode, values) {
        // Set slider and input values based on the mode
        Object.keys(values).forEach(key => {
            const slider = document.getElementById(`${mode}-${key.toLowerCase()}-slider`);
            const input = document.getElementById(`${mode}-${key.toLowerCase()}-value`);
            
            if (slider && input) {
                slider.value = values[key];
                input.value = values[key];
            }
        });
    }

    getCurrentColorAdjustments() {
        const colorModeSelect = document.getElementById('color-mode-select');
        if (!colorModeSelect) return {};
        
        const colorMode = colorModeSelect.value;
        
        // Get current adjustment values from UI
        switch (colorMode) {
            case 'grayscale':
                return {
                    hueOffset: this.getSliderValue('grayscale-hue-slider', 0),
                    saturation: this.getSliderValue('grayscale-saturation-slider', 0),
                    brightness: this.getSliderValue('grayscale-brightness-slider', 100)
                };
            case 'palette':
                return {
                    hueShift: this.getSliderValue('palette-hue-slider', 0),
                    saturation: this.getSliderValue('palette-saturation-slider', 100),
                    brightness: this.getSliderValue('palette-brightness-slider', 100),
                    contrast: this.getSliderValue('palette-contrast-slider', 100)
                };
            case 'rgb-channels':
                return {
                    hueShift: this.getSliderValue('rgb-hue-slider', 0),
                    saturation: this.getSliderValue('rgb-saturation-slider', 100),
                    brightness: this.getSliderValue('rgb-brightness-slider', 100),
                    contrast: this.getSliderValue('rgb-contrast-slider', 100)
                };
            case 'hsv':
                return {
                    hueShift: this.getSliderValue('hsv-hue-slider', 0),
                    saturation: this.getSliderValue('hsv-saturation-slider', 100),
                    brightness: this.getSliderValue('hsv-brightness-slider', 100)
                };
            default:
                return {};
        }
    }

    getSliderValue(sliderId, defaultValue) {
        const slider = document.getElementById(sliderId);
        return slider ? parseInt(slider.value) : defaultValue;
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

    setupGameBoySwatches() {
        // Add event listeners to Game Boy color swatches
        for (let i = 0; i < 4; i++) {
            const swatch = document.getElementById(`gameboy-color-${i}`);
            if (swatch) {
                swatch.addEventListener('click', () => {
                    this.openColorPicker(i);
                });
            }
        }

        // Add palette change listener to update swatch visibility
        const paletteSelect = document.getElementById('palette-select');
        if (paletteSelect) {
            paletteSelect.addEventListener('change', () => {
                this.updateGameBoySwatchesVisibility();
            });
        }
    }

    updateGameBoySwatchesVisibility() {
        const colorModeSelect = document.getElementById('color-mode-select');
        const paletteSelect = document.getElementById('palette-select');
        const gameboySwatches = document.getElementById('gameboy-swatches');
        
        if (!colorModeSelect || !paletteSelect || !gameboySwatches) return;
        
        const isPaletteMode = colorModeSelect.value === 'palette';
        const isGameBoyPalette = paletteSelect.value === 'gameboy';
        
        gameboySwatches.style.display = (isPaletteMode && isGameBoyPalette) ? 'block' : 'none';
        
        // Update swatch colors to current Game Boy palette
        if (isPaletteMode && isGameBoyPalette) {
            this.updateSwatchColors();
        }
    }

    updateSwatchColors() {
        if (!window.colorPalettes) return;
        
        const gameboyPalette = window.colorPalettes.getPresetPalette('gameboy');
        if (gameboyPalette) {
            for (let i = 0; i < gameboyPalette.length; i++) {
                const swatch = document.getElementById(`gameboy-color-${i}`);
                if (swatch) {
                    const [r, g, b] = gameboyPalette[i];
                    swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
                }
            }
        }
    }

    openColorPicker(colorIndex) {
        // Create a temporary color input for color picking
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.style.position = 'absolute';
        colorInput.style.left = '-9999px';
        
        // Get current color from the Game Boy palette
        if (window.colorPalettes) {
            const gameboyPalette = window.colorPalettes.getPresetPalette('gameboy');
            if (gameboyPalette && gameboyPalette[colorIndex]) {
                const [r, g, b] = gameboyPalette[colorIndex];
                colorInput.value = this.rgbToHex(r, g, b);
            }
        }
        
        document.body.appendChild(colorInput);
        
        colorInput.addEventListener('change', (e) => {
            const newColor = this.hexToRgb(e.target.value);
            if (newColor) {
                this.updateGameBoyColor(colorIndex, newColor);
            }
            document.body.removeChild(colorInput);
        });
        
        colorInput.addEventListener('blur', () => {
            if (document.body.contains(colorInput)) {
                document.body.removeChild(colorInput);
            }
        });
        
        colorInput.click();
    }

    updateGameBoyColor(colorIndex, newColor) {
        if (!window.colorPalettes) return;
        
        // Update the Game Boy palette in colorPalettes
        const currentPalette = window.colorPalettes.getPresetPalette('gameboy');
        if (currentPalette) {
            currentPalette[colorIndex] = newColor;
            
            // Update the swatch display
            const swatch = document.getElementById(`gameboy-color-${colorIndex}`);
            if (swatch) {
                const [r, g, b] = newColor;
                swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            }
            
            // Trigger dithering update
            this.onParameterChange();
            
            if (this.logger) {
                this.logger.logUserAction('Game Boy color updated', { 
                    colorIndex, 
                    newColor: `rgb(${newColor[0]}, ${newColor[1]}, ${newColor[2]})` 
                });
            }
        }
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : null;
    }

    setupCGASwatches() {
        // Add event listeners to CGA color swatches
        for (let i = 0; i < 4; i++) {
            const swatch = document.getElementById(`cga-color-${i}`);
            if (swatch) {
                swatch.addEventListener('click', () => {
                    this.openCGAColorPicker(i);
                });
            }
        }

        // Add palette change listener to update swatch visibility
        const paletteSelect = document.getElementById('palette-select');
        if (paletteSelect) {
            paletteSelect.addEventListener('change', () => {
                this.updateCGASwatchesVisibility();
            });
        }
    }

    updateCGASwatchesVisibility() {
        const colorModeSelect = document.getElementById('color-mode-select');
        const paletteSelect = document.getElementById('palette-select');
        const cgaSwatches = document.getElementById('cga-swatches');
        
        if (!colorModeSelect || !paletteSelect || !cgaSwatches) return;
        
        const isPaletteMode = colorModeSelect.value === 'palette';
        const isCGAPalette = paletteSelect.value === 'cga';
        
        cgaSwatches.style.display = (isPaletteMode && isCGAPalette) ? 'block' : 'none';
        
        // Update swatch colors to current CGA palette
        if (isPaletteMode && isCGAPalette) {
            this.updateCGASwatchColors();
        }
    }

    updateCGASwatchColors() {
        if (!window.colorPalettes) return;
        
        const cgaPalette = window.colorPalettes.getPresetPalette('cga');
        if (cgaPalette) {
            for (let i = 0; i < cgaPalette.length; i++) {
                const swatch = document.getElementById(`cga-color-${i}`);
                if (swatch) {
                    const [r, g, b] = cgaPalette[i];
                    swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
                }
            }
        }
    }

    openCGAColorPicker(colorIndex) {
        // Create a temporary color input for color picking
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.style.position = 'absolute';
        colorInput.style.left = '-9999px';
        
        // Get current color from the CGA palette
        if (window.colorPalettes) {
            const cgaPalette = window.colorPalettes.getPresetPalette('cga');
            if (cgaPalette && cgaPalette[colorIndex]) {
                const [r, g, b] = cgaPalette[colorIndex];
                colorInput.value = this.rgbToHex(r, g, b);
            }
        }
        
        document.body.appendChild(colorInput);
        
        colorInput.addEventListener('change', (e) => {
            const newColor = this.hexToRgb(e.target.value);
            if (newColor) {
                this.updateCGAColor(colorIndex, newColor);
            }
            document.body.removeChild(colorInput);
        });
        
        colorInput.addEventListener('blur', () => {
            if (document.body.contains(colorInput)) {
                document.body.removeChild(colorInput);
            }
        });
        
        colorInput.click();
    }

    updateCGAColor(colorIndex, newColor) {
        if (!window.colorPalettes) return;
        
        // Update the CGA palette in colorPalettes
        const currentPalette = window.colorPalettes.getPresetPalette('cga');
        if (currentPalette) {
            currentPalette[colorIndex] = newColor;
            
            // Update the swatch display
            const swatch = document.getElementById(`cga-color-${colorIndex}`);
            if (swatch) {
                const [r, g, b] = newColor;
                swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            }
            
            // Trigger dithering update
            this.onParameterChange();
            
            if (this.logger) {
                this.logger.logUserAction('CGA color updated', { 
                    colorIndex, 
                    newColor: `rgb(${newColor[0]}, ${newColor[1]}, ${newColor[2]})` 
                });
            }
        }
    }

    // ============== RETRO PALETTE SWATCHES ==============
    setupRetroSwatches() {
        // Add event listeners to Retro color swatches
        for (let i = 0; i < 16; i++) {
            const swatch = document.getElementById(`retro-color-${i}`);
            if (swatch) {
                swatch.addEventListener('click', () => {
                    this.openRetroColorPicker(i);
                });
            }
        }

        const paletteSelect = document.getElementById('palette-select');
        if (paletteSelect) {
            paletteSelect.addEventListener('change', () => {
                this.updateRetroSwatchesVisibility();
            });
        }
    }

    updateRetroSwatchesVisibility() {
        const colorModeSelect = document.getElementById('color-mode-select');
        const paletteSelect = document.getElementById('palette-select');
        const retroSwatches = document.getElementById('retro-swatches');
        
        if (!colorModeSelect || !paletteSelect || !retroSwatches) return;
        
        const isPaletteMode = colorModeSelect.value === 'palette';
        const isRetroPalette = paletteSelect.value === 'retro';
        
        retroSwatches.style.display = (isPaletteMode && isRetroPalette) ? 'block' : 'none';
        
        if (isPaletteMode && isRetroPalette) {
            this.updateRetroSwatchColors();
        }
    }

    updateRetroSwatchColors() {
        if (!window.colorPalettes) return;
        
        const retroPalette = window.colorPalettes.getPresetPalette('retro');
        if (retroPalette) {
            for (let i = 0; i < retroPalette.length; i++) {
                const swatch = document.getElementById(`retro-color-${i}`);
                if (swatch) {
                    const [r, g, b] = retroPalette[i];
                    swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
                }
            }
        }
    }

    openRetroColorPicker(colorIndex) {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.style.position = 'absolute';
        colorInput.style.left = '-9999px';
        
        if (window.colorPalettes) {
            const retroPalette = window.colorPalettes.getPresetPalette('retro');
            if (retroPalette && retroPalette[colorIndex]) {
                const [r, g, b] = retroPalette[colorIndex];
                colorInput.value = this.rgbToHex(r, g, b);
            }
        }
        
        document.body.appendChild(colorInput);
        
        colorInput.addEventListener('change', (e) => {
            const newColor = this.hexToRgb(e.target.value);
            if (newColor) {
                this.updateRetroColor(colorIndex, newColor);
            }
            document.body.removeChild(colorInput);
        });
        
        colorInput.addEventListener('blur', () => {
            if (document.body.contains(colorInput)) {
                document.body.removeChild(colorInput);
            }
        });
        
        colorInput.click();
    }

    updateRetroColor(colorIndex, newColor) {
        if (!window.colorPalettes) return;
        
        const currentPalette = window.colorPalettes.getPresetPalette('retro');
        if (currentPalette) {
            currentPalette[colorIndex] = newColor;
            
            const swatch = document.getElementById(`retro-color-${colorIndex}`);
            if (swatch) {
                const [r, g, b] = newColor;
                swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            }
            
            this.onParameterChange();
            
            if (this.logger) {
                this.logger.logUserAction('Retro color updated', { 
                    colorIndex, 
                    newColor: `rgb(${newColor[0]}, ${newColor[1]}, ${newColor[2]})` 
                });
            }
        }
    }

    // ============== EGA PALETTE SWATCHES ==============
    setupEGASwatches() {
        for (let i = 0; i < 16; i++) {
            const swatch = document.getElementById(`ega-color-${i}`);
            if (swatch) {
                swatch.addEventListener('click', () => {
                    this.openEGAColorPicker(i);
                });
            }
        }

        const paletteSelect = document.getElementById('palette-select');
        if (paletteSelect) {
            paletteSelect.addEventListener('change', () => {
                this.updateEGASwatchesVisibility();
            });
        }
    }

    updateEGASwatchesVisibility() {
        const colorModeSelect = document.getElementById('color-mode-select');
        const paletteSelect = document.getElementById('palette-select');
        const egaSwatches = document.getElementById('ega-swatches');
        
        if (!colorModeSelect || !paletteSelect || !egaSwatches) return;
        
        const isPaletteMode = colorModeSelect.value === 'palette';
        const isEGAPalette = paletteSelect.value === 'ega';
        
        egaSwatches.style.display = (isPaletteMode && isEGAPalette) ? 'block' : 'none';
        
        if (isPaletteMode && isEGAPalette) {
            this.updateEGASwatchColors();
        }
    }

    updateEGASwatchColors() {
        if (!window.colorPalettes) return;
        
        const egaPalette = window.colorPalettes.getPresetPalette('ega');
        if (egaPalette) {
            for (let i = 0; i < egaPalette.length; i++) {
                const swatch = document.getElementById(`ega-color-${i}`);
                if (swatch) {
                    const [r, g, b] = egaPalette[i];
                    swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
                }
            }
        }
    }

    openEGAColorPicker(colorIndex) {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.style.position = 'absolute';
        colorInput.style.left = '-9999px';
        
        if (window.colorPalettes) {
            const egaPalette = window.colorPalettes.getPresetPalette('ega');
            if (egaPalette && egaPalette[colorIndex]) {
                const [r, g, b] = egaPalette[colorIndex];
                colorInput.value = this.rgbToHex(r, g, b);
            }
        }
        
        document.body.appendChild(colorInput);
        
        colorInput.addEventListener('change', (e) => {
            const newColor = this.hexToRgb(e.target.value);
            if (newColor) {
                this.updateEGAColor(colorIndex, newColor);
            }
            document.body.removeChild(colorInput);
        });
        
        colorInput.addEventListener('blur', () => {
            if (document.body.contains(colorInput)) {
                document.body.removeChild(colorInput);
            }
        });
        
        colorInput.click();
    }

    updateEGAColor(colorIndex, newColor) {
        if (!window.colorPalettes) return;
        
        const currentPalette = window.colorPalettes.getPresetPalette('ega');
        if (currentPalette) {
            currentPalette[colorIndex] = newColor;
            
            const swatch = document.getElementById(`ega-color-${colorIndex}`);
            if (swatch) {
                const [r, g, b] = newColor;
                swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            }
            
            this.onParameterChange();
            
            if (this.logger) {
                this.logger.logUserAction('EGA color updated', { 
                    colorIndex, 
                    newColor: `rgb(${newColor[0]}, ${newColor[1]}, ${newColor[2]})` 
                });
            }
        }
    }

    // ============== C64 PALETTE SWATCHES ==============
    setupC64Swatches() {
        for (let i = 0; i < 16; i++) {
            const swatch = document.getElementById(`c64-color-${i}`);
            if (swatch) {
                swatch.addEventListener('click', () => {
                    this.openC64ColorPicker(i);
                });
            }
        }

        const paletteSelect = document.getElementById('palette-select');
        if (paletteSelect) {
            paletteSelect.addEventListener('change', () => {
                this.updateC64SwatchesVisibility();
            });
        }
    }

    updateC64SwatchesVisibility() {
        const colorModeSelect = document.getElementById('color-mode-select');
        const paletteSelect = document.getElementById('palette-select');
        const c64Swatches = document.getElementById('c64-swatches');
        
        if (!colorModeSelect || !paletteSelect || !c64Swatches) return;
        
        const isPaletteMode = colorModeSelect.value === 'palette';
        const isC64Palette = paletteSelect.value === 'c64';
        
        c64Swatches.style.display = (isPaletteMode && isC64Palette) ? 'block' : 'none';
        
        if (isPaletteMode && isC64Palette) {
            this.updateC64SwatchColors();
        }
    }

    updateC64SwatchColors() {
        if (!window.colorPalettes) return;
        
        const c64Palette = window.colorPalettes.getPresetPalette('c64');
        if (c64Palette) {
            for (let i = 0; i < c64Palette.length; i++) {
                const swatch = document.getElementById(`c64-color-${i}`);
                if (swatch) {
                    const [r, g, b] = c64Palette[i];
                    swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
                }
            }
        }
    }

    openC64ColorPicker(colorIndex) {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.style.position = 'absolute';
        colorInput.style.left = '-9999px';
        
        if (window.colorPalettes) {
            const c64Palette = window.colorPalettes.getPresetPalette('c64');
            if (c64Palette && c64Palette[colorIndex]) {
                const [r, g, b] = c64Palette[colorIndex];
                colorInput.value = this.rgbToHex(r, g, b);
            }
        }
        
        document.body.appendChild(colorInput);
        
        colorInput.addEventListener('change', (e) => {
            const newColor = this.hexToRgb(e.target.value);
            if (newColor) {
                this.updateC64Color(colorIndex, newColor);
            }
            document.body.removeChild(colorInput);
        });
        
        colorInput.addEventListener('blur', () => {
            if (document.body.contains(colorInput)) {
                document.body.removeChild(colorInput);
            }
        });
        
        colorInput.click();
    }

    updateC64Color(colorIndex, newColor) {
        if (!window.colorPalettes) return;
        
        const currentPalette = window.colorPalettes.getPresetPalette('c64');
        if (currentPalette) {
            currentPalette[colorIndex] = newColor;
            
            const swatch = document.getElementById(`c64-color-${colorIndex}`);
            if (swatch) {
                const [r, g, b] = newColor;
                swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            }
            
            this.onParameterChange();
            
            if (this.logger) {
                this.logger.logUserAction('C64 color updated', { 
                    colorIndex, 
                    newColor: `rgb(${newColor[0]}, ${newColor[1]}, ${newColor[2]})` 
                });
            }
        }
    }

    // ============== NES PALETTE SWATCHES ==============
    setupNESSwatches() {
        for (let i = 0; i < 16; i++) {
            const swatch = document.getElementById(`nes-color-${i}`);
            if (swatch) {
                swatch.addEventListener('click', () => {
                    this.openNESColorPicker(i);
                });
            }
        }

        const paletteSelect = document.getElementById('palette-select');
        if (paletteSelect) {
            paletteSelect.addEventListener('change', () => {
                this.updateNESSwatchesVisibility();
            });
        }
    }

    updateNESSwatchesVisibility() {
        const colorModeSelect = document.getElementById('color-mode-select');
        const paletteSelect = document.getElementById('palette-select');
        const nesSwatches = document.getElementById('nes-swatches');
        
        if (!colorModeSelect || !paletteSelect || !nesSwatches) return;
        
        const isPaletteMode = colorModeSelect.value === 'palette';
        const isNESPalette = paletteSelect.value === 'nes';
        
        nesSwatches.style.display = (isPaletteMode && isNESPalette) ? 'block' : 'none';
        
        if (isPaletteMode && isNESPalette) {
            this.updateNESSwatchColors();
        }
    }

    updateNESSwatchColors() {
        if (!window.colorPalettes) return;
        
        const nesPalette = window.colorPalettes.getPresetPalette('nes');
        if (nesPalette) {
            for (let i = 0; i < nesPalette.length; i++) {
                const swatch = document.getElementById(`nes-color-${i}`);
                if (swatch) {
                    const [r, g, b] = nesPalette[i];
                    swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
                }
            }
        }
    }

    openNESColorPicker(colorIndex) {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.style.position = 'absolute';
        colorInput.style.left = '-9999px';
        
        if (window.colorPalettes) {
            const nesPalette = window.colorPalettes.getPresetPalette('nes');
            if (nesPalette && nesPalette[colorIndex]) {
                const [r, g, b] = nesPalette[colorIndex];
                colorInput.value = this.rgbToHex(r, g, b);
            }
        }
        
        document.body.appendChild(colorInput);
        
        colorInput.addEventListener('change', (e) => {
            const newColor = this.hexToRgb(e.target.value);
            if (newColor) {
                this.updateNESColor(colorIndex, newColor);
            }
            document.body.removeChild(colorInput);
        });
        
        colorInput.addEventListener('blur', () => {
            if (document.body.contains(colorInput)) {
                document.body.removeChild(colorInput);
            }
        });
        
        colorInput.click();
    }

    updateNESColor(colorIndex, newColor) {
        if (!window.colorPalettes) return;
        
        const currentPalette = window.colorPalettes.getPresetPalette('nes');
        if (currentPalette) {
            currentPalette[colorIndex] = newColor;
            
            const swatch = document.getElementById(`nes-color-${colorIndex}`);
            if (swatch) {
                const [r, g, b] = newColor;
                swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            }
            
            this.onParameterChange();
            
            if (this.logger) {
                this.logger.logUserAction('NES color updated', { 
                    colorIndex, 
                    newColor: `rgb(${newColor[0]}, ${newColor[1]}, ${newColor[2]})` 
                });
            }
        }
    }

    setupChromaticEffectsControls() {
        // Chromatic aberration intensity
        const intensitySlider = document.getElementById('chroma-intensity-slider');
        const intensityValue = document.getElementById('chroma-intensity-value');
        if (intensitySlider && intensityValue) {
            this.setupSliderInputPair(intensitySlider, intensityValue, (value) => parseInt(value));
        }

        // Red channel offsets
        const redXSlider = document.getElementById('chroma-red-x-slider');
        const redXValue = document.getElementById('chroma-red-x-value');
        if (redXSlider && redXValue) {
            this.setupSliderInputPair(redXSlider, redXValue, (value) => parseInt(value));
        }

        const redYSlider = document.getElementById('chroma-red-y-slider');
        const redYValue = document.getElementById('chroma-red-y-value');
        if (redYSlider && redYValue) {
            this.setupSliderInputPair(redYSlider, redYValue, (value) => parseInt(value));
        }

        // Green channel offsets
        const greenXSlider = document.getElementById('chroma-green-x-slider');
        const greenXValue = document.getElementById('chroma-green-x-value');
        if (greenXSlider && greenXValue) {
            this.setupSliderInputPair(greenXSlider, greenXValue, (value) => parseInt(value));
        }

        const greenYSlider = document.getElementById('chroma-green-y-slider');
        const greenYValue = document.getElementById('chroma-green-y-value');
        if (greenYSlider && greenYValue) {
            this.setupSliderInputPair(greenYSlider, greenYValue, (value) => parseInt(value));
        }

        // Blue channel offsets
        const blueXSlider = document.getElementById('chroma-blue-x-slider');
        const blueXValue = document.getElementById('chroma-blue-x-value');
        if (blueXSlider && blueXValue) {
            this.setupSliderInputPair(blueXSlider, blueXValue, (value) => parseInt(value));
        }

        const blueYSlider = document.getElementById('chroma-blue-y-slider');
        const blueYValue = document.getElementById('chroma-blue-y-value');
        if (blueYSlider && blueYValue) {
            this.setupSliderInputPair(blueYSlider, blueYValue, (value) => parseInt(value));
        }

        // Reset chromatic button
        const resetChromaticBtn = document.getElementById('reset-chromatic-btn');
        if (resetChromaticBtn) {
            resetChromaticBtn.addEventListener('click', () => {
                this.resetChromaticEffects();
            });
        }
    }

    resetChromaticEffects() {
        // Reset all chromatic effects to default values
        this.chromaticEffects = {
            intensity: 0,
            redOffsetX: 0,
            redOffsetY: 0,
            greenOffsetX: 0,
            greenOffsetY: 0,
            blueOffsetX: 0,
            blueOffsetY: 0
        };

        // Update UI elements
        const chromaticControls = [
            'chroma-intensity',
            'chroma-red-x',
            'chroma-red-y',
            'chroma-green-x',
            'chroma-green-y',
            'chroma-blue-x',
            'chroma-blue-y'
        ];

        chromaticControls.forEach(controlName => {
            const slider = document.getElementById(`${controlName}-slider`);
            const value = document.getElementById(`${controlName}-value`);
            
            if (slider && value) {
                slider.value = 0;
                value.value = 0;
            }
        });

        // Trigger dithering update
        this.onParameterChange();

        if (this.logger) {
            this.logger.logUserAction('Chromatic effects reset to defaults');
        }
    }

    getCurrentChromaticEffects() {
        return {
            intensity: this.getChromaticValue('chroma-intensity'),
            redOffsetX: this.getChromaticValue('chroma-red-x'),
            redOffsetY: this.getChromaticValue('chroma-red-y'),
            greenOffsetX: this.getChromaticValue('chroma-green-x'),
            greenOffsetY: this.getChromaticValue('chroma-green-y'),
            blueOffsetX: this.getChromaticValue('chroma-blue-x'),
            blueOffsetY: this.getChromaticValue('chroma-blue-y')
        };
    }

    getChromaticValue(controlName) {
        const slider = document.getElementById(`${controlName}-slider`);
        return slider ? parseInt(slider.value) : 0;
    }

    setupBasicImageControls() {
        // Enable/disable checkbox
        const enableCheckbox = document.getElementById('enable-basic-adjustments');
        const controlsContainer = document.getElementById('basic-adjustments-controls');
        
        if (enableCheckbox && controlsContainer) {
            enableCheckbox.addEventListener('change', () => {
                this.basicImageAdjustments.enabled = enableCheckbox.checked;
                controlsContainer.style.display = enableCheckbox.checked ? 'block' : 'none';
                this.onParameterChange();
                
                if (this.logger) {
                    this.logger.logUserAction('Basic image adjustments', { enabled: enableCheckbox.checked });
                }
            });
        }

        // Brightness control
        const brightnessSlider = document.getElementById('basic-brightness-slider');
        const brightnessValue = document.getElementById('basic-brightness-value');
        if (brightnessSlider && brightnessValue) {
            this.setupSliderInputPair(brightnessSlider, brightnessValue, (value) => parseInt(value));
        }

        // Contrast control
        const contrastSlider = document.getElementById('basic-contrast-slider');
        const contrastValue = document.getElementById('basic-contrast-value');
        if (contrastSlider && contrastValue) {
            this.setupSliderInputPair(contrastSlider, contrastValue, (value) => parseInt(value));
        }

        // Reset button
        const resetBtn = document.getElementById('reset-basic-image-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetBasicImageAdjustments();
            });
        }
    }

    getCurrentBasicImageAdjustments() {
        const brightness = document.getElementById('basic-brightness-slider')?.value || 100;
        const contrast = document.getElementById('basic-contrast-slider')?.value || 100;
        
        return {
            brightness: parseInt(brightness),
            contrast: parseInt(contrast)
        };
    }

    resetBasicImageAdjustments() {
        const brightnessSlider = document.getElementById('basic-brightness-slider');
        const brightnessValue = document.getElementById('basic-brightness-value');
        const contrastSlider = document.getElementById('basic-contrast-slider');
        const contrastValue = document.getElementById('basic-contrast-value');

        if (brightnessSlider && brightnessValue) {
            brightnessSlider.value = 100;
            brightnessValue.value = 100;
        }

        if (contrastSlider && contrastValue) {
            contrastSlider.value = 100;
            contrastValue.value = 100;
        }

        this.onParameterChange();

        if (this.logger) {
            this.logger.logUserAction('Basic image adjustments reset');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ditheringControls = new DitheringControls();
});