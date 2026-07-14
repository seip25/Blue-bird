import fs from "node:fs";
import path from "node:path";
import Config from "./config.js";
import { getRedisClient } from "./cache.js";

const __dirname = Config.dirname();

/**
 * Logger class for managing application logs by creating dated folders and log files.
 */
class Logger {
  /**
   * Initializes the Logger instance and ensures the logs directory exists.
   */
  constructor() {
    this.folder = path.join(__dirname, "backend", "logs");
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
   * Logs a message to the specified log file or Redis list.
   * @private
   * @param {string} file - The file name to log to.
   * @param {string} level - The log level (e.g. info, error, warn, debug).
   * @param {string} message - The log message.
   */
  async _log(file, level, message) {
    const redisClient = getRedisClient();
    if (redisClient) {
      try {
        await redisClient.lPush(`bluebird:logs:${level}`, message);
        return;
      } catch (err) {
        console.error(
          `[LOGGER ERROR] Failed to write to Redis logs (${level}):`,
          err.message,
        );
      }
    }

    const logFile = path.join(this.nowFolder(), file);
    fs.appendFile(logFile, `${message}\n`, (err) => {
      if (err) console.error("Logger write error:", err.message);
    });
  }

  /**
   * Appends an informational message.
   * @param {string} message - The message to log.
   */
  info(message) {
    this._log("info.log", "info", message);
  }

  /**
   * Appends an error message.
   * @param {string} message - The error message to log.
   */
  error(message) {
    this._log("error.log", "error", message);
  }

  /**
   * Appends a warning message.
   * @param {string} message - The warning message to log.
   */
  warning(message) {
    this._log("warn.log", "warn", message);
  }

  /**
   * Appends a debug message.
   * @param {string} message - The debug message to log.
   */
  debug(message) {
    this._log("debug.log", "debug", message);
  }
}

export default Logger;
