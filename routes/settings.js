const express = require('express');
const Settings = require('../models/Settings');

const { protect } = require('../middleware/auth');
const { upload, cloudinary } = require('../utils/upload'); // same helper used by rooms/posts

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
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 },
    { name: 'sliderImages', maxCount: 10 },
    { name: 'aboutImages', maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      let settings = await Settings.findOne();
      if (!settings) settings = new Settings();

      const fields = [
        'companyName', 'tagline',
        'aboutUs','aboutUs2', 'mission', 'vision', 'yearEstablished',
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

      if (Array.isArray(sliderItemsPayload)) {
        const files = req.files?.sliderImages || [];
        let uploadCount = 0;
        const finalSliderItems = sliderItemsPayload.reduce((acc, item, idx) => {
          if (!item) return acc;
          const sliderText = String(item.sliderText || '').trim();
          const sliderSubtitle = String(item.sliderSubtitle || '').trim();
          let imageUrl = String(item.imageUrl || '').trim();
          let imagePublicId = String(item.imagePublicId || '').trim();

          if (item.newImageIndex !== undefined && files[item.newImageIndex]) {
            const file = files[item.newImageIndex];
            if (imagePublicId && imagePublicId !== file.filename) {
              cloudinary.uploader.destroy(imagePublicId).catch(() => {});
            }
            imageUrl = file.path;
            imagePublicId = file.filename;
          } else if (uploadCount < files.length && !imageUrl) {
            const file = files[uploadCount];
            imageUrl = file.path;
            imagePublicId = file.filename;
            uploadCount += 1;
          }

          if (!imageUrl) return acc;
          acc.push({ imageUrl, imagePublicId, sliderText, sliderSubtitle });
          return acc;
        }, []);

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
        const finalAboutImages = aboutImagesPayload.reduce((acc, item) => {
          if (!item) return acc;
          let imageUrl = String(item.imageUrl || '').trim();
          let imagePublicId = String(item.imagePublicId || '').trim();

          if (item.newImageIndex !== undefined && files[item.newImageIndex]) {
            const file = files[item.newImageIndex];
            if (imagePublicId && imagePublicId !== file.filename) {
              cloudinary.uploader.destroy(imagePublicId).catch(() => {});
            }
            imageUrl = file.path;
            imagePublicId = file.filename;
          } else if (uploadCount < files.length && !imageUrl) {
            const file = files[uploadCount];
            imageUrl = file.path;
            imagePublicId = file.filename;
            uploadCount += 1;
          }

          if (!imageUrl) return acc;
          acc.push({ imageUrl, imagePublicId });
          return acc;
        }, []);

        const existingPublicIds = new Set((finalAboutImages || []).map((item) => item.imagePublicId).filter(Boolean));
        (settings.aboutImages || []).forEach((oldItem) => {
          if (oldItem.imagePublicId && !existingPublicIds.has(oldItem.imagePublicId)) {
            cloudinary.uploader.destroy(oldItem.imagePublicId).catch(() => {});
          }
        });

        settings.aboutImages = finalAboutImages;
      }

      if (req.files?.logo?.[0]) {
        if (settings.logoPublicId) {
          cloudinary.uploader.destroy(settings.logoPublicId).catch(() => {});
        }
        settings.logoUrl = req.files.logo[0].path;
        settings.logoPublicId = req.files.logo[0].filename;
      }
      if (req.files?.favicon?.[0]) {
        if (settings.faviconPublicId) {
          cloudinary.uploader.destroy(settings.faviconPublicId).catch(() => {});
        }
        settings.faviconUrl = req.files.favicon[0].path;
        settings.faviconPublicId = req.files.favicon[0].filename;
      }

      await settings.save();
      res.json(settings);
    } catch (err) {
      console.error('Settings save failed:', err);
      res.status(500).json({
        message: err.message || 'Unable to save settings.',
        ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
      });
    }
  }
);

module.exports = router;