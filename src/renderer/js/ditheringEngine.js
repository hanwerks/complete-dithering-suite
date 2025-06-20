class DitheringEngine {
    constructor() {
        this.algorithms = {
            'floyd-steinberg': this.floydSteinberg.bind(this),
            'jarvis-judice-ninke': this.jarvisJudiceNinke.bind(this),
            'atkinson': this.atkinson.bind(this),
            'sierra': this.sierra.bind(this),
            'burkes': this.burkes.bind(this),
            'sierra-2-4a': this.sierra2_4A.bind(this),
            'fan': this.fan.bind(this),
            'shiau-fan': this.shiauFan.bind(this),
            'ostromoukhov': this.ostromoukhov.bind(this),
            'bayer-2x2': this.bayer2x2.bind(this),
            'bayer-4x4': this.bayer4x4.bind(this),
            'bayer-8x8': this.bayer8x8.bind(this),
            'blue-noise': this.blueNoise.bind(this),
            'green-noise': this.greenNoise.bind(this),
            'riemersma': this.riemersma.bind(this),
            'dot-diffusion': this.dotDiffusion.bind(this),
            'variable-coefficient': this.variableCoefficient.bind(this),
            'void-cluster': this.voidCluster.bind(this)
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
            ditherSize = 1.0,
            colorLevels = 2,
            colorMode = 'grayscale',
            palette = null,
            colorCount = 16,
            colorAdjustments = {},
            chromaticEffects = {},
            basicImageAdjustments = null
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

            // Apply optional basic image adjustments (debug feature with safety checks)
            if (basicImageAdjustments && this.isBasicAdjustmentsNonNeutral(basicImageAdjustments)) {
                this.applyBasicImageAdjustments(ditheredData, basicImageAdjustments);
            }

            // Apply chromatic aberration effects before dithering
            if (chromaticEffects && chromaticEffects.intensity > 0) {
                this.applyChromaAberration(ditheredData, chromaticEffects);
            }

            // Process based on color mode
            switch (colorMode) {
                case 'grayscale':
                    this.convertToGrayscale(ditheredData, colorAdjustments);
                    this.algorithms[algorithm](ditheredData, { threshold, errorDiffusion, ditherSize, colorLevels });
                    // Apply color adjustments after dithering to preserve colors
                    this.applyGrayscaleColorAdjustments(ditheredData, colorAdjustments);
                    break;
                    
                case 'palette':
                    this.ditherWithPalette(ditheredData, algorithm, { threshold, errorDiffusion, ditherSize, palette, colorCount });
                    break;
                    
                case 'hsv':
                    this.ditherHSV(ditheredData, algorithm, { threshold, errorDiffusion, ditherSize, colorAdjustments });
                    break;
                    
                default:
                    throw new Error(`Unknown color mode: ${colorMode}`);
            }

            // Completely disable final HSV adjustments to debug black output issue
            // if (imageAdjustments && imageAdjustments.finalHSV && this.isHSVNonNeutral(imageAdjustments.finalHSV)) {
            //     this.applyFinalHSVAdjustments(ditheredData, imageAdjustments.finalHSV);
            // }

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
    convertToGrayscale(imageData, colorAdjustments = {}) {
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            // Calculate luminance using standard weights
            const luminance = Math.round(
                0.299 * data[i] +     // Red
                0.587 * data[i + 1] + // Green  
                0.114 * data[i + 2]   // Blue
            );
            
            // Just store luminance for now - color adjustments will be applied after dithering
            data[i] = luminance;     // Red
            data[i + 1] = luminance; // Green
            data[i + 2] = luminance; // Blue
            // Alpha channel (i + 3) remains unchanged
        }
    }

    /**
     * Apply color adjustments to grayscale dithered image
     * @param {ImageData} imageData - Dithered grayscale image data
     * @param {Object} colorAdjustments - Color adjustment parameters
     */
    applyGrayscaleColorAdjustments(imageData, colorAdjustments = {}) {
        if (Object.keys(colorAdjustments).length === 0 || !window.colorPalettes) {
            return; // No adjustments to apply
        }

        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            // Get the dithered luminance value (should be 0 or 255 after dithering)
            const luminance = data[i]; // R=G=B in grayscale
            
            // Apply color adjustments to create tinted version
            const adjustedColor = window.colorPalettes.createTintedGrayscale(luminance, colorAdjustments);
            
            data[i] = adjustedColor[0];     // Red
            data[i + 1] = adjustedColor[1]; // Green
            data[i + 2] = adjustedColor[2]; // Blue
            // Alpha channel (i + 3) remains unchanged
        }
    }

    /**
     * Floyd-Steinberg dithering algorithm
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    floydSteinberg(imageData, options) {
        const { threshold = 128, errorDiffusion = 1.0, ditherSize = 1.0 } = options;
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
                ], ditherSize);
            }
        }
    }

    /**
     * Jarvis-Judice-Ninke dithering algorithm
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    jarvisJudiceNinke(imageData, options) {
        const { threshold = 128, errorDiffusion = 1.0, ditherSize = 1.0 } = options;
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
                ], ditherSize);
            }
        }
    }

    /**
     * Atkinson dithering algorithm
     * @param {ImageData} imageData - Image data to dither  
     * @param {Object} options - Algorithm options
     */
    atkinson(imageData, options) {
        const { threshold = 128, errorDiffusion = 0.875, ditherSize = 1.0 } = options; // Atkinson uses 7/8 error diffusion
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
                ], ditherSize);
            }
        }
    }

    /**
     * Sierra dithering algorithm (3-line error diffusion)
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    sierra(imageData, options) {
        const { threshold = 128, errorDiffusion = 1.0, ditherSize = 1.0 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Sierra error diffusion pattern (3-line distribution)
        // Current pixel: X
        // Errors distributed to:  [X] [5/32] [3/32]
        //                   [2/32] [4/32] [5/32] [4/32] [2/32]
        //                         [2/32] [3/32] [2/32]
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldPixel = data[idx];
                const newPixel = oldPixel < threshold ? 0 : 255;
                const error = (oldPixel - newPixel) * errorDiffusion;
                
                data[idx] = newPixel;
                data[idx + 1] = newPixel;
                data[idx + 2] = newPixel;
                
                // Sierra error distribution pattern
                this.distributeError(data, width, height, x, y, error, [
                    { dx: 1, dy: 0, weight: 5/32 },   // Right
                    { dx: 2, dy: 0, weight: 3/32 },   // Right+1
                    { dx: -2, dy: 1, weight: 2/32 },  // Bottom-left-1
                    { dx: -1, dy: 1, weight: 4/32 },  // Bottom-left
                    { dx: 0, dy: 1, weight: 5/32 },   // Bottom
                    { dx: 1, dy: 1, weight: 4/32 },   // Bottom-right
                    { dx: 2, dy: 1, weight: 2/32 },   // Bottom-right+1
                    { dx: -1, dy: 2, weight: 2/32 },  // Bottom-1-left
                    { dx: 0, dy: 2, weight: 3/32 },   // Bottom-1
                    { dx: 1, dy: 2, weight: 2/32 }    // Bottom-1-right
                ], ditherSize);
            }
        }
    }

    /**
     * Burkes dithering algorithm (2-line error diffusion)
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    burkes(imageData, options) {
        const { threshold = 128, errorDiffusion = 1.0, ditherSize = 1.0 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Burkes error diffusion pattern (2-line distribution)
        // Current pixel: X
        // Errors distributed to:        [X] [8/32] [4/32]
        //                   [2/32] [4/32] [8/32] [4/32] [2/32]
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldPixel = data[idx];
                const newPixel = oldPixel < threshold ? 0 : 255;
                const error = (oldPixel - newPixel) * errorDiffusion;
                
                data[idx] = newPixel;
                data[idx + 1] = newPixel;
                data[idx + 2] = newPixel;
                
                // Burkes error distribution pattern
                this.distributeError(data, width, height, x, y, error, [
                    { dx: 1, dy: 0, weight: 8/32 },   // Right
                    { dx: 2, dy: 0, weight: 4/32 },   // Right+1
                    { dx: -2, dy: 1, weight: 2/32 },  // Bottom-left-1
                    { dx: -1, dy: 1, weight: 4/32 },  // Bottom-left
                    { dx: 0, dy: 1, weight: 8/32 },   // Bottom
                    { dx: 1, dy: 1, weight: 4/32 },   // Bottom-right
                    { dx: 2, dy: 1, weight: 2/32 }    // Bottom-right+1
                ], ditherSize);
            }
        }
    }

    /**
     * Sierra-2-4A dithering algorithm (optimized Sierra variant)
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    sierra2_4A(imageData, options) {
        const { threshold = 128, errorDiffusion = 1.0, ditherSize = 1.0 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Sierra-2-4A error diffusion pattern (simplified 2-line)
        // Current pixel: X
        // Errors distributed to:  [X] [2/4]
        //                      [1/4] [1/4]
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldPixel = data[idx];
                const newPixel = oldPixel < threshold ? 0 : 255;
                const error = (oldPixel - newPixel) * errorDiffusion;
                
                data[idx] = newPixel;
                data[idx + 1] = newPixel;
                data[idx + 2] = newPixel;
                
                // Sierra-2-4A error distribution pattern
                this.distributeError(data, width, height, x, y, error, [
                    { dx: 1, dy: 0, weight: 2/4 },   // Right
                    { dx: -1, dy: 1, weight: 1/4 },  // Bottom-left
                    { dx: 0, dy: 1, weight: 1/4 }    // Bottom
                ], ditherSize);
            }
        }
    }

    /**
     * Fan dithering algorithm (variable error diffusion)
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    fan(imageData, options) {
        const { threshold = 128, errorDiffusion = 1.0, ditherSize = 1.0 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Fan error diffusion pattern (variable coefficients)
        // Current pixel: X
        // Errors distributed to:  [X] [7/16]
        //                      [1/16] [5/16] [3/16]
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldPixel = data[idx];
                const newPixel = oldPixel < threshold ? 0 : 255;
                const error = (oldPixel - newPixel) * errorDiffusion;
                
                data[idx] = newPixel;
                data[idx + 1] = newPixel;
                data[idx + 2] = newPixel;
                
                // Fan error distribution pattern
                this.distributeError(data, width, height, x, y, error, [
                    { dx: 1, dy: 0, weight: 7/16 },   // Right
                    { dx: -1, dy: 1, weight: 1/16 },  // Bottom-left
                    { dx: 0, dy: 1, weight: 5/16 },   // Bottom
                    { dx: 1, dy: 1, weight: 3/16 }    // Bottom-right
                ], ditherSize);
            }
        }
    }

    /**
     * Shiau-Fan dithering algorithm (improved Fan)
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    shiauFan(imageData, options) {
        const { threshold = 128, errorDiffusion = 1.0, ditherSize = 1.0 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Shiau-Fan error diffusion pattern (optimized Fan variant)
        // Current pixel: X
        // Errors distributed to:  [X] [4/16]
        //                      [1/16] [8/16] [3/16]
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldPixel = data[idx];
                const newPixel = oldPixel < threshold ? 0 : 255;
                const error = (oldPixel - newPixel) * errorDiffusion;
                
                data[idx] = newPixel;
                data[idx + 1] = newPixel;
                data[idx + 2] = newPixel;
                
                // Shiau-Fan error distribution pattern
                this.distributeError(data, width, height, x, y, error, [
                    { dx: 1, dy: 0, weight: 4/16 },   // Right
                    { dx: -1, dy: 1, weight: 1/16 },  // Bottom-left
                    { dx: 0, dy: 1, weight: 8/16 },   // Bottom
                    { dx: 1, dy: 1, weight: 3/16 }    // Bottom-right
                ], ditherSize);
            }
        }
    }

    /**
     * Ostromoukhov variable coefficient dithering
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    ostromoukhov(imageData, options) {
        const { threshold = 128, errorDiffusion = 1.0, ditherSize = 1.0 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Ostromoukhov variable coefficient pattern
        // Coefficients vary based on pixel intensity for optimal distribution
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldPixel = data[idx];
                const newPixel = oldPixel < threshold ? 0 : 255;
                const error = (oldPixel - newPixel) * errorDiffusion;
                
                data[idx] = newPixel;
                data[idx + 1] = newPixel;
                data[idx + 2] = newPixel;
                
                // Variable coefficients based on pixel intensity
                const intensity = oldPixel / 255;
                const a = 13 * intensity + 0;
                const b = 13 * (1 - intensity) + 0;
                const c = 13;
                const total = a + b + c;
                
                // Ostromoukhov error distribution with variable coefficients
                this.distributeError(data, width, height, x, y, error, [
                    { dx: 1, dy: 0, weight: a/total },   // Right
                    { dx: -1, dy: 1, weight: b/total },  // Bottom-left
                    { dx: 0, dy: 1, weight: c/total }    // Bottom
                ], ditherSize);
            }
        }
    }

    /**
     * Bayer 2x2 ordered dithering
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    bayer2x2(imageData, options) {
        const { threshold = 128 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // 2x2 Bayer matrix
        const bayerMatrix = [
            [0, 2],
            [3, 1]
        ];
        const matrixSize = 2;
        const scale = 255 / (matrixSize * matrixSize);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldPixel = data[idx];
                const bayerValue = bayerMatrix[y % matrixSize][x % matrixSize] * scale;
                const newPixel = oldPixel > (threshold + bayerValue - 127.5) ? 255 : 0;
                
                data[idx] = newPixel;
                data[idx + 1] = newPixel;
                data[idx + 2] = newPixel;
            }
        }
    }

    /**
     * Bayer 4x4 ordered dithering
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    bayer4x4(imageData, options) {
        const { threshold = 128 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // 4x4 Bayer matrix
        const bayerMatrix = [
            [ 0,  8,  2, 10],
            [12,  4, 14,  6],
            [ 3, 11,  1,  9],
            [15,  7, 13,  5]
        ];
        const matrixSize = 4;
        const scale = 255 / (matrixSize * matrixSize);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldPixel = data[idx];
                const bayerValue = bayerMatrix[y % matrixSize][x % matrixSize] * scale;
                const newPixel = oldPixel > (threshold + bayerValue - 127.5) ? 255 : 0;
                
                data[idx] = newPixel;
                data[idx + 1] = newPixel;
                data[idx + 2] = newPixel;
            }
        }
    }

    /**
     * Bayer 8x8 ordered dithering
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    bayer8x8(imageData, options) {
        const { threshold = 128 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // 8x8 Bayer matrix
        const bayerMatrix = [
            [ 0, 32,  8, 40,  2, 34, 10, 42],
            [48, 16, 56, 24, 50, 18, 58, 26],
            [12, 44,  4, 36, 14, 46,  6, 38],
            [60, 28, 52, 20, 62, 30, 54, 22],
            [ 3, 35, 11, 43,  1, 33,  9, 41],
            [51, 19, 59, 27, 49, 17, 57, 25],
            [15, 47,  7, 39, 13, 45,  5, 37],
            [63, 31, 55, 23, 61, 29, 53, 21]
        ];
        const matrixSize = 8;
        const scale = 255 / (matrixSize * matrixSize);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldPixel = data[idx];
                const bayerValue = bayerMatrix[y % matrixSize][x % matrixSize] * scale;
                const newPixel = oldPixel > (threshold + bayerValue - 127.5) ? 255 : 0;
                
                data[idx] = newPixel;
                data[idx + 1] = newPixel;
                data[idx + 2] = newPixel;
            }
        }
    }

    /**
     * Blue Noise ordered dithering (perceptually optimized)
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    blueNoise(imageData, options) {
        const { threshold = 128 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Blue noise matrix (64x64 precomputed for high quality)
        // Simplified 8x8 approximation for performance
        const blueNoiseMatrix = [
            [32, 8, 40, 16, 34, 10, 42, 18],
            [0, 48, 24, 56, 2, 50, 26, 58],
            [44, 20, 36, 4, 46, 22, 38, 6],
            [12, 60, 28, 52, 14, 62, 30, 54],
            [35, 11, 43, 19, 33, 9, 41, 17],
            [3, 51, 27, 59, 1, 49, 25, 57],
            [47, 23, 39, 7, 45, 21, 37, 5],
            [15, 63, 31, 55, 13, 61, 29, 53]
        ];
        const matrixSize = 8;
        const scale = 255 / (matrixSize * matrixSize);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldPixel = data[idx];
                // Add random offset to blue noise for better distribution
                const noiseValue = blueNoiseMatrix[y % matrixSize][x % matrixSize] * scale;
                const randomOffset = (Math.random() - 0.5) * 32;
                const newPixel = oldPixel > (threshold + noiseValue + randomOffset - 127.5) ? 255 : 0;
                
                data[idx] = newPixel;
                data[idx + 1] = newPixel;
                data[idx + 2] = newPixel;
            }
        }
    }

    /**
     * Green Noise ordered dithering (alternative noise characteristics)
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    greenNoise(imageData, options) {
        const { threshold = 128 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Green noise matrix (different frequency characteristics than blue noise)
        const greenNoiseMatrix = [
            [16, 48, 12, 44, 18, 50, 14, 46],
            [32, 0, 28, 60, 34, 2, 30, 62],
            [8, 40, 4, 36, 10, 42, 6, 38],
            [24, 56, 20, 52, 26, 58, 22, 54],
            [17, 49, 13, 45, 19, 51, 15, 47],
            [33, 1, 29, 61, 35, 3, 31, 63],
            [9, 41, 5, 37, 11, 43, 7, 39],
            [25, 57, 21, 53, 27, 59, 23, 55]
        ];
        const matrixSize = 8;
        const scale = 255 / (matrixSize * matrixSize);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldPixel = data[idx];
                const noiseValue = greenNoiseMatrix[y % matrixSize][x % matrixSize] * scale;
                const newPixel = oldPixel > (threshold + noiseValue - 127.5) ? 255 : 0;
                
                data[idx] = newPixel;
                data[idx + 1] = newPixel;
                data[idx + 2] = newPixel;
            }
        }
    }

    /**
     * Riemersma spatial dithering (Hilbert curve space-filling)
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    riemersma(imageData, options) {
        const { threshold = 128, errorDiffusion = 1.0 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Simplified Riemersma using spiral pattern (approximation of Hilbert curve)
        const visited = new Array(width * height).fill(false);
        let error = 0;
        const weights = [1/16, 3/16, 5/16, 7/16]; // Error decay weights

        // Generate spiral traversal pattern
        const points = this.generateSpiralPattern(width, height);
        
        for (let i = 0; i < points.length; i++) {
            const [x, y] = points[i];
            const idx = (y * width + x) * 4;
            
            if (!visited[y * width + x]) {
                visited[y * width + x] = true;
                
                const oldPixel = data[idx] + error;
                const newPixel = oldPixel < threshold ? 0 : 255;
                error = (oldPixel - newPixel) * errorDiffusion;
                
                data[idx] = newPixel;
                data[idx + 1] = newPixel;
                data[idx + 2] = newPixel;
                
                // Apply error decay
                error *= 0.9;
            }
        }
    }

    /**
     * Dot Diffusion spatial algorithm (halftone printing simulation)
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    dotDiffusion(imageData, options) {
        const { threshold = 128, errorDiffusion = 1.0 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Dot diffusion pattern (simulates halftone dots)
        const dotPattern = [
            [0, 0, 0, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [0, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 1, 1, 0, 0, 0]
        ];
        const patternSize = 8;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldPixel = data[idx];
                const patternValue = dotPattern[y % patternSize][x % patternSize];
                const adjustedThreshold = threshold + (patternValue * 64 - 32);
                const newPixel = oldPixel > adjustedThreshold ? 255 : 0;
                
                data[idx] = newPixel;
                data[idx + 1] = newPixel;
                data[idx + 2] = newPixel;
                
                // Simple error diffusion to nearby pixels
                if (x < width - 1) {
                    const error = (oldPixel - newPixel) * errorDiffusion * 0.5;
                    const nextIdx = (y * width + (x + 1)) * 4;
                    data[nextIdx] = Math.max(0, Math.min(255, data[nextIdx] + error));
                }
            }
        }
    }

    /**
     * Variable Coefficient experimental algorithm
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    variableCoefficient(imageData, options) {
        const { threshold = 128, errorDiffusion = 1.0, ditherSize = 1.0 } = options;
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
                
                // Variable coefficients based on local image characteristics
                const localVariance = this.calculateLocalVariance(data, width, height, x, y);
                const adaptiveFactor = Math.max(0.1, Math.min(1.0, localVariance / 50));
                
                // Adaptive error distribution
                this.distributeError(data, width, height, x, y, error, [
                    { dx: 1, dy: 0, weight: (7/16) * adaptiveFactor },
                    { dx: -1, dy: 1, weight: (3/16) * adaptiveFactor },
                    { dx: 0, dy: 1, weight: (5/16) * adaptiveFactor },
                    { dx: 1, dy: 1, weight: (1/16) * adaptiveFactor }
                ], ditherSize);
            }
        }
    }

    /**
     * Void-and-Cluster experimental algorithm
     * @param {ImageData} imageData - Image data to dither
     * @param {Object} options - Algorithm options
     */
    voidCluster(imageData, options) {
        const { threshold = 128 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Void-and-cluster pattern generation
        const clusterSize = 4;
        
        for (let y = 0; y < height; y += clusterSize) {
            for (let x = 0; x < width; x += clusterSize) {
                // Calculate average intensity in cluster
                let avgIntensity = 0;
                let pixelCount = 0;
                
                for (let cy = y; cy < Math.min(y + clusterSize, height); cy++) {
                    for (let cx = x; cx < Math.min(x + clusterSize, width); cx++) {
                        const idx = (cy * width + cx) * 4;
                        avgIntensity += data[idx];
                        pixelCount++;
                    }
                }
                avgIntensity /= pixelCount;
                
                // Apply void-and-cluster logic
                const shouldFill = avgIntensity > threshold;
                const clusterPattern = this.generateClusterPattern(clusterSize, avgIntensity / 255);
                
                for (let cy = y; cy < Math.min(y + clusterSize, height); cy++) {
                    for (let cx = x; cx < Math.min(x + clusterSize, width); cx++) {
                        const idx = (cy * width + cx) * 4;
                        const patternValue = clusterPattern[(cy - y)][(cx - x)];
                        const newPixel = (shouldFill && patternValue) ? 255 : 0;
                        
                        data[idx] = newPixel;
                        data[idx + 1] = newPixel;
                        data[idx + 2] = newPixel;
                    }
                }
            }
        }
    }

    /**
     * Helper method: Generate spiral pattern for Riemersma
     */
    generateSpiralPattern(width, height) {
        const points = [];
        let x = 0, y = 0;
        let dx = 1, dy = 0;
        
        for (let i = 0; i < width * height; i++) {
            if (x >= 0 && x < width && y >= 0 && y < height) {
                points.push([x, y]);
            }
            
            // Spiral logic (simplified)
            const nextX = x + dx;
            const nextY = y + dy;
            
            if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) {
                // Turn right
                const newDx = -dy;
                const newDy = dx;
                dx = newDx;
                dy = newDy;
            }
            
            x += dx;
            y += dy;
        }
        
        return points;
    }

    /**
     * Helper method: Calculate local variance for adaptive algorithms
     */
    calculateLocalVariance(data, width, height, centerX, centerY) {
        const radius = 2;
        let sum = 0;
        let sumSquares = 0;
        let count = 0;
        
        for (let y = Math.max(0, centerY - radius); y <= Math.min(height - 1, centerY + radius); y++) {
            for (let x = Math.max(0, centerX - radius); x <= Math.min(width - 1, centerX + radius); x++) {
                const idx = (y * width + x) * 4;
                const value = data[idx];
                sum += value;
                sumSquares += value * value;
                count++;
            }
        }
        
        const mean = sum / count;
        const variance = (sumSquares / count) - (mean * mean);
        return variance;
    }

    /**
     * Helper method: Generate cluster pattern for void-and-cluster
     */
    generateClusterPattern(size, intensity) {
        const pattern = Array(size).fill().map(() => Array(size).fill(false));
        const pixelsToFill = Math.round(intensity * size * size);
        
        // Simple cluster generation (center-out)
        const center = Math.floor(size / 2);
        let filled = 0;
        
        for (let radius = 0; radius < size && filled < pixelsToFill; radius++) {
            for (let y = Math.max(0, center - radius); y <= Math.min(size - 1, center + radius) && filled < pixelsToFill; y++) {
                for (let x = Math.max(0, center - radius); x <= Math.min(size - 1, center + radius) && filled < pixelsToFill; x++) {
                    if (!pattern[y][x]) {
                        pattern[y][x] = true;
                        filled++;
                    }
                }
            }
        }
        
        return pattern;
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
     * @param {number} ditherSize - Scale factor for error distribution distance
     */
    distributeError(data, width, height, x, y, error, pattern, ditherSize = 1.0) {
        for (const { dx, dy, weight } of pattern) {
            // Scale the error distribution distances
            const nx = x + Math.round(dx * ditherSize);
            const ny = y + Math.round(dy * ditherSize);
            
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
     * Dither RGB channels independently
     * @param {ImageData} imageData - Image data to dither
     * @param {string} algorithm - Algorithm to use
     * @param {Object} options - Dithering options
     */
    ditherRGBChannels(imageData, algorithm, options) {
        const { threshold = 128, errorDiffusion = 1.0, ditherSize = 1.0, colorAdjustments = {} } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Create separate error buffers for each channel
        const errorBuffers = {
            r: new Float32Array(width * height),
            g: new Float32Array(width * height),
            b: new Float32Array(width * height)
        };

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const pixelIdx = y * width + x;
                
                // Process each channel independently
                ['r', 'g', 'b'].forEach((channel, channelIdx) => {
                    const oldPixel = data[idx + channelIdx] + errorBuffers[channel][pixelIdx];
                    const newPixel = oldPixel < threshold ? 0 : 255;
                    const error = (oldPixel - newPixel) * errorDiffusion;
                    
                    data[idx + channelIdx] = newPixel;
                    
                    // Distribute error using the selected algorithm pattern
                    this.distributeChannelError(errorBuffers[channel], width, height, x, y, error, algorithm, ditherSize);
                });
            }
        }

        // Apply color adjustments if present
        if (Object.keys(colorAdjustments).length > 0 && window.colorPalettes) {
            for (let i = 0; i < data.length; i += 4) {
                const adjustedColor = window.colorPalettes.adjustColor([data[i], data[i + 1], data[i + 2]], colorAdjustments);
                data[i] = adjustedColor[0];     // Red
                data[i + 1] = adjustedColor[1]; // Green
                data[i + 2] = adjustedColor[2]; // Blue
                // Alpha channel (i + 3) remains unchanged
            }
        }
    }

    /**
     * Dither using color palette
     * @param {ImageData} imageData - Image data to dither
     * @param {string} algorithm - Algorithm to use
     * @param {Object} options - Dithering options
     */
    ditherWithPalette(imageData, algorithm, options) {
        const { threshold = 128, errorDiffusion = 1.0, ditherSize = 1.0, palette, colorCount = 16 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Get or generate palette
        let targetPalette = palette;
        if (!targetPalette) {
            if (window.colorPalettes) {
                targetPalette = window.colorPalettes.generatePaletteFromImage(imageData, colorCount);
            } else {
                // Fallback to simple grayscale palette
                targetPalette = this.generateGrayscalePalette(colorCount);
            }
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const oldColor = [data[idx], data[idx + 1], data[idx + 2]];
                const newColor = this.findNearestPaletteColor(oldColor, targetPalette);
                const error = [
                    (oldColor[0] - newColor[0]) * errorDiffusion,
                    (oldColor[1] - newColor[1]) * errorDiffusion,
                    (oldColor[2] - newColor[2]) * errorDiffusion
                ];
                
                data[idx] = newColor[0];
                data[idx + 1] = newColor[1];
                data[idx + 2] = newColor[2];
                
                // Distribute color error
                this.distributeColorError(data, width, height, x, y, error, algorithm, ditherSize);
            }
        }
    }

    /**
     * Dither in HSV color space
     * @param {ImageData} imageData - Image data to dither
     * @param {string} algorithm - Algorithm to use
     * @param {Object} options - Dithering options
     */
    ditherHSV(imageData, algorithm, options) {
        const { threshold = 128, errorDiffusion = 1.0, ditherSize = 1.0, colorAdjustments = {} } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const rgb = [data[idx], data[idx + 1], data[idx + 2]];
                const hsv = this.rgbToHsv(rgb);
                
                // Dither the Value (brightness) channel
                const oldValue = hsv[2];
                const newValue = oldValue < (threshold / 255 * 100) ? 0 : 100;
                const error = (oldValue - newValue) * errorDiffusion;
                
                hsv[2] = newValue;
                const newRgb = this.hsvToRgb(hsv);
                
                data[idx] = newRgb[0];
                data[idx + 1] = newRgb[1];
                data[idx + 2] = newRgb[2];
                
                // Distribute error to neighboring pixels (simplified for HSV)
                this.distributeHSVError(data, width, height, x, y, error, algorithm, ditherSize);
            }
        }

        // Apply color adjustments if present
        if (Object.keys(colorAdjustments).length > 0 && window.colorPalettes) {
            for (let i = 0; i < data.length; i += 4) {
                const adjustedColor = window.colorPalettes.adjustColor([data[i], data[i + 1], data[i + 2]], colorAdjustments);
                data[i] = adjustedColor[0];     // Red
                data[i + 1] = adjustedColor[1]; // Green
                data[i + 2] = adjustedColor[2]; // Blue
                // Alpha channel (i + 3) remains unchanged
            }
        }
    }

    /**
     * Distribute error for single channel
     * @param {Float32Array} errorBuffer - Error buffer for channel
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} x - Current x position
     * @param {number} y - Current y position
     * @param {number} error - Error value
     * @param {string} algorithm - Algorithm pattern to use
     * @param {number} ditherSize - Scale factor for error distribution distance
     */
    distributeChannelError(errorBuffer, width, height, x, y, error, algorithm, ditherSize = 1.0) {
        const patterns = this.getErrorPatterns();
        const pattern = patterns[algorithm] || patterns['floyd-steinberg'];
        
        pattern.forEach(({ dx, dy, weight }) => {
            const nx = x + Math.round(dx * ditherSize);
            const ny = y + Math.round(dy * ditherSize);
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                errorBuffer[nIdx] += error * weight;
            }
        });
    }

    /**
     * Distribute color error for palette dithering
     * @param {Uint8ClampedArray} data - Image data array
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} x - Current x position
     * @param {number} y - Current y position
     * @param {Array} error - RGB error array
     * @param {string} algorithm - Algorithm pattern to use
     * @param {number} ditherSize - Scale factor for error distribution distance
     */
    distributeColorError(data, width, height, x, y, error, algorithm, ditherSize = 1.0) {
        const patterns = this.getErrorPatterns();
        const pattern = patterns[algorithm] || patterns['floyd-steinberg'];
        
        pattern.forEach(({ dx, dy, weight }) => {
            const nx = x + Math.round(dx * ditherSize);
            const ny = y + Math.round(dy * ditherSize);
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = (ny * width + nx) * 4;
                
                data[nIdx] = Math.max(0, Math.min(255, data[nIdx] + error[0] * weight));
                data[nIdx + 1] = Math.max(0, Math.min(255, data[nIdx + 1] + error[1] * weight));
                data[nIdx + 2] = Math.max(0, Math.min(255, data[nIdx + 2] + error[2] * weight));
            }
        });
    }

    /**
     * Distribute HSV error (simplified)
     * @param {Uint8ClampedArray} data - Image data array
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} x - Current x position
     * @param {number} y - Current y position
     * @param {number} error - Value error
     * @param {string} algorithm - Algorithm pattern to use
     * @param {number} ditherSize - Scale factor for error distribution distance
     */
    distributeHSVError(data, width, height, x, y, error, algorithm, ditherSize = 1.0) {
        const patterns = this.getErrorPatterns();
        const pattern = patterns[algorithm] || patterns['floyd-steinberg'];
        
        pattern.forEach(({ dx, dy, weight }) => {
            const nx = x + Math.round(dx * ditherSize);
            const ny = y + Math.round(dy * ditherSize);
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = (ny * width + nx) * 4;
                
                // Convert to HSV, adjust value, convert back
                const rgb = [data[nIdx], data[nIdx + 1], data[nIdx + 2]];
                const hsv = this.rgbToHsv(rgb);
                hsv[2] = Math.max(0, Math.min(100, hsv[2] + error * weight));
                const newRgb = this.hsvToRgb(hsv);
                
                data[nIdx] = newRgb[0];
                data[nIdx + 1] = newRgb[1];
                data[nIdx + 2] = newRgb[2];
            }
        });
    }

    /**
     * Get error distribution patterns for all algorithms
     * @returns {Object} Error patterns by algorithm
     */
    getErrorPatterns() {
        return {
            'floyd-steinberg': [
                { dx: 1, dy: 0, weight: 7/16 },
                { dx: -1, dy: 1, weight: 3/16 },
                { dx: 0, dy: 1, weight: 5/16 },
                { dx: 1, dy: 1, weight: 1/16 }
            ],
            'jarvis-judice-ninke': [
                { dx: 1, dy: 0, weight: 7/48 },
                { dx: 2, dy: 0, weight: 5/48 },
                { dx: -2, dy: 1, weight: 3/48 },
                { dx: -1, dy: 1, weight: 5/48 },
                { dx: 0, dy: 1, weight: 7/48 },
                { dx: 1, dy: 1, weight: 5/48 },
                { dx: 2, dy: 1, weight: 3/48 },
                { dx: -2, dy: 2, weight: 1/48 },
                { dx: -1, dy: 2, weight: 3/48 },
                { dx: 0, dy: 2, weight: 5/48 },
                { dx: 1, dy: 2, weight: 3/48 },
                { dx: 2, dy: 2, weight: 1/48 }
            ],
            'atkinson': [
                { dx: 1, dy: 0, weight: 1/8 },
                { dx: 2, dy: 0, weight: 1/8 },
                { dx: -1, dy: 1, weight: 1/8 },
                { dx: 0, dy: 1, weight: 1/8 },
                { dx: 1, dy: 1, weight: 1/8 },
                { dx: 0, dy: 2, weight: 1/8 }
            ]
        };
    }

    /**
     * Find nearest color in palette
     * @param {Array} color - RGB color to match
     * @param {Array} palette - Array of palette colors
     * @returns {Array} Nearest palette color
     */
    findNearestPaletteColor(color, palette) {
        let minDistance = Infinity;
        let nearestColor = palette[0];
        
        palette.forEach(paletteColor => {
            const distance = this.colorDistance(color, paletteColor);
            if (distance < minDistance) {
                minDistance = distance;
                nearestColor = paletteColor;
            }
        });
        
        return nearestColor;
    }

    /**
     * Calculate distance between two RGB colors
     * @param {Array} color1 - First RGB color
     * @param {Array} color2 - Second RGB color
     * @returns {number} Euclidean distance
     */
    colorDistance(color1, color2) {
        const dr = color1[0] - color2[0];
        const dg = color1[1] - color2[1];
        const db = color1[2] - color2[2];
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    /**
     * Generate simple grayscale palette
     * @param {number} colorCount - Number of colors
     * @returns {Array} Grayscale palette
     */
    generateGrayscalePalette(colorCount) {
        const palette = [];
        for (let i = 0; i < colorCount; i++) {
            const value = Math.round((i / (colorCount - 1)) * 255);
            palette.push([value, value, value]);
        }
        return palette;
    }

    /**
     * Convert RGB to HSV
     * @param {Array} rgb - RGB color [r, g, b]
     * @returns {Array} HSV color [h, s, v]
     */
    rgbToHsv([r, g, b]) {
        if (window.colorPalettes) {
            return window.colorPalettes.rgbToHsv([r, g, b]);
        }
        
        // Fallback implementation
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const diff = max - min;
        let h, s, v = max;
        
        s = max === 0 ? 0 : diff / max;
        
        if (diff === 0) h = 0;
        else if (max === r) h = (60 * ((g - b) / diff) + 360) % 360;
        else if (max === g) h = (60 * ((b - r) / diff) + 120) % 360;
        else h = (60 * ((r - g) / diff) + 240) % 360;
        
        return [h, s * 100, v * 100];
    }

    /**
     * Convert HSV to RGB
     * @param {Array} hsv - HSV color [h, s, v]
     * @returns {Array} RGB color [r, g, b]
     */
    hsvToRgb([h, s, v]) {
        if (window.colorPalettes) {
            return window.colorPalettes.hsvToRgb([h, s, v]);
        }
        
        // Fallback implementation
        h /= 60; s /= 100; v /= 100;
        const c = v * s;
        const x = c * (1 - Math.abs((h % 2) - 1));
        const m = v - c;
        let r, g, b;
        
        if (h >= 0 && h < 1) [r, g, b] = [c, x, 0];
        else if (h >= 1 && h < 2) [r, g, b] = [x, c, 0];
        else if (h >= 2 && h < 3) [r, g, b] = [0, c, x];
        else if (h >= 3 && h < 4) [r, g, b] = [0, x, c];
        else if (h >= 4 && h < 5) [r, g, b] = [x, 0, c];
        else [r, g, b] = [c, 0, x];
        
        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        ];
    }

    /**
     * Dither RGB channels independently
     * @param {ImageData} imageData - Image data to dither
     * @param {string} algorithm - Algorithm to use
     * @param {Object} options - Dithering options
     */
    ditherRGBChannels(imageData, algorithm, options) {
        const { threshold = 128, errorDiffusion = 1.0, ditherSize = 1.0, colorAdjustments = {} } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Create separate error buffers for each channel
        const redBuffer = new Float32Array(width * height);
        const greenBuffer = new Float32Array(width * height);
        const blueBuffer = new Float32Array(width * height);

        // Process each channel independently
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const bufferIdx = y * width + x;

                // Process red channel
                const oldRed = data[idx] + redBuffer[bufferIdx];
                const newRed = oldRed < threshold ? 0 : 255;
                const redError = (oldRed - newRed) * errorDiffusion;
                data[idx] = newRed;

                // Process green channel
                const oldGreen = data[idx + 1] + greenBuffer[bufferIdx];
                const newGreen = oldGreen < threshold ? 0 : 255;
                const greenError = (oldGreen - newGreen) * errorDiffusion;
                data[idx + 1] = newGreen;

                // Process blue channel
                const oldBlue = data[idx + 2] + blueBuffer[bufferIdx];
                const newBlue = oldBlue < threshold ? 0 : 255;
                const blueError = (oldBlue - newBlue) * errorDiffusion;
                data[idx + 2] = newBlue;

                // Distribute errors to neighboring pixels for each channel
                this.distributeChannelError(redBuffer, width, height, x, y, redError, algorithm, ditherSize);
                this.distributeChannelError(greenBuffer, width, height, x, y, greenError, algorithm, ditherSize);
                this.distributeChannelError(blueBuffer, width, height, x, y, blueError, algorithm, ditherSize);
            }
        }

        // Apply color adjustments if present
        if (Object.keys(colorAdjustments).length > 0) {
            this.applyRGBColorAdjustments(imageData, colorAdjustments);
        }
    }

    /**
     * Dither using a color palette
     * @param {ImageData} imageData - Image data to dither
     * @param {string} algorithm - Algorithm to use
     * @param {Object} options - Dithering options
     */
    ditherWithPalette(imageData, algorithm, options) {
        const { threshold = 128, errorDiffusion = 1.0, ditherSize = 1.0, palette = null, colorCount = 16 } = options;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Use provided palette or generate one
        let targetPalette = palette;
        if (!targetPalette && window.colorPalettes) {
            targetPalette = window.colorPalettes.generatePaletteFromImage(imageData, colorCount);
        }

        if (!targetPalette) {
            // Fallback to grayscale if no palette available
            this.algorithms[algorithm](imageData, { threshold, errorDiffusion, ditherSize });
            return;
        }

        // Process each pixel with palette-based error diffusion
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                const oldColor = [data[idx], data[idx + 1], data[idx + 2]];
                const newColor = this.findNearestPaletteColor(oldColor, targetPalette);
                
                // Calculate error for each channel
                const errorR = (oldColor[0] - newColor[0]) * errorDiffusion;
                const errorG = (oldColor[1] - newColor[1]) * errorDiffusion;
                const errorB = (oldColor[2] - newColor[2]) * errorDiffusion;

                data[idx] = newColor[0];
                data[idx + 1] = newColor[1];
                data[idx + 2] = newColor[2];

                // Distribute error to neighboring pixels
                this.distributePaletteError(data, width, height, x, y, errorR, errorG, errorB, algorithm, ditherSize);
            }
        }
    }

    /**
     * Find nearest color in palette
     * @param {Array} color - RGB color [r, g, b]
     * @param {Array} palette - Array of RGB colors
     * @returns {Array} - Nearest RGB color
     */
    findNearestPaletteColor(color, palette) {
        let minDistance = Infinity;
        let nearestColor = palette[0];

        for (const paletteColor of palette) {
            const distance = Math.sqrt(
                Math.pow(color[0] - paletteColor[0], 2) +
                Math.pow(color[1] - paletteColor[1], 2) +
                Math.pow(color[2] - paletteColor[2], 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearestColor = paletteColor;
            }
        }

        return nearestColor;
    }

    /**
     * Distribute error for individual channel buffers
     * @param {Float32Array} buffer - Error buffer for specific channel
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} x - Current x position
     * @param {number} y - Current y position
     * @param {number} error - Error value to distribute
     * @param {string} algorithm - Algorithm for error pattern
     * @param {number} ditherSize - Dither scaling factor
     */
    distributeChannelError(buffer, width, height, x, y, error, algorithm, ditherSize) {
        // Use Floyd-Steinberg pattern for all algorithms as fallback
        const pattern = [
            { dx: 1, dy: 0, weight: 7/16 },
            { dx: -1, dy: 1, weight: 3/16 },
            { dx: 0, dy: 1, weight: 5/16 },
            { dx: 1, dy: 1, weight: 1/16 }
        ];

        for (const { dx, dy, weight } of pattern) {
            const nx = Math.round(x + dx * ditherSize);
            const ny = Math.round(y + dy * ditherSize);
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const bufferIdx = ny * width + nx;
                buffer[bufferIdx] += error * weight;
            }
        }
    }

    /**
     * Distribute palette error to neighboring pixels
     * @param {Uint8ClampedArray} data - Image data
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} x - Current x position
     * @param {number} y - Current y position
     * @param {number} errorR - Red error
     * @param {number} errorG - Green error
     * @param {number} errorB - Blue error
     * @param {string} algorithm - Algorithm for error pattern
     * @param {number} ditherSize - Dither scaling factor
     */
    distributePaletteError(data, width, height, x, y, errorR, errorG, errorB, algorithm, ditherSize) {
        // Use Floyd-Steinberg pattern for all algorithms as fallback
        const pattern = [
            { dx: 1, dy: 0, weight: 7/16 },
            { dx: -1, dy: 1, weight: 3/16 },
            { dx: 0, dy: 1, weight: 5/16 },
            { dx: 1, dy: 1, weight: 1/16 }
        ];

        for (const { dx, dy, weight } of pattern) {
            const nx = Math.round(x + dx * ditherSize);
            const ny = Math.round(y + dy * ditherSize);
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const idx = (ny * width + nx) * 4;
                data[idx] = Math.max(0, Math.min(255, data[idx] + errorR * weight));
                data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + errorG * weight));
                data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + errorB * weight));
            }
        }
    }

    /**
     * Apply brightness and contrast adjustments
     * @param {ImageData} imageData - Image data to adjust
     * @param {Object} adjustments - Brightness and contrast values
     */
    applyBrightnessContrast(imageData, adjustments) {
        const { brightness = 100, contrast = 100 } = adjustments;
        const data = imageData.data;

        const brightnessFactor = brightness / 100;
        const contrastFactor = contrast / 100;

        for (let i = 0; i < data.length; i += 4) {
            // Apply brightness
            data[i] *= brightnessFactor;
            data[i + 1] *= brightnessFactor;
            data[i + 2] *= brightnessFactor;

            // Apply contrast
            data[i] = ((data[i] - 128) * contrastFactor) + 128;
            data[i + 1] = ((data[i + 1] - 128) * contrastFactor) + 128;
            data[i + 2] = ((data[i + 2] - 128) * contrastFactor) + 128;

            // Clamp values
            data[i] = Math.max(0, Math.min(255, data[i]));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
        }
    }

    /**
     * Apply RGB color adjustments including hue, saturation, brightness, and contrast
     * @param {ImageData} imageData - Image data to adjust
     * @param {Object} adjustments - Color adjustment values
     */
    applyRGBColorAdjustments(imageData, adjustments) {
        const { hueShift = 0, saturation = 100, brightness = 100, contrast = 100 } = adjustments;
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            // Convert RGB to HSV for hue and saturation adjustments
            const rgb = [data[i], data[i + 1], data[i + 2]];
            const hsv = this.rgbToHsv(rgb);

            // Apply hue shift
            hsv[0] = (hsv[0] + hueShift) % 360;
            if (hsv[0] < 0) hsv[0] += 360;

            // Apply saturation adjustment
            hsv[1] = Math.max(0, Math.min(100, hsv[1] * (saturation / 100)));

            // Convert back to RGB
            const adjustedRgb = this.hsvToRgb(hsv);
            data[i] = adjustedRgb[0];
            data[i + 1] = adjustedRgb[1];
            data[i + 2] = adjustedRgb[2];

            // Apply brightness
            const brightnessFactor = brightness / 100;
            data[i] *= brightnessFactor;
            data[i + 1] *= brightnessFactor;
            data[i + 2] *= brightnessFactor;

            // Apply contrast
            const contrastFactor = contrast / 100;
            data[i] = ((data[i] - 128) * contrastFactor) + 128;
            data[i + 1] = ((data[i + 1] - 128) * contrastFactor) + 128;
            data[i + 2] = ((data[i + 2] - 128) * contrastFactor) + 128;

            // Clamp values
            data[i] = Math.max(0, Math.min(255, data[i]));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
        }
    }

    /**
     * Check if basic image adjustments are non-neutral (debug feature)
     * @param {Object} adjustments - Basic adjustment parameters
     * @returns {boolean} - True if adjustments would modify the image
     */
    isBasicAdjustmentsNonNeutral(adjustments) {
        const { brightness = 100, contrast = 100 } = adjustments;
        
        // Only apply if values differ from neutral (100%)
        return brightness !== 100 || contrast !== 100;
    }

    /**
     * Apply basic image adjustments with safety mechanisms (debug feature)
     * @param {ImageData} imageData - Image data to process
     * @param {Object} adjustments - Basic adjustment parameters
     */
    applyBasicImageAdjustments(imageData, adjustments) {
        const { brightness = 100, contrast = 100 } = adjustments;
        
        // Safety check: skip if neutral values
        if (brightness === 100 && contrast === 100) {
            return;
        }
        
        // Safety check: validate input ranges
        if (brightness < 50 || brightness > 150 || contrast < 50 || contrast > 150) {
            if (this.logger) {
                this.logger.logError('DitheringEngine', 'Basic adjustments out of safe range', { brightness, contrast });
            }
            return;
        }
        
        const data = imageData.data;
        const brightnessFactor = (brightness - 100) / 100; // -0.5 to +0.5
        const contrastFactor = contrast / 100; // 0.5 to 1.5
        
        if (this.logger) {
            this.logger.logInfo('DitheringEngine', 'Applying basic adjustments', { brightness, contrast, brightnessFactor, contrastFactor });
        }
        
        for (let i = 0; i < data.length; i += 4) {
            // Apply brightness (additive adjustment)
            let r = data[i] + (brightnessFactor * 255);
            let g = data[i + 1] + (brightnessFactor * 255);
            let b = data[i + 2] + (brightnessFactor * 255);
            
            // Apply contrast (multiplicative around midpoint 128)
            r = ((r - 128) * contrastFactor) + 128;
            g = ((g - 128) * contrastFactor) + 128;
            b = ((b - 128) * contrastFactor) + 128;
            
            // Safety clamp to valid range
            data[i] = Math.max(0, Math.min(255, Math.round(r)));
            data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
            data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
            // Alpha channel unchanged
        }
    }

    /**
     * Check if levels adjustment settings are non-neutral
     * @param {Object} levels - Levels parameters
     * @returns {boolean} - True if levels would modify the image
     */
    isLevelsNonNeutral(levels) {
        const { inputShadow = 0, inputGamma = 1.0, inputHighlight = 255, outputBlack = 0, outputWhite = 255 } = levels;
        
        // Check if any parameter differs from neutral defaults
        return inputShadow !== 0 || 
               Math.abs(inputGamma - 1.0) > 0.01 || 
               inputHighlight !== 255 || 
               outputBlack !== 0 || 
               outputWhite !== 255;
    }

    /**
     * Check if HSV adjustment settings are non-neutral
     * @param {Object} hsv - HSV parameters
     * @returns {boolean} - True if HSV would modify the image
     */
    isHSVNonNeutral(hsv) {
        const { hue = 0, saturation = 100, value = 100 } = hsv;
        
        // Check if any parameter differs from neutral defaults
        return hue !== 0 || 
               saturation !== 100 || 
               value !== 100;
    }

    /**
     * Apply levels adjustment to image data
     * @param {ImageData} imageData - Image data to process
     * @param {Object} levels - Levels parameters
     */
    applyLevelsAdjustment(imageData, levels) {
        const { inputShadow = 0, inputGamma = 1.0, inputHighlight = 255, outputBlack = 0, outputWhite = 255 } = levels;
        const data = imageData.data;
        
        // Build lookup table for levels adjustment
        const lookupTable = new Uint8Array(256);
        const inputRange = inputHighlight - inputShadow;
        
        // Protect against division by zero
        if (inputRange === 0) {
            // If input range is zero, just map everything to midpoint
            const midpoint = Math.round((outputBlack + outputWhite) / 2);
            lookupTable.fill(midpoint);
        } else {
            for (let i = 0; i < 256; i++) {
                // Input levels mapping
                let normalized = Math.max(0, Math.min(1, (i - inputShadow) / inputRange));
                
                // Gamma correction
                if (inputGamma !== 1.0 && inputGamma > 0) {
                    normalized = Math.pow(normalized, 1.0 / inputGamma);
                }
                
                // Output levels mapping
                const result = outputBlack + normalized * (outputWhite - outputBlack);
                lookupTable[i] = Math.max(0, Math.min(255, Math.round(result)));
            }
        }
        
        // Apply lookup table to RGB channels
        for (let i = 0; i < data.length; i += 4) {
            data[i] = lookupTable[data[i]];         // Red
            data[i + 1] = lookupTable[data[i + 1]]; // Green
            data[i + 2] = lookupTable[data[i + 2]]; // Blue
            // Alpha channel remains unchanged
        }
    }

    /**
     * Apply posterization to image data
     * @param {ImageData} imageData - Image data to process
     * @param {Object} posterization - Posterization parameters
     */
    applyPosterization(imageData, posterization) {
        const { 
            levels = 8, 
            preBlur = 0, 
            soften = 0, 
            gamma = 1.0, 
            perChannel = false,
            redLevels = 8,
            greenLevels = 8,
            blueLevels = 8,
            ditherMethod = 'none'
        } = posterization;
        
        const data = imageData.data;
        
        // Apply pre-blur if specified
        if (preBlur > 0) {
            this.applyGaussianBlur(imageData, preBlur);
        }
        
        // Apply gamma correction before posterization
        if (gamma !== 1.0) {
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.pow(data[i] / 255, 1.0 / gamma) * 255;
                data[i + 1] = Math.pow(data[i + 1] / 255, 1.0 / gamma) * 255;
                data[i + 2] = Math.pow(data[i + 2] / 255, 1.0 / gamma) * 255;
            }
        }
        
        // Apply posterization
        for (let i = 0; i < data.length; i += 4) {
            if (perChannel) {
                // Individual channel levels
                data[i] = this.posterizeChannel(data[i], redLevels);
                data[i + 1] = this.posterizeChannel(data[i + 1], greenLevels);
                data[i + 2] = this.posterizeChannel(data[i + 2], blueLevels);
            } else {
                // Uniform levels across all channels
                data[i] = this.posterizeChannel(data[i], levels);
                data[i + 1] = this.posterizeChannel(data[i + 1], levels);
                data[i + 2] = this.posterizeChannel(data[i + 2], levels);
            }
        }
        
        // Apply softening if specified
        if (soften > 0) {
            this.applySoftening(imageData, soften);
        }
        
        // Apply posterization dithering if specified
        if (ditherMethod !== 'none' && this.algorithms[ditherMethod]) {
            this.algorithms[ditherMethod](imageData, { threshold: 128, errorDiffusion: 0.3, ditherSize: 1.0, colorLevels: levels });
        }
    }

    /**
     * Posterize a single channel value
     * @param {number} value - Channel value (0-255)
     * @param {number} levels - Number of levels
     * @returns {number} - Posterized value
     */
    posterizeChannel(value, levels) {
        const step = 255 / (levels - 1);
        return Math.round(Math.round(value / step) * step);
    }

    /**
     * Apply Gaussian blur to image data
     * @param {ImageData} imageData - Image data to process
     * @param {number} radius - Blur radius in pixels
     */
    applyGaussianBlur(imageData, radius) {
        // Simple box blur approximation for performance
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const temp = new Uint8ClampedArray(data);
        
        const kernelSize = Math.ceil(radius * 2) + 1;
        const kernelRadius = Math.floor(kernelSize / 2);
        
        // Horizontal pass
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, count = 0;
                
                for (let kx = -kernelRadius; kx <= kernelRadius; kx++) {
                    const px = Math.max(0, Math.min(width - 1, x + kx));
                    const idx = (y * width + px) * 4;
                    
                    r += temp[idx];
                    g += temp[idx + 1];
                    b += temp[idx + 2];
                    count++;
                }
                
                const idx = (y * width + x) * 4;
                data[idx] = r / count;
                data[idx + 1] = g / count;
                data[idx + 2] = b / count;
            }
        }
        
        // Vertical pass
        temp.set(data);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, count = 0;
                
                for (let ky = -kernelRadius; ky <= kernelRadius; ky++) {
                    const py = Math.max(0, Math.min(height - 1, y + ky));
                    const idx = (py * width + x) * 4;
                    
                    r += temp[idx];
                    g += temp[idx + 1];
                    b += temp[idx + 2];
                    count++;
                }
                
                const idx = (y * width + x) * 4;
                data[idx] = r / count;
                data[idx + 1] = g / count;
                data[idx + 2] = b / count;
            }
        }
    }

    /**
     * Apply softening to reduce harsh transitions
     * @param {ImageData} imageData - Image data to process
     * @param {number} amount - Softening amount (0-100)
     */
    applySoftening(imageData, amount) {
        if (amount === 0) return;
        
        const factor = amount / 100;
        this.applyGaussianBlur(imageData, factor * 2);
    }

    /**
     * Apply final HSV adjustments to dithered image
     * @param {ImageData} imageData - Image data to process
     * @param {Object} hsv - HSV adjustment parameters
     */
    applyFinalHSVAdjustments(imageData, hsv) {
        const { hue = 0, saturation = 100, value = 100 } = hsv;
        
        if (hue === 0 && saturation === 100 && value === 100) return;
        
        const data = imageData.data;
        const hueShift = hue / 360;
        const saturationFactor = saturation / 100;
        const valueFactor = value / 100;
        
        for (let i = 0; i < data.length; i += 4) {
            const rgb = [data[i], data[i + 1], data[i + 2]];
            const hsvColor = this.rgbToHsv(rgb);
            
            // Apply adjustments
            hsvColor[0] = (hsvColor[0] + hueShift + 1) % 1; // Wrap hue
            hsvColor[1] = Math.max(0, Math.min(1, hsvColor[1] * saturationFactor));
            hsvColor[2] = Math.max(0, Math.min(1, hsvColor[2] * valueFactor));
            
            const adjustedRgb = this.hsvToRgb(hsvColor);
            data[i] = adjustedRgb[0];
            data[i + 1] = adjustedRgb[1];
            data[i + 2] = adjustedRgb[2];
        }
    }

    /**
     * Apply chromatic aberration effects to image data
     * @param {ImageData} imageData - Image data to process
     * @param {Object} effects - Chromatic effects parameters
     */
    applyChromaAberration(imageData, effects) {
        const { intensity = 0, redOffsetX = 0, redOffsetY = 0, greenOffsetX = 0, greenOffsetY = 0, blueOffsetX = 0, blueOffsetY = 0 } = effects;
        
        if (intensity === 0) return;
        
        const { width, height, data } = imageData;
        const intensityFactor = intensity / 100;
        
        // Create separate channel buffers
        const redChannel = new Uint8ClampedArray(width * height);
        const greenChannel = new Uint8ClampedArray(width * height);
        const blueChannel = new Uint8ClampedArray(width * height);
        
        // Extract channels
        for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = i / 4;
            redChannel[pixelIndex] = data[i];
            greenChannel[pixelIndex] = data[i + 1];
            blueChannel[pixelIndex] = data[i + 2];
        }
        
        // Apply offsets to each channel
        const offsetRedChannel = this.offsetChannel(redChannel, width, height, redOffsetX * intensityFactor, redOffsetY * intensityFactor);
        const offsetGreenChannel = this.offsetChannel(greenChannel, width, height, greenOffsetX * intensityFactor, greenOffsetY * intensityFactor);
        const offsetBlueChannel = this.offsetChannel(blueChannel, width, height, blueOffsetX * intensityFactor, blueOffsetY * intensityFactor);
        
        // Recombine channels into image data
        for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = i / 4;
            data[i] = offsetRedChannel[pixelIndex];
            data[i + 1] = offsetGreenChannel[pixelIndex];
            data[i + 2] = offsetBlueChannel[pixelIndex];
            // Alpha channel remains unchanged
        }
    }

    /**
     * Offset a single color channel
     * @param {Uint8ClampedArray} channel - Single channel data
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} offsetX - X offset in pixels
     * @param {number} offsetY - Y offset in pixels
     * @returns {Uint8ClampedArray} - Offset channel data
     */
    offsetChannel(channel, width, height, offsetX, offsetY) {
        const offsetChannel = new Uint8ClampedArray(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const targetIndex = y * width + x;
                
                // Calculate source position with offset
                const sourceX = Math.round(x - offsetX);
                const sourceY = Math.round(y - offsetY);
                
                // Check bounds
                if (sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height) {
                    const sourceIndex = sourceY * width + sourceX;
                    offsetChannel[targetIndex] = channel[sourceIndex];
                } else {
                    // Use black for out-of-bounds pixels (creates the aberration effect)
                    offsetChannel[targetIndex] = 0;
                }
            }
        }
        
        return offsetChannel;
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