// logger.js
const Logger = {
    logLevel: 'debug',

    // Utility to print log depending on the level
    print(level, ...args) {
        if (this.shouldLog(level)) {
            console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}]:`, ...args);
        }
    },

    // Determine if the log should be displayed based on the current log level
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    },

    // Specific methods for each log type
    debug(...args) {
        this.print('debug', ...args);
    },

    info(...args) {
        this.print('info', ...args);
    },

    warn(...args) {
        this.print('warn', ...args);
    },

    error(...args) {
        this.print('error', ...args);
    },
};

export default Logger;
