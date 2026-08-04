const express = require('express');
const Settings = require('../models/Settings');

const { protect } = require('../middleware/auth');
const { settingsUpload, cloudinary, uploadBufferToCloudinary } = require('../utils/upload');

const router = express.Router();

// GET /api/settings - public, used by the landing page (logo, contact info, etc.)
// Settings is a singleton — create the default doc on first read if none exists yet.
router.get('/', async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  res.json(settings);
});

// PUT /api/settings - admin only
router.put(
  '/',
  protect,
  settingsUpload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 },
    { name: 'sliderImages', maxCount: 10 },
    { name: 'aboutImages', maxCount: 10 },
    { name: 'foodsImages', maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      let settings = await Settings.findOne();
      if (!settings) settings = new Settings();

      const fields = [
        'companyName', 'tagline',
        'aboutUs','aboutUs2', 'foodsTitle', 'foodsDescription', 'foodsDescription2', 'mission', 'vision', 'yearEstablished',
        'address', 'city', 'province', 'postalCode', 'country',
        'phone', 'whatsapp', 'email', 'reservationsEmail',
        'latitude', 'longitude', 'mapsEmbedUrl',
        'checkInTime', 'checkOutTime', 'frontDeskHours',
        'cancellationPolicy', 'termsAndConditions', 'privacyPolicy',
        'facebookUrl', 'instagramUrl', 'tiktokUrl', 'youtubeUrl', 'twitterUrl', 'tripadvisorUrl',
        'currency', 'paymentMethods', 'bankDetails',
        'metaTitle', 'metaDescription', 'metaKeywords',
        'footerText', 'copyrightText',
      ];

      fields.forEach((field) => {
        if (req.body[field] !== undefined) settings[field] = req.body[field];
      });

      const sliderItemsPayload = (() => {
        const raw = typeof req.body.sliderItems === 'string' ? req.body.sliderItems.trim() : req.body.sliderItems;
        if (!raw) return null;
        if (Array.isArray(raw)) return raw;
        try {
          return JSON.parse(raw);
        } catch (parseErr) {
          console.error('Invalid sliderItems payload:', parseErr, raw);
          return null;
        }
      })();

      const aboutImagesPayload = (() => {
        const raw = typeof req.body.aboutImagesData === 'string'
          ? req.body.aboutImagesData.trim()
          : (req.body.aboutImagesData || req.body.aboutImages);
        if (!raw) return null;
        if (Array.isArray(raw)) return raw;
        try {
          return JSON.parse(raw);
        } catch (parseErr) {
          console.error('Invalid aboutImages payload:', parseErr, raw);
          return null;
        }
      })();

      const foodsImagesPayload = (() => {
        const raw = typeof req.body.foodsImagesData === 'string'
          ? req.body.foodsImagesData.trim()
          : (req.body.foodsImagesData || req.body.foodsImages);
        if (!raw) return null;
        if (Array.isArray(raw)) return raw;
        try {
          return JSON.parse(raw);
        } catch (parseErr) {
          console.error('Invalid foodsImages payload:', parseErr, raw);
          return null;
        }
      })();

      if (req.body.sliderItems) {
        console.debug('sliderItems raw payload:', req.body.sliderItems);
      }
      if (req.files?.sliderImages) {
        console.debug('sliderImages count:', req.files.sliderImages.length, 'names:', req.files.sliderImages.map((f) => f.originalname));
      }
      if (req.body.aboutImagesData) {
        console.debug('aboutImages raw payload:', req.body.aboutImagesData);
      }
      if (req.files?.aboutImages) {
        console.debug('aboutImages count:', req.files.aboutImages.length, 'names:', req.files.aboutImages.map((f) => f.originalname));
      }
      if (req.files?.foodsImages) {
        console.debug('foodsImages count:', req.files.foodsImages.length, 'names:', req.files.foodsImages.map((f) => f.originalname));
      }

      if (Array.isArray(sliderItemsPayload)) {
        const files = req.files?.sliderImages || [];
        let uploadCount = 0;
        const finalSliderItems = [];

        for (const item of sliderItemsPayload) {
          if (!item) continue;
          const sliderText = String(item.sliderText || '').trim();
          const sliderSubtitle = String(item.sliderSubtitle || '').trim();
          let imageUrl = String(item.imageUrl || '').trim();
          let imagePublicId = String(item.imagePublicId || '').trim();

          if (item.newImageIndex !== undefined && files[item.newImageIndex]) {
            const file = files[item.newImageIndex];
            if (imagePublicId && imagePublicId !== file.originalname) {
              cloudinary.uploader.destroy(imagePublicId).catch(() => {});
            }
            const uploaded = await uploadBufferToCloudinary(file.buffer, 'settings');
            imageUrl = uploaded.secure_url;
            imagePublicId = uploaded.public_id;
          } else if (uploadCount < files.length && !imageUrl) {
            const file = files[uploadCount];
            const uploaded = await uploadBufferToCloudinary(file.buffer, 'settings');
            imageUrl = uploaded.secure_url;
            imagePublicId = uploaded.public_id;
            uploadCount += 1;
          }

          if (!imageUrl) continue;
          finalSliderItems.push({ imageUrl, imagePublicId, sliderText, sliderSubtitle });
        }

        const existingPublicIds = new Set((finalSliderItems || []).map((item) => item.imagePublicId).filter(Boolean));
        (settings.sliderItems || []).forEach((oldItem) => {
          if (oldItem.imagePublicId && !existingPublicIds.has(oldItem.imagePublicId)) {
            cloudinary.uploader.destroy(oldItem.imagePublicId).catch(() => {});
          }
        });

        settings.sliderItems = finalSliderItems;
      }

      if (Array.isArray(aboutImagesPayload)) {
        const files = req.files?.aboutImages || [];
        let uploadCount = 0;
        const finalAboutImages = [];

        for (const item of aboutImagesPayload) {
          if (!item) continue;
          let imageUrl = String(item.imageUrl || '').trim();
          let imagePublicId = String(item.imagePublicId || '').trim();

          if (item.newImageIndex !== undefined && files[item.newImageIndex]) {
            const file = files[item.newImageIndex];
            if (imagePublicId && imagePublicId !== file.originalname) {
              cloudinary.uploader.destroy(imagePublicId).catch(() => {});
            }
            const uploaded = await uploadBufferToCloudinary(file.buffer, 'settings');
            imageUrl = uploaded.secure_url;
            imagePublicId = uploaded.public_id;
          } else if (uploadCount < files.length && !imageUrl) {
            const file = files[uploadCount];
            const uploaded = await uploadBufferToCloudinary(file.buffer, 'settings');
            imageUrl = uploaded.secure_url;
            imagePublicId = uploaded.public_id;
            uploadCount += 1;
          }

          if (!imageUrl) continue;
          finalAboutImages.push({ imageUrl, imagePublicId });
        }

        const existingPublicIds = new Set((finalAboutImages || []).map((item) => item.imagePublicId).filter(Boolean));
        (settings.aboutImages || []).forEach((oldItem) => {
          if (oldItem.imagePublicId && !existingPublicIds.has(oldItem.imagePublicId)) {
            cloudinary.uploader.destroy(oldItem.imagePublicId).catch(() => {});
          }
        });

        settings.aboutImages = finalAboutImages;
      }

      if (Array.isArray(foodsImagesPayload)) {
        const files = req.files?.foodsImages || [];
        let uploadCount = 0;
        const finalFoodsImages = [];

        for (const item of foodsImagesPayload) {
          if (!item) continue;
          let imageUrl = String(item.imageUrl || '').trim();
          let imagePublicId = String(item.imagePublicId || '').trim();

          if (item.newImageIndex !== undefined && files[item.newImageIndex]) {
            const file = files[item.newImageIndex];
            if (imagePublicId && imagePublicId !== file.originalname) {
              cloudinary.uploader.destroy(imagePublicId).catch(() => {});
            }
            const uploaded = await uploadBufferToCloudinary(file.buffer, 'settings', file.mimetype);
            imageUrl = uploaded.secure_url;
            imagePublicId = uploaded.public_id;
          } else if (uploadCount < files.length && !imageUrl) {
            const file = files[uploadCount];
            const uploaded = await uploadBufferToCloudinary(file.buffer, 'settings', file.mimetype);
            imageUrl = uploaded.secure_url;
            imagePublicId = uploaded.public_id;
            uploadCount += 1;
          }

          if (!imageUrl) continue;
          finalFoodsImages.push({ imageUrl, imagePublicId });
        }

        const existingPublicIds = new Set((finalFoodsImages || []).map((item) => item.imagePublicId).filter(Boolean));
        (settings.foodsImages || []).forEach((oldItem) => {
          if (oldItem.imagePublicId && !existingPublicIds.has(oldItem.imagePublicId)) {
            cloudinary.uploader.destroy(oldItem.imagePublicId).catch(() => {});
          }
        });

        settings.foodsImages = finalFoodsImages;
      }

      if (req.files?.logo?.[0]) {
        if (settings.logoPublicId) {
          cloudinary.uploader.destroy(settings.logoPublicId).catch(() => {});
        }
        const uploaded = await uploadBufferToCloudinary(req.files.logo[0].buffer, 'settings', req.files.logo[0].mimetype);
        settings.logoUrl = uploaded.secure_url;
        settings.logoPublicId = uploaded.public_id;
      }
      if (req.files?.favicon?.[0]) {
        if (settings.faviconPublicId) {
          cloudinary.uploader.destroy(settings.faviconPublicId).catch(() => {});
        }
        const uploaded = await uploadBufferToCloudinary(req.files.favicon[0].buffer, 'settings', req.files.favicon[0].mimetype);
        settings.faviconUrl = uploaded.secure_url;
        settings.faviconPublicId = uploaded.public_id;
      }

      await settings.save();
      res.json(settings);
    } catch (err) {
      console.error('Settings save failed:', err);
      const message = err?.code === 'LIMIT_FILE_SIZE'
        ? 'Upload failed because the file is too large.'
        : (err?.message || 'Unable to save settings.');

      res.status(500).json({
        message,
        error: err?.name || 'UnknownError',
        ...(process.env.NODE_ENV !== 'production' ? { stack: err?.stack } : {}),
      });
    }
  }
);

module.exports = router;