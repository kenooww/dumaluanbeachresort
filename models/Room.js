const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        'Dalmacia Room',
        'Family Deluxe Room',
        'Standard Deluxe Room',
        'Standard Family Room',
        'Standard Room',
        'Beachfront Bungalow',
        'Garden Villa',
        'Overwater Suite',
        'Family Cabana',
      ],
      default: 'Standard Room',
    },
    description: { type: String, required: true },
    pricePerNight: { type: Number, required: true, min: 0 },
    capacity: { type: Number, required: true, min: 1, default: 2 },
    amenities: [{ type: String, trim: true }],
    image: { type: String, default: '' }, // primary/thumbnail image
    images: [{ type: String, default: [] }],
    imagePublicId: { type: String, default: '' }, // Cloudinary public_id for the primary image
    imagePublicIds: [{ type: String, default: [] }],
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
