import fs from "node:fs";
import path from "node:path";
import Config from "./config.js"

const __dirname = Config.dirname()

/**
 * Logger class for managing application logs by creating dated folders and log files.
 */
class Logger {

    /**
     * Initializes the Logger instance and ensures the logs directory exists.
     */
    constructor() {
        this.folder = path.join(__dirname, "logs");
        if (!fs.existsSync(this.folder)) {
            fs.mkdirSync(this.folder, { recursive: true });
        }
    }

    /**
     * Ensures and returns the path to the log folder for the current day.
     * @returns {string} The absolute path to the current day's log folder.
     */
    nowFolder() {
        const folder = path.join(this.folder, this.now());

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
        return folder;
    }

    /**
     * Gets the current date formatted as YYYY-MM-DD.
     * @returns {string} The formatted date string.
     */
    now() {
        return new Date().toISOString().split("T")[0];
    }

    /**
     * Appends an informational message to the info.log file.
     * @param {string} message - The message to log.
     */
    info(message) {
        const logFile = path.join(this.nowFolder(), 'info.log');
        fs.appendFileSync(logFile, `${message}\n`);
    }

    /**
     * Appends an error message to the error.log file.
     * @param {string} message - The error message to log.
     */
    error(message) {
        const logFile = path.join(this.nowFolder(), 'error.log');
        fs.appendFileSync(logFile, `${message}\n`);
    }

    /**
     * Appends a warning message to the warn.log file.
     * @param {string} message - The warning message to log.
     */
    warning(message) {
        const logFile = path.join(this.nowFolder(), 'warn.log');
        fs.appendFileSync(logFile, `${message}\n`);
    }

    /**
     * Appends a debug message to the debug.log file.
     * @param {string} message - The debug message to log.
     */
    debug(message) {
        const logFile = path.join(this.nowFolder(), 'debug.log');
        fs.appendFileSync(logFile, `${message}\n`);
    }
}

export default Logger;
