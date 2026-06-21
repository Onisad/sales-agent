const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Save image buffer to disk and return file path
 * @param {Buffer} imageBuffer - The image buffer to save
 * @param {string} mimetype - MIME type of the image (e.g., 'image/jpeg')
 * @param {string} uploadDir - Directory to save the image (default: 'uploads')
 * @returns {Promise<string>} - File path relative to uploads directory
 */
async function saveImageToDisk(imageBuffer, mimetype = 'image/jpeg', uploadDir = 'uploads') {
    try {
        // Ensure uploads directory exists
        const fullUploadDir = path.join(__dirname, '..', uploadDir);
        if (!fs.existsSync(fullUploadDir)) {
            fs.mkdirSync(fullUploadDir, { recursive: true });
            console.log(`📁 Created uploads directory: ${fullUploadDir}`);
        }

        // Determine file extension from mimetype
        const extension = mimetype.split('/')[1] || 'jpg';
        const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        const fileExtension = validExtensions.includes(extension) ? extension : 'jpg';

        // Generate unique filename
        const timestamp = Date.now();
        const randomHash = crypto.randomBytes(4).toString('hex');
        const filename = `image_${timestamp}_${randomHash}.${fileExtension}`;
        const filepath = path.join(fullUploadDir, filename);

        // Write file to disk
        fs.writeFileSync(filepath, imageBuffer);
        console.log(`💾 Saved image to disk: ${filename} (${Math.round(imageBuffer.length / 1024)}KB)`);

        // Return relative path for database storage
        return path.join(uploadDir, filename).replace(/\\/g, '/'); // Use forward slashes for URLs
    } catch (error) {
        console.error('❌ Failed to save image to disk:', error.message);
        throw error;
    }
}

/**
 * Convert image buffer to base64 string (for APIs that require it)
 * @param {Buffer} imageBuffer - The image buffer to convert
 * @param {string} mimetype - MIME type of the image
 * @returns {string} - Base64 encoded string (without data URI prefix)
 */
function bufferToBase64(imageBuffer, mimetype = 'image/jpeg') {
    return imageBuffer.toString('base64');
}

/**
 * Convert image buffer to base64 data URI (for APIs that require it)
 * @param {Buffer} imageBuffer - The image buffer to convert
 * @param {string} mimetype - MIME type of the image
 * @returns {string} - Base64 data URI
 */
function bufferToDataUri(imageBuffer, mimetype = 'image/jpeg') {
    const base64 = bufferToBase64(imageBuffer, mimetype);
    return `data:${mimetype};base64,${base64}`;
}

/**
 * Check if a string is a data URI
 * @param {string} str - String to check
 * @returns {boolean}
 */
function isDataUri(str) {
    return typeof str === 'string' && str.startsWith('data:');
}

/**
 * Check if a string is a file path
 * @param {string} str - String to check
 * @returns {boolean}
 */
function isFilePath(str) {
    return typeof str === 'string' && !isDataUri(str) && (str.startsWith('/') || str.includes('/') || str.includes('\\'));
}

/**
 * Delete a file from disk
 * @param {string} filePath - Relative or absolute file path
 * @param {string} uploadDir - Upload directory (default: 'uploads')
 * @returns {Promise<boolean>} - True if deleted successfully, false otherwise
 */
async function deleteFile(filePath, uploadDir = 'uploads') {
    try {
        let fullPath;
        if (path.isAbsolute(filePath)) {
            fullPath = filePath;
        } else {
            // Try relative to uploads directory
            fullPath = path.join(__dirname, '..', filePath);
            // If not found, try just the filename in uploads
            if (!fs.existsSync(fullPath)) {
                const filename = path.basename(filePath);
                fullPath = path.join(__dirname, '..', uploadDir, filename);
            }
        }

        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`🗑️ Deleted file: ${path.basename(fullPath)}`);
            return true;
        } else {
            console.warn(`⚠️ File not found for deletion: ${fullPath}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Failed to delete file ${filePath}:`, error.message);
        return false;
    }
}

/**
 * Clean up old files in uploads directory
 * @param {number} maxAgeMs - Maximum age in milliseconds (default: 24 hours)
 * @param {string} uploadDir - Upload directory (default: 'uploads')
 * @returns {Promise<{deleted: number, errors: number}>} - Cleanup statistics
 */
async function cleanupOldFiles(maxAgeMs = 24 * 60 * 60 * 1000, uploadDir = 'uploads') {
    try {
        const fullUploadDir = path.join(__dirname, '..', uploadDir);
        
        if (!fs.existsSync(fullUploadDir)) {
            console.log(`📁 Uploads directory doesn't exist: ${fullUploadDir}`);
            return { deleted: 0, errors: 0 };
        }

        const files = fs.readdirSync(fullUploadDir);
        const now = Date.now();
        let deleted = 0;
        let errors = 0;

        for (const file of files) {
            const filePath = path.join(fullUploadDir, file);
            
            try {
                const stats = fs.statSync(filePath);
                const age = now - stats.mtimeMs;

                if (age > maxAgeMs) {
                    fs.unlinkSync(filePath);
                    deleted++;
                    console.log(`🗑️ Deleted old file: ${file} (age: ${Math.round(age / (60 * 60 * 1000))}h)`);
                }
            } catch (error) {
                console.error(`❌ Error processing file ${file}:`, error.message);
                errors++;
            }
        }

        if (deleted > 0 || errors > 0) {
            console.log(`🧹 Cleanup completed: ${deleted} deleted, ${errors} errors`);
        }

        return { deleted, errors };
    } catch (error) {
        console.error('❌ Failed to cleanup old files:', error.message);
        return { deleted: 0, errors: 1 };
    }
}

module.exports = {
    saveImageToDisk,
    bufferToBase64,
    bufferToDataUri,
    isDataUri,
    isFilePath,
    deleteFile,
    cleanupOldFiles
};

