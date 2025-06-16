class DevelopmentLogger {
    constructor() {
        this.isDevMode = this.detectDevMode();
        this.sessionStart = new Date();
        this.logHistory = [];
        
        if (this.isDevMode) {
            this.initializeLogging();
        }
    }

    detectDevMode() {
        // Check for development mode indicators
        return process.argv.includes('--dev') || 
               process.env.NODE_ENV === 'development' ||
               window.location.hostname === 'localhost';
    }

    initializeLogging() {
        console.log('🚀 Development Logger initialized');
        console.log(`📅 Session started: ${this.sessionStart.toISOString()}`);
        
        // Log any unhandled errors
        window.addEventListener('error', (event) => {
            this.logError('Unhandled Error', event.error);
        });

        // Log unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logError('Unhandled Promise Rejection', event.reason);
        });
    }

    log(level, category, message, data = null) {
        if (!this.isDevMode) return;

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            category,
            message,
            data,
            sessionTime: Date.now() - this.sessionStart.getTime()
        };

        this.logHistory.push(logEntry);

        // Console output with styling
        const styles = {
            info: 'color: #3b82f6; font-weight: bold',
            success: 'color: #10b981; font-weight: bold',
            warning: 'color: #f59e0b; font-weight: bold',
            error: 'color: #ef4444; font-weight: bold',
            debug: 'color: #6b7280; font-style: italic'
        };

        const style = styles[level] || 'color: #374151';
        const prefix = this.getLevelPrefix(level);
        
        console.group(`%c${prefix} [${category}] ${message}`, style);
        console.log(`🕐 ${new Date(timestamp).toLocaleTimeString()}`);
        
        if (data) {
            console.log('📊 Data:', data);
        }
        
        console.groupEnd();
    }

    getLevelPrefix(level) {
        const prefixes = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            debug: '🔍'
        };
        return prefixes[level] || '📝';
    }

    // Convenience methods
    logInfo(category, message, data) {
        this.log('info', category, message, data);
    }

    logSuccess(category, message, data) {
        this.log('success', category, message, data);
    }

    logWarning(category, message, data) {
        this.log('warning', category, message, data);
    }

    logError(category, message, data) {
        this.log('error', category, message, data);
    }

    logDebug(category, message, data) {
        this.log('debug', category, message, data);
    }

    // Performance logging
    startTimer(name) {
        if (!this.isDevMode) return;
        
        const startTime = performance.now();
        this.logDebug('Performance', `Timer started: ${name}`);
        
        return {
            end: () => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                this.logInfo('Performance', `Timer ${name}: ${duration.toFixed(2)}ms`);
                return duration;
            }
        };
    }

    // Image processing specific logging
    logImageLoaded(filename, width, height, fileSize) {
        this.logSuccess('Image', `Loaded: ${filename}`, {
            dimensions: `${width}x${height}`,
            fileSize: this.formatFileSize(fileSize),
            aspectRatio: (width / height).toFixed(2)
        });
    }

    logImageProcessing(algorithm, parameters) {
        this.logInfo('Processing', `Starting ${algorithm} dithering`, parameters);
    }

    logImageProcessed(algorithm, duration, resultSize) {
        this.logSuccess('Processing', `Completed ${algorithm} dithering`, {
            duration: `${duration.toFixed(2)}ms`,
            resultSize: this.formatFileSize(resultSize),
            performance: duration < 1000 ? 'Fast' : duration < 5000 ? 'Good' : 'Slow'
        });
    }

    // User interaction logging
    logUserAction(action, details) {
        this.logInfo('User', action, details);
    }

    logCanvasInteraction(type, position, zoom) {
        this.logDebug('Canvas', `${type} interaction`, {
            position: `${position.x}, ${position.y}`,
            zoom: `${(zoom * 100).toFixed(1)}%`
        });
    }

    // Error tracking
    logFileError(filename, error) {
        this.logError('File', `Failed to load: ${filename}`, {
            error: error.message || error,
            stack: error.stack
        });
    }

    logProcessingError(algorithm, error) {
        this.logError('Processing', `${algorithm} failed`, {
            error: error.message || error,
            stack: error.stack
        });
    }

    // Session management
    getSessionSummary() {
        const duration = Date.now() - this.sessionStart.getTime();
        const logs = this.logHistory;
        
        return {
            sessionDuration: this.formatDuration(duration),
            totalLogs: logs.length,
            errorCount: logs.filter(l => l.level === 'error').length,
            warningCount: logs.filter(l => l.level === 'warning').length,
            successCount: logs.filter(l => l.level === 'success').length,
            categories: [...new Set(logs.map(l => l.category))],
            startTime: this.sessionStart.toISOString()
        };
    }

    exportSessionLog() {
        if (!this.isDevMode) return null;
        
        const summary = this.getSessionSummary();
        const logData = {
            summary,
            logs: this.logHistory
        };
        
        return JSON.stringify(logData, null, 2);
    }

    // Utility methods
    formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    }
}

// Global logger instance
window.devLogger = new DevelopmentLogger();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DevelopmentLogger;
}