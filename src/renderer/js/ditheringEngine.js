class DitheringEngine {
    constructor() {
        this.algorithms = {
            'floyd-steinberg': this.floydSteinberg.bind(this),
            'jarvis-judice-ninke': this.jarvisJudiceNinke.bind(this),
            'atkinson': this.atkinson.bind(this)
        };
        
        // Initialize logging
        if (window.devLogger) {
            this.logger = window.devLogger;
            this.logger.logInfo('DitheringEngine', 'Dithering engine initialized');
        }
    }

    /**
     * Apply dithering to ImageData
     * @param {ImageData} imageData - Source image data
     * @param {Object} options - Dithering options
     * @returns {ImageData} - Dithered image data
     */
    dither(imageData, options = {}) {
        const {
            algorithm = 'floyd-steinberg',
            threshold = 128,
            errorDiffusion = 1.0,
            colorLevels = 2,
            convertToGrayscale = true
        } = options;

        if (this.logger) {
            this.logger.logImageProcessing(algorithm, options);
        }

        const timer = this.logger ? this.logger.startTimer(`${algorithm} dithering`) : null;

        try {
            // Clone the image data to avoid modifying the original
            const ditheredData = new ImageData(
                new Uint8ClampedArray(imageData.data),
                imageData.width,
                imageData.height
            );

            // Convert to grayscale if requested
            if (convertToGrayscale) {
                this.convertToGrayscale(ditheredData);
            }

            // Apply the selected algorithm
            if (this.algorithms[algorithm]) {
                this.algorithms[algorithm](ditheredData, {
                    threshold,
                    errorDiffusion,
                    colorLevels
                });
            } else {
                throw new Error(`Unknown algorithm: ${algorithm}`);
            }

            if (this.logger && timer) {
                const duration = timer.end();
                this.logger.logImageProcessed(algorithm, duration, ditheredData.data.length);
            }

            return ditheredData;

        } catch (error) {
            if (this.logger) {
                this.logger.logProcessingError(algorithm, error);
            }
            throw error;
        }
    }

    /**
     * Convert ImageData to grayscale
     * @param {ImageData} imageData - Image data to convert
     */
    convertToGrayscale(imageData) {
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            // Calculate luminance using standard weights
            const luminance = Math.round(
                0.299 * data[i] +     // Red
                0.587 * data[i + 1] + // Green  
                0.114 * data[i + 2]   // Blue
            );
            
            // Set RGB to luminance value
            data[i] = luminance;     // Red
            data[i + 1] = luminance; // Green
            data[i + 2] = luminance; // Blue
            // Alpha channel (i + 3) remains unchanged
        }
    }

    /**
     * Floyd-Steinberg dithering algorithm
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    floydSteinberg(imageData, options) {
        const { threshold = 128, errorDiffusion = 1.0 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Error diffusion matrix for Floyd-Steinberg
        // Current pixel: X
        // Errors distributed to: [X] [7/16]
        //                        [3/16] [5/16] [1/16]
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                // Work with the red channel (since we converted to grayscale, R=G=B)
                const oldPixel = data[idx];
                const newPixel = oldPixel < threshold ? 0 : 255;
                const error = (oldPixel - newPixel) * errorDiffusion;
                
                // Set the quantized pixel value
                data[idx] = newPixel;         // Red
                data[idx + 1] = newPixel;     // Green
                data[idx + 2] = newPixel;     // Blue
                // Alpha remains unchanged
                
                // Distribute error to neighboring pixels
                this.distributeError(data, width, height, x, y, error, [
                    { dx: 1, dy: 0, weight: 7/16 },   // Right
                    { dx: -1, dy: 1, weight: 3/16 },  // Bottom-left
                    { dx: 0, dy: 1, weight: 5/16 },   // Bottom
                    { dx: 1, dy: 1, weight: 1/16 }    // Bottom-right
                ]);
            }
        }
    }

    /**
     * Jarvis-Judice-Ninke dithering algorithm
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    jarvisJudiceNinke(imageData, options) {
        const { threshold = 128, errorDiffusion = 1.0 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // JJN error diffusion pattern
        // Current pixel: X
        // Errors distributed in a 3x3 pattern with specific weights
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldPixel = data[idx];
                const newPixel = oldPixel < threshold ? 0 : 255;
                const error = (oldPixel - newPixel) * errorDiffusion;
                
                data[idx] = newPixel;
                data[idx + 1] = newPixel;
                data[idx + 2] = newPixel;
                
                // JJN error distribution pattern
                this.distributeError(data, width, height, x, y, error, [
                    { dx: 1, dy: 0, weight: 7/48 },   // Right
                    { dx: 2, dy: 0, weight: 5/48 },   // Right+1
                    { dx: -2, dy: 1, weight: 3/48 },  // Bottom-left-1
                    { dx: -1, dy: 1, weight: 5/48 },  // Bottom-left
                    { dx: 0, dy: 1, weight: 7/48 },   // Bottom
                    { dx: 1, dy: 1, weight: 5/48 },   // Bottom-right
                    { dx: 2, dy: 1, weight: 3/48 },   // Bottom-right+1
                    { dx: -2, dy: 2, weight: 1/48 },  // Bottom-1-left-1
                    { dx: -1, dy: 2, weight: 3/48 },  // Bottom-1-left
                    { dx: 0, dy: 2, weight: 5/48 },   // Bottom-1
                    { dx: 1, dy: 2, weight: 3/48 },   // Bottom-1-right
                    { dx: 2, dy: 2, weight: 1/48 }    // Bottom-1-right+1
                ]);
            }
        }
    }

    /**
     * Atkinson dithering algorithm
     * @param {ImageData} imageData - Image data to dither  
     * @param {Object} options - Algorithm options
     */
    atkinson(imageData, options) {
        const { threshold = 128, errorDiffusion = 0.875 } = options; // Atkinson uses 7/8 error diffusion
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldPixel = data[idx];
                const newPixel = oldPixel < threshold ? 0 : 255;
                const error = (oldPixel - newPixel) * errorDiffusion;
                
                data[idx] = newPixel;
                data[idx + 1] = newPixel;
                data[idx + 2] = newPixel;
                
                // Atkinson error distribution (only uses 6 of 8 error fractions)
                this.distributeError(data, width, height, x, y, error, [
                    { dx: 1, dy: 0, weight: 1/8 },   // Right
                    { dx: 2, dy: 0, weight: 1/8 },   // Right+1
                    { dx: -1, dy: 1, weight: 1/8 },  // Bottom-left
                    { dx: 0, dy: 1, weight: 1/8 },   // Bottom
                    { dx: 1, dy: 1, weight: 1/8 },   // Bottom-right
                    { dx: 0, dy: 2, weight: 1/8 }    // Bottom-1
                ]);
            }
        }
    }

    /**
     * Distribute quantization error to neighboring pixels
     * @param {Uint8ClampedArray} data - Image data array
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} x - Current x position
     * @param {number} y - Current y position
     * @param {number} error - Quantization error
     * @param {Array} pattern - Error distribution pattern
     */
    distributeError(data, width, height, x, y, error, pattern) {
        for (const { dx, dy, weight } of pattern) {
            const nx = x + dx;
            const ny = y + dy;
            
            // Check bounds
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = (ny * width + nx) * 4;
                const errorAmount = error * weight;
                
                // Apply error to all color channels (they're the same in grayscale)
                data[nIdx] = Math.max(0, Math.min(255, data[nIdx] + errorAmount));
                data[nIdx + 1] = Math.max(0, Math.min(255, data[nIdx + 1] + errorAmount));
                data[nIdx + 2] = Math.max(0, Math.min(255, data[nIdx + 2] + errorAmount));
            }
        }
    }

    /**
     * Get list of available algorithms
     * @returns {Array} - Array of algorithm names
     */
    getAvailableAlgorithms() {
        return Object.keys(this.algorithms);
    }

    /**
     * Get algorithm information
     * @param {string} algorithm - Algorithm name
     * @returns {Object} - Algorithm metadata
     */
    getAlgorithmInfo(algorithm) {
        const info = {
            'floyd-steinberg': {
                name: 'Floyd-Steinberg',
                description: 'Classic error diffusion dithering with 4-pixel error distribution',
                errorPattern: '4 neighbors',
                quality: 'High',
                speed: 'Fast'
            },
            'jarvis-judice-ninke': {
                name: 'Jarvis-Judice-Ninke',
                description: 'More complex error diffusion with 12-pixel distribution',
                errorPattern: '12 neighbors',
                quality: 'Very High',
                speed: 'Medium'
            },
            'atkinson': {
                name: 'Atkinson',
                description: 'Apple\'s dithering algorithm, uses only 6/8 of error',
                errorPattern: '6 neighbors',
                quality: 'High',
                speed: 'Fast'
            }
        };
        
        return info[algorithm] || null;
    }
}

// Global dithering engine instance
window.ditheringEngine = new DitheringEngine();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DitheringEngine;
}