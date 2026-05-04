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
        this._currentDay = null;
        this._currentDayFolder = null;
        if (!fs.existsSync(this.folder)) {
            fs.mkdirSync(this.folder, { recursive: true });
        }
    }

    /**
     * Ensures and returns the path to the log folder for the current day.
     * Caches the folder path for the current day to avoid repeated fs checks.
     * @returns {string} The absolute path to the current day's log folder.
     */
    nowFolder() {
        const today = this.now();

        if (this._currentDay === today && this._currentDayFolder) {
            return this._currentDayFolder;
        }

        const folder = path.join(this.folder, today);

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }

        this._currentDay = today;
        this._currentDayFolder = folder;
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
     * Appends an informational message to the info.log file (non-blocking).
     * @param {string} message - The message to log.
     */
    info(message) {
        const logFile = path.join(this.nowFolder(), 'info.log');
        fs.appendFile(logFile, `${message}\n`, (err) => {
            if (err) console.error('Logger write error:', err.message);
        });
    }

    /**
     * Appends an error message to the error.log file (non-blocking).
     * @param {string} message - The error message to log.
     */
    error(message) {
        const logFile = path.join(this.nowFolder(), 'error.log');
        fs.appendFile(logFile, `${message}\n`, (err) => {
            if (err) console.error('Logger write error:', err.message);
        });
    }

    /**
     * Appends a warning message to the warn.log file (non-blocking).
     * @param {string} message - The warning message to log.
     */
    warning(message) {
        const logFile = path.join(this.nowFolder(), 'warn.log');
        fs.appendFile(logFile, `${message}\n`, (err) => {
            if (err) console.error('Logger write error:', err.message);
        });
    }

    /**
     * Appends a debug message to the debug.log file (non-blocking).
     * @param {string} message - The debug message to log.
     */
    debug(message) {
        const logFile = path.join(this.nowFolder(), 'debug.log');
        fs.appendFile(logFile, `${message}\n`, (err) => {
            if (err) console.error('Logger write error:', err.message);
        });
    }
}

export default Logger;
