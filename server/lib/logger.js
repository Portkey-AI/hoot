/**
 * Centralized Logger for Hoot Backend
 * 
 * Provides consistent logging interface across Node.js and Workers environments.
 * Supports DEBUG mode via environment variable.
 */

const DEBUG = process.env.DEBUG === 'true' || globalThis.DEBUG === true;
const VERBOSE = process.env.VERBOSE === 'true' || globalThis.VERBOSE === true;

/**
 * Logger utility with consistent formatting
 */
export const logger = {
    /**
     * Debug logs (only shown when DEBUG=true)
     */
    debug: (...args) => {
        if (DEBUG) {
            console.log('[DEBUG]', ...args);
        }
    },

    /**
     * Verbose logs (only shown when VERBOSE=true)
     * Use for operational details that clutter logs
     */
    verbose: (...args) => {
        if (VERBOSE) {
            console.log('[VERBOSE]', ...args);
        }
    },

    /**
     * Info logs (always shown)
     */
    info: (...args) => {
        console.log(...args);
    },

    /**
     * Warning logs (always shown)
     */
    warn: (...args) => {
        console.warn('⚠️ ', ...args);
    },

    /**
     * Error logs (always shown)
     */
    error: (...args) => {
        console.error('❌', ...args);
    },

    /**
     * Success logs (always shown)
     */
    success: (...args) => {
        console.log('✅', ...args);
    },
};

/**
 * Create a namespaced logger for a specific module
 */
export function createLogger(namespace) {
    return {
        debug: (...args) => logger.debug(`[${namespace}]`, ...args),
        verbose: (...args) => logger.verbose(`[${namespace}]`, ...args),
        info: (...args) => logger.info(`[${namespace}]`, ...args),
        warn: (...args) => logger.warn(`[${namespace}]`, ...args),
        error: (...args) => logger.error(`[${namespace}]`, ...args),
        success: (...args) => logger.success(`[${namespace}]`, ...args),
    };
}

