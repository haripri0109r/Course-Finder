import multer from 'multer';

// Use memory storage to process the buffer and upload to Cloudinary later
const storage = multer.memoryStorage();

// Multer upload instance
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow JPEG, PNG, and PDF
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'), false);
    }
  },
});

export default upload;
