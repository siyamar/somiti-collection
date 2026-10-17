import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('শুধুমাত্র JPG, JPEG অথবা PNG ফরম্যাটের ছবি আপলোড করা যাবে।'), false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max
  },
  fileFilter,
});

/**
 * Middleware that optimizes uploaded image with Sharp and saves it to disk
 */
export async function processPhoto(req, res, next) {
  if (!req.file) {
    return next();
  }

  try {
    const randomSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const filename = `member_${randomSuffix}.jpg`;
    const outputPath = path.join(uploadsDir, filename);

    await sharp(req.file.buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 85 })
      .toFile(outputPath);

    // Attach web-accessible relative path to req.file
    req.file.savedPath = `/uploads/${filename}`;
    req.file.savedFilename = filename;
    next();
  } catch (err) {
    console.error('Sharp photo processing error:', err);
    return res.status(400).json({
      error: {
        message: 'ছবি প্রসেসিং করতে সমস্যা হয়েছে। অনুগ্রহ করে অন্য ছবি নির্বাচন করুন।',
      },
    });
  }
}

/**
 * Middleware that processes and optimizes organization logo upload
 */
export async function processLogo(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      error: {
        message: 'লোগো ফাইল নির্বাচন করা আবশ্যক।',
      },
    });
  }

  try {
    const randomSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const filename = `logo_${randomSuffix}.png`;
    const outputPath = path.join(uploadsDir, filename);

    await sharp(req.file.buffer)
      .resize(400, 400, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png({ quality: 90 })
      .toFile(outputPath);

    // Also update frontend/public/logo.png if accessible so site-wide static logo updates
    const frontendPublicLogo = path.resolve(__dirname, '../../../frontend/public/logo.png');
    try {
      if (fs.existsSync(path.dirname(frontendPublicLogo))) {
        fs.copyFileSync(outputPath, frontendPublicLogo);
      }
    } catch (copyErr) {
      // Non-fatal if public directory is not writable
    }

    req.file.savedPath = `/uploads/${filename}`;
    req.file.savedFilename = filename;
    next();
  } catch (err) {
    console.error('Sharp logo processing error:', err);
    return res.status(400).json({
      error: {
        message: 'লোগো প্রসেসিং করতে সমস্যা হয়েছে। অনুগ্রহ করে পিএনজি বা জেপিজি ফাইল নির্বাচন করুন।',
      },
    });
  }
}

