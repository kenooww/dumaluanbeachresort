const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');

const cloudinaryConfig = process.env.CLOUDINARY_URL
  ? { cloudinary_url: process.env.CLOUDINARY_URL }
  : {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    };

cloudinary.config(cloudinaryConfig);

const storage = multer.memoryStorage();
const upload = multer({ storage });
const blogUpload = multer({ storage });
const settingsUpload = multer({ storage });

async function uploadBufferToCloudinary(buffer, folder, mimeType = 'image/jpeg') {
  if (!buffer) throw new Error('No file buffer provided for Cloudinary upload.');
  const hasCloudinaryConfig = Boolean(process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET));
  if (!hasCloudinaryConfig) {
    throw new Error('Cloudinary credentials are not configured on the server. Set CLOUDINARY_URL or the CLOUDINARY_* variables in Vercel.');
  }

  const base64 = Buffer.isBuffer(buffer) ? buffer.toString('base64') : Buffer.from(buffer).toString('base64');
  const dataUri = `data:${mimeType || 'image/jpeg'};base64,${base64}`;

  return cloudinary.uploader.upload(dataUri, {
    folder: `amihan-cove/${folder}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    resource_type: 'image',
    transformation: [{ width: 1400, height: 1400, crop: 'limit' }],
  });
}

module.exports = { upload, blogUpload, settingsUpload, cloudinary, uploadBufferToCloudinary };
