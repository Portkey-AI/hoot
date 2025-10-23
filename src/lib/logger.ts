/**
 * Development Logger
 * Captures all console logs and saves them to a file for debugging
 * Only active in development mode
 */

class DevelopmentLogger {
    private logs: Array<{ timestamp: string; level: string; args: any[] }> = [];
    private maxLogs = 1000; // Keep last 1000 logs
    private isEnabled = import.meta.env.DEV;

    constructor() {
        if (this.isEnabled) {
            this.interceptConsole();
            console.log('🐛 Development logger initialized. Logs are being captured.');
        }
    }

    private interceptConsole() {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        const originalInfo = console.info;
        const originalDebug = console.debug;

        console.log = (...args: any[]) => {
            this.addLog('log', args);
            originalLog.apply(console, args);
        };

        console.warn = (...args: any[]) => {
            this.addLog('warn', args);
            originalWarn.apply(console, args);
        };

        console.error = (...args: any[]) => {
            this.addLog('error', args);
            originalError.apply(console, args);
        };

        console.info = (...args: any[]) => {
            this.addLog('info', args);
            originalInfo.apply(console, args);
        };

        console.debug = (...args: any[]) => {
            this.addLog('debug', args);
            originalDebug.apply(console, args);
        };
    }

    private addLog(level: string, args: any[]) {
        if (!this.isEnabled) return;

        const timestamp = new Date().toISOString();
        this.logs.push({ timestamp, level, args });

        // Keep only the last maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    /**
     * Format logs for export
     */
    private formatLogs(): string {
        return this.logs
            .map((log) => {
                const argsStr = log.args
                    .map((arg) => {
                        if (typeof arg === 'object') {
                            try {
                                return JSON.stringify(arg, null, 2);
                            } catch {
                                return String(arg);
                            }
                        }
                        return String(arg);
                    })
                    .join(' ');
                return `[${log.timestamp}] [${log.level.toUpperCase()}] ${argsStr}`;
            })
            .join('\n');
    }

    /**
     * Download logs as a file
     */
    downloadLogs() {
        if (!this.isEnabled) {
            console.warn('Logger is not enabled in production');
            return;
        }

        const content = this.formatLogs();
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hoot-logs-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('📥 Logs downloaded successfully');
    }

    /**
     * Get logs as text
     */
    getLogs(): string {
        return this.formatLogs();
    }

    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
        console.log('🗑️ Logs cleared');
    }

    /**
     * Export logger controls to window for easy access in dev console
     */
    exposeToWindow() {
        if (!this.isEnabled) return;

        (window as any).hootLogger = {
            download: () => this.downloadLogs(),
            clear: () => this.clearLogs(),
            get: () => this.getLogs(),
            count: () => this.logs.length,
        };

        console.log(
            '🐛 Logger controls available:\n' +
            '  - hootLogger.download() - Download logs to file\n' +
            '  - hootLogger.clear() - Clear all logs\n' +
            '  - hootLogger.get() - Get logs as string\n' +
            '  - hootLogger.count() - Get log count'
        );
    }
}

// Create singleton instance
export const logger = new DevelopmentLogger();

// Expose to window in development
if (import.meta.env.DEV) {
    logger.exposeToWindow();
}

