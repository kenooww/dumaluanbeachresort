const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: '' },
    tagline: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    logoPublicId: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    faviconPublicId: { type: String, default: '' },

    aboutUs: { type: String, default: '' },
    aboutUs2: { type: String, default: '' },
    aboutImages: [
      {
        imageUrl: { type: String, default: '' },
        imagePublicId: { type: String, default: '' },
      },
    ],
    foodsTitle: { type: String, default: '' },
    foodsDescription: { type: String, default: '' },
    foodsDescription2: { type: String, default: '' },
    foodsImages: [
      {
        imageUrl: { type: String, default: '' },
        imagePublicId: { type: String, default: '' },
      },
    ],
    mission: { type: String, default: '' },
    vision: { type: String, default: '' },
    yearEstablished: { type: Number },

    address: { type: String, default: '' },
    city: { type: String, default: '' },
    province: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: '' },
    phone: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    email: { type: String, default: '' },
    reservationsEmail: { type: String, default: '' },
    latitude: { type: String, default: '' },
    longitude: { type: String, default: '' },
    mapsEmbedUrl: { type: String, default: '' },

    checkInTime: { type: String, default: '' },
    checkOutTime: { type: String, default: '' },
    frontDeskHours: { type: String, default: '' },
    cancellationPolicy: { type: String, default: '' },
    termsAndConditions: { type: String, default: '' },
    privacyPolicy: { type: String, default: '' },

    facebookUrl: { type: String, default: '' },
    instagramUrl: { type: String, default: '' },
    tiktokUrl: { type: String, default: '' },
    youtubeUrl: { type: String, default: '' },
    twitterUrl: { type: String, default: '' },
    tripadvisorUrl: { type: String, default: '' },

    sliderItems: [
      {
        imageUrl: { type: String, default: '' },
        imagePublicId: { type: String, default: '' },
        sliderText: { type: String, default: '' },
        sliderSubtitle: { type: String, default: '' },
      },
    ],

    currency: { type: String, default: '' },
    paymentMethods: { type: String, default: '' },
    bankDetails: { type: String, default: '' },

    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    metaKeywords: { type: String, default: '' },

    footerText: { type: String, default: '' },
    copyrightText: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);