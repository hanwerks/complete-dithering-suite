/**
 * Color Palette Utilities and Preset Palettes
 * Provides various color palettes and color manipulation functions
 */
class ColorPalettes {
    constructor() {
        this.presetPalettes = this.initializePresetPalettes();
        
        if (window.devLogger) {
            this.logger = window.devLogger;
            this.logger.logInfo('ColorPalettes', 'Color palette system initialized');
        }
    }

    initializePresetPalettes() {
        return {
            'retro': {
                name: 'Retro Gaming',
                colors: [
                    [0, 0, 0], [255, 255, 255], [255, 0, 0], [0, 255, 0],
                    [0, 0, 255], [255, 255, 0], [255, 0, 255], [0, 255, 255],
                    [128, 0, 0], [0, 128, 0], [0, 0, 128], [128, 128, 0],
                    [128, 0, 128], [0, 128, 128], [192, 192, 192], [128, 128, 128]
                ]
            },
            'cga': {
                name: 'CGA (4 colors)',
                colors: [
                    [0, 0, 0],       // Black
                    [0, 255, 255],   // Cyan
                    [255, 0, 255],   // Magenta
                    [255, 255, 255]  // White
                ]
            },
            'ega': {
                name: 'EGA (16 colors)',
                colors: [
                    [0, 0, 0], [0, 0, 170], [0, 170, 0], [0, 170, 170],
                    [170, 0, 0], [170, 0, 170], [170, 85, 0], [170, 170, 170],
                    [85, 85, 85], [85, 85, 255], [85, 255, 85], [85, 255, 255],
                    [255, 85, 85], [255, 85, 255], [255, 255, 85], [255, 255, 255]
                ]
            },
            'c64': {
                name: 'Commodore 64',
                colors: [
                    [0, 0, 0], [255, 255, 255], [136, 57, 50], [103, 182, 189],
                    [139, 63, 150], [85, 160, 73], [64, 49, 141], [191, 206, 114],
                    [139, 84, 41], [87, 66, 0], [184, 105, 98], [80, 80, 80],
                    [120, 120, 120], [148, 224, 137], [120, 105, 196], [159, 159, 159]
                ]
            },
            'gameboy': {
                name: 'Game Boy',
                colors: [
                    [15, 56, 15],     // Dark green
                    [48, 98, 48],     // Medium dark green
                    [139, 172, 15],   // Medium light green
                    [155, 188, 15]    // Light green
                ]
            },
            'nes': {
                name: 'NES',
                colors: [
                    [124, 124, 124], [0, 0, 252], [0, 0, 188], [68, 40, 188],
                    [148, 0, 132], [168, 0, 32], [168, 16, 0], [136, 20, 0],
                    [80, 48, 0], [0, 120, 0], [0, 104, 0], [0, 88, 0],
                    [0, 64, 88], [0, 0, 0], [0, 0, 0], [0, 0, 0]
                ]
            }
        };
    }

    /**
     * Get a preset palette by name
     * @param {string} paletteName - Name of the preset palette
     * @returns {Array} Array of RGB color arrays
     */
    getPresetPalette(paletteName) {
        const palette = this.presetPalettes[paletteName];
        return palette ? palette.colors : null;
    }

    /**
     * Generate a custom palette by quantizing image colors
     * @param {ImageData} imageData - Source image data
     * @param {number} colorCount - Number of colors in palette
     * @returns {Array} Array of RGB color arrays
     */
    generatePaletteFromImage(imageData, colorCount = 16) {
        const colors = this.extractUniqueColors(imageData);
        return this.quantizeColors(colors, colorCount);
    }

    /**
     * Extract unique colors from image data
     * @param {ImageData} imageData - Source image data
     * @returns {Array} Array of unique RGB colors
     */
    extractUniqueColors(imageData) {
        const colorSet = new Set();
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const colorKey = `${r},${g},${b}`;
            colorSet.add(colorKey);
        }
        
        return Array.from(colorSet).map(colorKey => 
            colorKey.split(',').map(c => parseInt(c))
        );
    }

    /**
     * Quantize colors using k-means clustering
     * @param {Array} colors - Array of RGB colors
     * @param {number} k - Number of clusters
     * @returns {Array} Array of quantized RGB colors
     */
    quantizeColors(colors, k) {
        if (colors.length <= k) return colors;
        
        // Simple k-means implementation
        let centroids = this.initializeCentroids(colors, k);
        let previousCentroids;
        
        for (let iteration = 0; iteration < 20; iteration++) {
            const clusters = this.assignToClusters(colors, centroids);
            previousCentroids = centroids.slice();
            centroids = this.updateCentroids(clusters);
            
            // Check for convergence
            if (this.centroidsEqual(centroids, previousCentroids)) break;
        }
        
        return centroids;
    }

    /**
     * Initialize centroids for k-means
     * @param {Array} colors - Array of RGB colors
     * @param {number} k - Number of centroids
     * @returns {Array} Initial centroids
     */
    initializeCentroids(colors, k) {
        const centroids = [];
        for (let i = 0; i < k; i++) {
            const randomIndex = Math.floor(Math.random() * colors.length);
            centroids.push([...colors[randomIndex]]);
        }
        return centroids;
    }

    /**
     * Assign colors to clusters
     * @param {Array} colors - Array of RGB colors
     * @param {Array} centroids - Current centroids
     * @returns {Array} Array of clusters
     */
    assignToClusters(colors, centroids) {
        const clusters = centroids.map(() => []);
        
        colors.forEach(color => {
            let minDistance = Infinity;
            let closestCluster = 0;
            
            centroids.forEach((centroid, index) => {
                const distance = this.colorDistance(color, centroid);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCluster = index;
                }
            });
            
            clusters[closestCluster].push(color);
        });
        
        return clusters;
    }

    /**
     * Update centroids based on cluster means
     * @param {Array} clusters - Array of color clusters
     * @returns {Array} Updated centroids
     */
    updateCentroids(clusters) {
        return clusters.map(cluster => {
            if (cluster.length === 0) return [0, 0, 0];
            
            const sum = cluster.reduce((acc, color) => [
                acc[0] + color[0],
                acc[1] + color[1],
                acc[2] + color[2]
            ], [0, 0, 0]);
            
            return [
                Math.round(sum[0] / cluster.length),
                Math.round(sum[1] / cluster.length),
                Math.round(sum[2] / cluster.length)
            ];
        });
    }

    /**
     * Check if centroids are equal (convergence)
     * @param {Array} centroids1 - First set of centroids
     * @param {Array} centroids2 - Second set of centroids
     * @returns {boolean} True if equal
     */
    centroidsEqual(centroids1, centroids2) {
        if (centroids1.length !== centroids2.length) return false;
        
        return centroids1.every((centroid, index) => 
            centroid.every((value, colorIndex) => 
                value === centroids2[index][colorIndex]
            )
        );
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
     * Find nearest color in palette
     * @param {Array} color - RGB color to match
     * @param {Array} palette - Array of palette colors
     * @returns {Array} Nearest palette color
     */
    findNearestColor(color, palette) {
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
     * Convert RGB to HSV
     * @param {Array} rgb - RGB color [r, g, b]
     * @returns {Array} HSV color [h, s, v]
     */
    rgbToHsv([r, g, b]) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        let h, s, v = max;
        
        s = max === 0 ? 0 : diff / max;
        
        if (diff === 0) {
            h = 0;
        } else if (max === r) {
            h = (60 * ((g - b) / diff) + 360) % 360;
        } else if (max === g) {
            h = (60 * ((b - r) / diff) + 120) % 360;
        } else {
            h = (60 * ((r - g) / diff) + 240) % 360;
        }
        
        return [h, s * 100, v * 100];
    }

    /**
     * Convert HSV to RGB
     * @param {Array} hsv - HSV color [h, s, v]
     * @returns {Array} RGB color [r, g, b]
     */
    hsvToRgb([h, s, v]) {
        h /= 60;
        s /= 100;
        v /= 100;
        
        const c = v * s;
        const x = c * (1 - Math.abs((h % 2) - 1));
        const m = v - c;
        
        let r, g, b;
        
        if (h >= 0 && h < 1) {
            [r, g, b] = [c, x, 0];
        } else if (h >= 1 && h < 2) {
            [r, g, b] = [x, c, 0];
        } else if (h >= 2 && h < 3) {
            [r, g, b] = [0, c, x];
        } else if (h >= 3 && h < 4) {
            [r, g, b] = [0, x, c];
        } else if (h >= 4 && h < 5) {
            [r, g, b] = [x, 0, c];
        } else {
            [r, g, b] = [c, 0, x];
        }
        
        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        ];
    }

    /**
     * Apply color adjustments to a palette
     * @param {Array} palette - Array of RGB colors
     * @param {Object} adjustments - Color adjustment parameters
     * @returns {Array} Adjusted palette
     */
    adjustPalette(palette, adjustments = {}) {
        const {
            hueShift = 0,        // -180 to +180 degrees
            saturation = 100,    // 0 to 200 percent
            brightness = 100,    // 0 to 200 percent
            contrast = 100       // 0 to 200 percent
        } = adjustments;

        return palette.map(color => this.adjustColor(color, {
            hueShift,
            saturation,
            brightness,
            contrast
        }));
    }

    /**
     * Apply color adjustments to a single color
     * @param {Array} rgb - RGB color [r, g, b]
     * @param {Object} adjustments - Color adjustment parameters
     * @returns {Array} Adjusted RGB color
     */
    adjustColor([r, g, b], adjustments) {
        const {
            hueShift = 0,
            saturation = 100,
            brightness = 100,
            contrast = 100
        } = adjustments;

        // Convert to HSV for hue and saturation adjustments
        let [h, s, v] = this.rgbToHsv([r, g, b]);

        // Apply hue shift
        h = (h + hueShift + 360) % 360;

        // Apply saturation adjustment
        s = Math.max(0, Math.min(100, s * (saturation / 100)));

        // Convert back to RGB
        [r, g, b] = this.hsvToRgb([h, s, v]);

        // Apply brightness adjustment
        r = Math.max(0, Math.min(255, r * (brightness / 100)));
        g = Math.max(0, Math.min(255, g * (brightness / 100)));
        b = Math.max(0, Math.min(255, b * (brightness / 100)));

        // Apply contrast adjustment
        r = this.applyContrast(r, contrast);
        g = this.applyContrast(g, contrast);
        b = this.applyContrast(b, contrast);

        return [Math.round(r), Math.round(g), Math.round(b)];
    }

    /**
     * Apply contrast adjustment to a color channel
     * @param {number} value - Color channel value (0-255)
     * @param {number} contrast - Contrast adjustment (0-200)
     * @returns {number} Adjusted color channel value
     */
    applyContrast(value, contrast) {
        // Normalize to 0-1
        const normalized = value / 255;
        
        // Apply contrast formula: (value - 0.5) * contrast + 0.5
        const adjusted = (normalized - 0.5) * (contrast / 100) + 0.5;
        
        // Clamp and convert back to 0-255
        return Math.max(0, Math.min(255, adjusted * 255));
    }

    /**
     * Create a grayscale color with hue tint
     * @param {number} luminance - Grayscale luminance value (0-255)
     * @param {Object} adjustments - Color adjustment parameters
     * @returns {Array} Tinted RGB color
     */
    createTintedGrayscale(luminance, adjustments = {}) {
        const {
            hueOffset = 0,      // -180 to +180 degrees (legacy name)
            hueShift = 0,       // -180 to +180 degrees (new name)
            saturation = 0,     // 0 to 100 percent
            brightness = 100    // 0 to 200 percent
        } = adjustments;
        
        // Use hueShift if provided, otherwise fall back to hueOffset for compatibility
        const hue = hueShift !== 0 ? hueShift : hueOffset;

        // Start with grayscale value
        let [r, g, b] = [luminance, luminance, luminance];

        // If saturation is applied, convert to HSV and add color
        if (saturation > 0) {
            const finalHue = (hue + 360) % 360;
            [r, g, b] = this.hsvToRgb([finalHue, saturation, (luminance / 255) * 100]);
        }

        // Apply brightness adjustment
        r = Math.max(0, Math.min(255, r * (brightness / 100)));
        g = Math.max(0, Math.min(255, g * (brightness / 100)));
        b = Math.max(0, Math.min(255, b * (brightness / 100)));

        return [Math.round(r), Math.round(g), Math.round(b)];
    }

    /**
     * Generate an adjusted version of a preset palette
     * @param {string} paletteName - Name of the preset palette
     * @param {Object} adjustments - Color adjustment parameters
     * @returns {Array} Adjusted palette or null if palette not found
     */
    getAdjustedPresetPalette(paletteName, adjustments = {}) {
        const originalPalette = this.getPresetPalette(paletteName);
        if (!originalPalette) return null;

        return this.adjustPalette(originalPalette, adjustments);
    }
}

// Global color palette instance
window.colorPalettes = new ColorPalettes();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorPalettes;
}