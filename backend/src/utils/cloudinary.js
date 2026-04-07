import { v2 as cloudinary } from 'cloudinary';
import { logImageError } from './logger.js';
import { DEFAULT_IMAGE } from '../config/constants.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a buffer to Cloudinary with production-grade transformations.
 * Optimizes for mobile performance (WebP, scale, and auto-quality).
 */
export const uploadBufferToCloudinary = (buffer, mimetype, folder = 'course-finder/certificates') => {
  return new Promise((resolve, reject) => {
    const isPdf = mimetype === 'application/pdf';
    
    const options = { 
      folder,
      resource_type: isPdf ? 'raw' : 'image',
      transformation: isPdf ? [] : [
        { width: 400, crop: "scale" },
        { quality: "auto", fetch_format: "auto" }
      ]
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          logImageError({ message: 'Cloudinary upload failed', event: 'UPLOAD_FAILURE' });
          return reject(error);
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * PRODUCTION-GRADE SAFE FLUX: 
 * 1. Upload new image with transformation.
 * 2. Update MongoDB (persisting secure_url).
 * 3. Delete old asset ONLY if successful.
 */
export const updateCourseImage = async (courseDoc, buffer, mimetype) => {
  try {
    const oldPublicId = courseDoc.publicId;

    // 1. Upload new
    const result = await uploadBufferToCloudinary(buffer, mimetype, 'course-finder/courses');

    // 2. Persist to DB
    courseDoc.image = result.secure_url || DEFAULT_IMAGE;
    courseDoc.publicId = result.public_id; // Store for future cleanup
    await courseDoc.save();

    // 3. Clean up old asset safely (don't crash if delete fails)
    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
      } catch (err) {
        logImageError({ 
          message: `Cleanup failed for ${oldPublicId}`, 
          event: 'CLEANUP_WARN',
          url: oldPublicId 
        });
      }
    }

    return courseDoc;
  } catch (error) {
    logImageError({ message: error.message, event: 'UPDATE_COURSE_IMG_FAILURE' });
    throw new Error("Failed to update course image. Please try again.");
  }
};

/**
 * Safely deletes a file from Cloudinary 
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return;
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    if (result.result !== 'ok' && result.result !== 'not found') {
      logImageError({ 
        message: `Delete result not ok: ${result.result}`, 
        event: 'DELETE_WARN',
        url: publicId 
      });
    }
  } catch (error) {
    logImageError({ message: error.message, event: 'DELETE_ERR', url: publicId });
  }
};

export default cloudinary;
