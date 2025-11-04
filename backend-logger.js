/**
 * Backend Logger with environment-based log levels
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info'; // 'debug', 'info', 'warn', 'error'

const levels = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = levels[LOG_LEVEL] || levels.info;

export const log = {
    debug: (...args) => {
        if (currentLevel <= levels.debug) {
            console.log('[DEBUG]', ...args);
        }
    },
    info: (...args) => {
        if (currentLevel <= levels.info) {
            console.log(...args);
        }
    },
    warn: (...args) => {
        if (currentLevel <= levels.warn) {
            console.warn(...args);
        }
    },
    error: (...args) => {
        if (currentLevel <= levels.error) {
            console.error(...args);
        }
    },
};

