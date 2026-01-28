import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import Config from "./config.js";

const __dirname = Config.dirname();
const props = Config.props();

/**
 * Upload helper to manage file uploads using multer.
 */
class Upload {
    /**
     * Configures storage for uploaded files.
     * @param {string} folder - The destination folder within the static path.
     * @returns {import('multer').StorageEngine}
     */
    static storage(folder = "uploads") {
        const dest = path.join(__dirname, props.static.path, folder);

        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        return multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, dest);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
                cb(null, uniqueSuffix + path.extname(file.originalname));
            }
        });
    }

    /**
     * Returns a multer instance for single or multiple file uploads.
     * @param {Object} options - Multer options.
     * @param {string} [options.folder='uploads'] - Destination folder.
     * @param {number} [options.fileSize=5000000] - Max file size in bytes (default 5MB).
     * @param {Array<string>} [options.allowedTypes=[]] - Allowed mime types (e.g. ['image/png', 'image/jpeg']).
     * @returns {import('multer').Multer}
     */
    static disk(options = {}) {
        const { folder = "uploads", fileSize = 5000000, allowedTypes = [] } = options;

        return multer({
            storage: this.storage(folder),
            limits: { fileSize },
            fileFilter: (req, file, cb) => {
                if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
                    return cb(new Error("File type not allowed"), false);
                }
                cb(null, true);
            }
        });
    }

    /**
     * Helper to get the public URL of an uploaded file.
     * @param {string} filename - The name of the file.
     * @param {string} [folder='uploads'] - The folder where the file is stored.
     * @returns {string} The full public URL.
     */
    static url(filename, folder = "uploads") {
        return `${props.host}:${props.port}/public/${folder}/${filename}`;
    }
}

export default Upload;
