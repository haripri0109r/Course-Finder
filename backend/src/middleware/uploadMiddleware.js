import multer from 'multer';

// Use memory storage to process the buffer and upload to Cloudinary later
const storage = multer.memoryStorage();

// Multer upload instance
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow JPEG, PNG, WEBP, and PDF
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed.'), false);
    }
  },
});

export default upload;
