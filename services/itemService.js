const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Item = require('../models/Item');
const Category = require('../models/Category');
const { isDataUri, isFilePath, deleteFile, bufferToBase64, bufferToDataUri } = require('../utils/imageHelper');

class ItemService {
    constructor() {
        this.isConnected = false;
        // Get sales site URL from environment
        // If set, use API-based upload; otherwise fall back to file copy method
        this.salesSiteUrl = process.env.SALES_SITE_URL;
        this.useApiUpload = !!this.salesSiteUrl;

        console.log(`🔍 Image upload method check:`);
        console.log(`   SALES_SITE_URL env var: ${process.env.SALES_SITE_URL || '(not set)'}`);
        console.log(`   Resolved salesSiteUrl: ${this.salesSiteUrl || '(not set)'}`);
        console.log(`   useApiUpload: ${this.useApiUpload}`);

        if (this.useApiUpload) {
            console.log(`🔗 Using API-based image upload to: ${this.salesSiteUrl}`);
        } else {
            console.log('📁 Using file copy method for image upload (legacy)');
            console.log('   💡 To enable API upload, set SALES_SITE_URL in your .env file');
        }
    }

    async connect() {
        if (this.isConnected) return;

        try {
            await mongoose.connect(process.env.SALES_SITE_MONGODB_URI);
            this.isConnected = true;
            console.log('✅ Connected to sales site database');
        } catch (error) {
            console.error('❌ Failed to connect to sales site database:', error.message);
            throw error;
        }
    }

    async createItem(itemData) {
        try {
            await this.connect();

            // Find category by name (provided in itemData.category)
            let category = null;
            if (itemData.category) {
                // Try exact match first
                category = await Category.findOne({ name: itemData.category });
                // If not found, try case-insensitive match
                if (!category) {
                    category = await Category.findOne({ name: { $regex: new RegExp(`^${itemData.category}$`, 'i') } });
                }
            }

            // If category not found, try to find or create "Uncategorized"
            if (!category) {
                category = await Category.findOne({ name: { $regex: /^uncategorized$/i } });
                if (!category) {
                    // Create Uncategorized category if it doesn't exist
                    category = new Category({
                        name: 'Uncategorized',
                        description: 'Items that could not be categorized',
                        icon: '📦'
                    });
                    await category.save();
                    console.log(`📁 Created Uncategorized category`);
                }
            }

            // Fallback to default category from env if still not found
            if (!category && process.env.SALES_SITE_DEFAULT_CATEGORY) {
                category = await Category.findOne({ name: process.env.SALES_SITE_DEFAULT_CATEGORY });
                if (!category) {
                    category = new Category({
                        name: process.env.SALES_SITE_DEFAULT_CATEGORY,
                        description: 'Items created by sales assistant',
                        icon: '🤖'
                    });
                    await category.save();
                    console.log(`📁 Created default category: ${category.name}`);
                }
            }

            // Process images - use API upload if configured, otherwise use file copy
            let processedImages = [];
            if (itemData.images && itemData.images.length > 0) {
                console.log(`\n🖼️ Processing ${itemData.images.length} image(s) for item creation`);
                console.log(`🖼️ Upload method: ${this.useApiUpload ? 'API Upload' : 'File Copy'}`);
                console.log(`🖼️ Sales site URL: ${this.salesSiteUrl || '(not set)'}`);

                if (this.useApiUpload) {
                    // Use API-based upload
                    console.log(`🖼️ Using API upload method`);
                    processedImages = await this.uploadImagesViaApi(itemData.images);
                } else {
                    // Use file copy method (legacy)
                    console.log(`🖼️ Using file copy method (legacy)`);
                    for (const imageData of itemData.images) {
                        if (!imageData) continue;

                        // Handle Buffers by saving them to disk first
                        if (Buffer.isBuffer(imageData)) {
                            console.log('📸 Received Buffer in file copy mode - saving to disk first...');
                            try {
                                const { saveImageToDisk } = require('../utils/imageHelper');
                                const savedPath = await saveImageToDisk(imageData, 'image/jpeg');
                                console.log(`📁 Saved image path: ${savedPath}`);

                                // Process the saved file path - copy to sales site
                                const convertedPath = await this.copyImageToSalesSite(savedPath);
                                if (convertedPath) {
                                    console.log(`✅ Image converted to: ${convertedPath}`);
                                    processedImages.push(convertedPath);
                                } else {
                                    console.warn(`⚠️ Image copy failed, using original path: ${savedPath}`);
                                    processedImages.push(savedPath);
                                }
                            } catch (error) {
                                console.error('❌ Failed to save Buffer to disk:', error.message);
                                console.error('Stack:', error.stack);
                                // Skip this image if we can't save it
                                continue;
                            }
                            continue;
                        }

                        if (isFilePath(imageData)) {
                            const convertedPath = await this.copyImageToSalesSite(imageData);
                            if (convertedPath) {
                                processedImages.push(convertedPath);
                            } else {
                                processedImages.push(imageData);
                            }
                        } else if (isDataUri(imageData)) {
                            console.log('⚠️ Storing base64 data URI (legacy format)');
                            processedImages.push(imageData);
                        } else if (typeof imageData === 'string') {
                            // Try as file path
                            const convertedPath = await this.copyImageToSalesSite(imageData);
                            if (convertedPath) {
                                processedImages.push(convertedPath);
                            } else {
                                processedImages.push(imageData);
                            }
                        } else {
                            console.warn('⚠️ Unknown image data type, skipping:', typeof imageData);
                        }
                    }
                }
            }

            // Create the item
            const item = new Item({
                title: itemData.title,
                description: itemData.description,
                price: itemData.price,
                category: category._id,
                images: processedImages,
                condition: itemData.condition || 'good',
                location: itemData.location || process.env.SALES_SITE_DEFAULT_LOCATION,
                contactEmail: itemData.contactEmail || process.env.SALES_SITE_CONTACT_EMAIL,
                isPublished: false // Create as draft by default
            });

            const savedItem = await item.save();
            console.log(`✅ Created item: ${savedItem.title} (ID: ${savedItem._id})`);

            return {
                success: true,
                item: savedItem,
                message: `Item "${savedItem.title}" created successfully as draft`
            };
        } catch (error) {
            console.error('❌ Failed to create item:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Upload images via sales site API
     * @param {Array<string|Buffer>} images - Array of image paths, buffers, or base64 data URIs
     * @returns {Promise<Array<string>>} - Array of image URLs returned from API
     */
    async uploadImagesViaApi(images) {
        const uploadId = Date.now().toString(36);
        try {
            console.log(`\n📤 [${uploadId}] Starting API upload to ${this.salesSiteUrl}`);
            console.log(`📤 [${uploadId}] Uploading ${images.length} image(s) via API...`);

            // Convert all images to data URI format (required by sales site API)
            const dataUriImages = [];
            for (const image of images) {
                if (!image) continue;

                let dataUriImage;

                if (Buffer.isBuffer(image)) {
                    // If it's a buffer, convert to data URI (default to jpeg)
                    dataUriImage = bufferToDataUri(image, 'image/jpeg');
                } else if (isDataUri(image)) {
                    // If it's already a data URI, use it as-is
                    dataUriImage = image;
                } else if (isFilePath(image)) {
                    // If it's a file path, read and convert to data URI
                    let sourcePath;
                    if (path.isAbsolute(image)) {
                        sourcePath = image;
                    } else {
                        sourcePath = path.join(__dirname, '..', image);
                        if (!fs.existsSync(sourcePath)) {
                            const filename = path.basename(image);
                            sourcePath = path.join(__dirname, '..', 'uploads', filename);
                        }
                    }

                    if (fs.existsSync(sourcePath)) {
                        // Read file using stream for better memory efficiency
                        const imageBuffer = await new Promise((resolve, reject) => {
                            const chunks = [];
                            const readStream = fs.createReadStream(sourcePath);

                            readStream.on('data', (chunk) => {
                                chunks.push(chunk);
                            });

                            readStream.on('error', (error) => {
                                console.error(`❌ Error reading file stream: ${sourcePath}`, error.message);
                                reject(error);
                            });

                            readStream.on('end', () => {
                                resolve(Buffer.concat(chunks));
                            });
                        });

                        // Detect MIME type from file extension
                        const ext = path.extname(sourcePath).toLowerCase();
                        const mimeTypes = {
                            '.jpg': 'image/jpeg',
                            '.jpeg': 'image/jpeg',
                            '.png': 'image/png',
                            '.gif': 'image/gif',
                            '.webp': 'image/webp'
                        };
                        const mimeType = mimeTypes[ext] || 'image/jpeg';
                        console.log(`📖 Read file via stream: ${path.basename(sourcePath)} (${Math.round(imageBuffer.length / 1024)}KB, ${mimeType})`);
                        dataUriImage = bufferToDataUri(imageBuffer, mimeType);
                    } else {
                        console.warn(`⚠️ Image file not found: ${sourcePath}, skipping`);
                        continue;
                    }
                } else if (typeof image === 'string') {
                    // If it's a plain base64 string, convert to data URI
                    // Check if it looks like base64 (alphanumeric, +, /, =)
                    if (/^[A-Za-z0-9+/=]+$/.test(image)) {
                        dataUriImage = `data:image/jpeg;base64,${image}`;
                    } else {
                        // Assume it's already a URL or data URI
                        dataUriImage = image;
                    }
                } else {
                    console.warn('⚠️ Unknown image data type, skipping:', typeof image);
                    continue;
                }

                dataUriImages.push(dataUriImage);
            }

            if (dataUriImages.length === 0) {
                console.warn('⚠️ No valid images to upload');
                return [];
            }

            // Upload images via API
            const uploadUrl = `${this.salesSiteUrl}/api/upload-images`;
            console.log(`📤 [${uploadId}] POST request to: ${uploadUrl}`);
            console.log(`📤 [${uploadId}] Sending ${dataUriImages.length} data URI(s), total size: ~${Math.round(dataUriImages.reduce((sum, img) => sum + img.length, 0) / 1024)}KB`);

            const response = await axios.post(uploadUrl, {
                images: dataUriImages
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            });

            console.log(`📥 [${uploadId}] Response received:`, {
                status: response.status,
                statusText: response.statusText,
                hasData: !!response.data,
                imageCount: response.data?.images?.length || 0
            });

            if (response.data && response.data.images && Array.isArray(response.data.images)) {
                console.log(`✅ [${uploadId}] Successfully uploaded ${response.data.images.length} image(s) via API`);
                console.log(`✅ [${uploadId}] Returned image paths:`, response.data.images);
                return response.data.images;
            } else {
                console.error(`❌ [${uploadId}] Invalid response structure:`, response.data);
                throw new Error('Invalid response from upload API');
            }
        } catch (error) {
            console.error(`❌ [${uploadId}] Failed to upload images via API:`, error.message);
            if (error.response) {
                console.error(`❌ [${uploadId}] Response status:`, error.response.status);
                console.error(`❌ [${uploadId}] Response data:`, error.response.data);
                console.error(`❌ [${uploadId}] Response headers:`, error.response.headers);
            } else if (error.request) {
                console.error(`❌ [${uploadId}] No response received. Request details:`, {
                    url: error.config?.url,
                    method: error.config?.method,
                    timeout: error.code === 'ECONNABORTED' ? 'Request timeout' : 'Unknown'
                });
            }
            console.error(`❌ [${uploadId}] Error stack:`, error.stack);
            throw new Error(`Image upload failed: ${error.message}`);
        }
    }

    /**
     * Copy image to sales site (legacy method - file system copy)
     * @param {string} imagePath - Path to image file
     * @returns {Promise<string|null>} - Public URL path or null if failed
     */
    async copyImageToSalesSite(imagePath) {
        try {
            // Validate input - must be a string
            if (!imagePath || typeof imagePath !== 'string') {
                throw new Error(`Invalid image path: expected string, got ${typeof imagePath}`);
            }

            // Handle both relative and absolute paths
            let sourcePath;
            if (path.isAbsolute(imagePath)) {
                sourcePath = imagePath;
            } else {
                // Try relative to uploads directory first
                sourcePath = path.join(__dirname, '..', imagePath);
                // If not found, try just the filename in uploads
                if (!fs.existsSync(sourcePath)) {
                    const filename = path.basename(imagePath);
                    sourcePath = path.join(__dirname, '..', 'uploads', filename);
                }
            }

            // Verify source file exists
            if (!fs.existsSync(sourcePath)) {
                console.warn(`⚠️ Source image not found: ${sourcePath}`);
                return null;
            }

            // Extract filename from path
            const filename = path.basename(sourcePath);

            // Define destination paths - resolve to absolute path
            // __dirname is services/, so go up to onisad-sales-assist/, then to sibling onisad-sales-site/
            // We need to go: services -> .. -> onisad-sales-assist -> .. -> onisad-sales-site -> public -> uploads
            const salesSitePublicPath = path.resolve(__dirname, '..', '..', 'onisad-sales-site', 'public', 'uploads');
            const destinationPath = path.join(salesSitePublicPath, filename);

            console.log(`📂 Source file: ${sourcePath}`);
            console.log(`📂 Source exists: ${fs.existsSync(sourcePath)}`);
            console.log(`📂 Destination directory: ${salesSitePublicPath}`);
            console.log(`📂 Destination exists: ${fs.existsSync(salesSitePublicPath)}`);
            console.log(`📂 Destination file: ${destinationPath}`);

            // Create uploads directory in sales site if it doesn't exist
            if (!fs.existsSync(salesSitePublicPath)) {
                fs.mkdirSync(salesSitePublicPath, { recursive: true });
                console.log(`📁 Created uploads directory: ${salesSitePublicPath}`);
            }

            // Copy the file using streams for better memory efficiency
            await new Promise((resolve, reject) => {
                const sourceStats = fs.statSync(sourcePath);
                console.log(`📋 Starting stream copy: ${filename} (${Math.round(sourceStats.size / 1024)}KB)`);

                const readStream = fs.createReadStream(sourcePath);
                const writeStream = fs.createWriteStream(destinationPath);

                let bytesCopied = 0;

                readStream.on('data', (chunk) => {
                    bytesCopied += chunk.length;
                });

                readStream.on('error', (error) => {
                    console.error(`❌ Read stream error: ${error.message}`);
                    writeStream.destroy();
                    reject(error);
                });

                writeStream.on('error', (error) => {
                    console.error(`❌ Write stream error: ${error.message}`);
                    readStream.destroy();
                    reject(error);
                });

                writeStream.on('finish', () => {
                    console.log(`📋 Stream copy completed: ${Math.round(bytesCopied / 1024)}KB copied`);
                    resolve();
                });

                readStream.pipe(writeStream);
            });

            // Verify the copy was successful
            if (fs.existsSync(destinationPath)) {
                const sourceStats = fs.statSync(sourcePath);
                const destStats = fs.statSync(destinationPath);
                console.log(`✅ Verified copy: ${filename} (${Math.round(destStats.size / 1024)}KB)`);

                if (sourceStats.size !== destStats.size) {
                    console.warn(`⚠️ File size mismatch: source=${sourceStats.size}, dest=${destStats.size}`);
                }
            } else {
                const errorMsg = `Copy failed: destination file not found after copy. Expected: ${destinationPath}`;
                console.error(`❌ ${errorMsg}`);
                throw new Error(errorMsg);
            }

            // Delete the source file after successful copy
            try {
                await deleteFile(sourcePath);
            } catch (error) {
                console.warn(`⚠️ Failed to delete source file after copy: ${error.message}`);
                // Don't fail the operation if cleanup fails
            }

            return `/uploads/${filename}`; // Return the public URL path
        } catch (error) {
            console.error('❌ Failed to copy image to sales site:', error.message);
            console.error('Stack:', error.stack);
            return null;
        }
    }

    async findCategoryByName(name) {
        try {
            await this.connect();
            return await Category.findOne({ name: { $regex: new RegExp(name, 'i') } });
        } catch (error) {
            console.error('❌ Failed to find category:', error.message);
            return null;
        }
    }

    async getAllCategories() {
        try {
            await this.connect();
            return await Category.find().sort({ name: 1 });
        } catch (error) {
            console.error('❌ Failed to get categories:', error.message);
            return [];
        }
    }

    async disconnect() {
        if (this.isConnected) {
            await mongoose.disconnect();
            this.isConnected = false;
            console.log('🔌 Disconnected from sales site database');
        }
    }
}

module.exports = new ItemService();
