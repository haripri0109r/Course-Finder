import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a buffer to Cloudinary via upload_stream
 * @param {Buffer} buffer - The image buffer to upload
 * @param {String} mimetype - File mimetype
 * @param {String} folder - Cloudinary folder name
 * @returns {Promise<Object>} - Resolves with the Cloudinary response object
 */
export const uploadBufferToCloudinary = (buffer, mimetype, folder = 'course-finder/certificates') => {
  return new Promise((resolve, reject) => {
    const isPdf = mimetype === 'application/pdf';
    
    const options = { folder };
    
    if (isPdf) {
      options.resource_type = 'raw';
    } else {
      options.resource_type = 'image';
      options.format = 'webp';
      options.quality = 'auto';
      options.width = 800; // Optimize for web/mobile
      options.crop = 'limit';
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    // End the buffer write stream
    uploadStream.end(buffer);
  });
};

/**
 * Safely deletes a file from Cloudinary 
 * @param {String} publicId - The public ID of the asset
 * @param {String} resourceType - 'image' or 'raw'
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return;
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    if (result.result !== 'ok' && result.result !== 'not found') {
      console.warn(`[Cloudinary Cleanup Warning]: Failed to delete ${publicId} - ${JSON.stringify(result)}`);
    }
  } catch (error) {
    console.warn(`[Cloudinary Cleanup Error]: ${error.message}`);
  }
};

export default cloudinary;
