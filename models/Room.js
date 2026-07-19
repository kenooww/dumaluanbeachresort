const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['Beachfront Bungalow', 'Garden Villa', 'Overwater Suite', 'Family Cabana', 'Standard Room'],
      default: 'Standard Room',
    },
    description: { type: String, required: true },
    pricePerNight: { type: Number, required: true, min: 0 },
    capacity: { type: Number, required: true, min: 1, default: 2 },
    amenities: [{ type: String, trim: true }],
    image: { type: String, default: '' }, // Cloudinary secure_url
    imagePublicId: { type: String, default: '' }, // Cloudinary public_id, needed to delete/replace the file
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
