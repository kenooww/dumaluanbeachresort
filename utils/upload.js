const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function ensureCloudinaryConfigured() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the deployment environment.');
  }
}

ensureCloudinaryConfigured();

function makeUpload(folder) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `amihan-cove/${folder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      // keep uploaded photos to a sane max size instead of storing giant originals
      transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
    },
  });

  return multer({
    storage,
  });
}

const upload = makeUpload('rooms');
const blogUpload = makeUpload('blog');
const settingsUpload = makeUpload('settings');

module.exports = { upload, blogUpload, settingsUpload, cloudinary };
