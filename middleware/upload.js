const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Only these extensions are allowed by the file filter
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

///////////////////////////////

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },

    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, uniqueName + ext);
    },
});

///////////////////////////////

// Builds an error that the central error handler will send back as a 400
const buildFilterError = (message) => {
    const error = new Error(message);
    error.status = 400;
    return error;
};

///////////////////////////////

// File Filter -> only allows image extensions (.png, .jpg, .jpeg)
const fileFilter = (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return cb(
            buildFilterError(
                `Invalid file type "${extension || 'unknown'}". Only ${ALLOWED_EXTENSIONS.join(', ')} images are allowed.`
            )
        );
    }

    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
        return cb(
            buildFilterError(
                `Invalid MIME type "${file.mimetype}". Only ${ALLOWED_EXTENSIONS.join(', ')} images are allowed.`
            )
        );
    }

    cb(null, true);
};

///////////////////////////////

const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
    fileFilter: fileFilter,
});

module.exports = upload;
module.exports.ALLOWED_EXTENSIONS = ALLOWED_EXTENSIONS;
module.exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
module.exports.UPLOAD_DIR = UPLOAD_DIR;