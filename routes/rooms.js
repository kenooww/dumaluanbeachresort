const express = require('express');
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');
const { upload, cloudinary } = require('../utils/upload');

const router = express.Router();

// GET /api/rooms - public, used by the landing page
router.get('/', async (req, res) => {
  const rooms = await Room.find().sort({ createdAt: -1 });
  res.json(rooms);
});

// GET /api/rooms/:id - public
router.get('/:id', async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found.' });
  res.json(room);
});

// POST /api/rooms - admin only, with optional image upload (stored on Cloudinary)
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    const { name, type, description, pricePerNight, capacity, amenities, available } = req.body;

    const room = await Room.create({
      name,
      type,
      description,
      pricePerNight,
      capacity,
      available: available === undefined ? true : available === 'true' || available === true,
      amenities: amenities
        ? String(amenities)
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean)
        : [],
      image: req.file ? req.file.path : '', // Cloudinary secure_url
      imagePublicId: req.file ? req.file.filename : '', // Cloudinary public_id
    });

    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/rooms/:id - admin only, with optional new image upload
router.put('/:id', protect, upload.single('image'), async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found.' });

    const { name, type, description, pricePerNight, capacity, amenities, available } = req.body;

    if (name !== undefined) room.name = name;
    if (type !== undefined) room.type = type;
    if (description !== undefined) room.description = description;
    if (pricePerNight !== undefined) room.pricePerNight = pricePerNight;
    if (capacity !== undefined) room.capacity = capacity;
    if (available !== undefined) room.available = available === 'true' || available === true;
    if (amenities !== undefined) {
      room.amenities = String(amenities)
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
    }

    if (req.file) {
      // remove the old Cloudinary image if there was one, then swap in the new one
      if (room.imagePublicId) {
        cloudinary.uploader.destroy(room.imagePublicId).catch(() => {});
      }
      room.image = req.file.path;
      room.imagePublicId = req.file.filename;
    }

    await room.save();
    res.json(room);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/rooms/:id - admin only
router.delete('/:id', protect, async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found.' });

  if (room.imagePublicId) {
    cloudinary.uploader.destroy(room.imagePublicId).catch(() => {});
  }

  await room.deleteOne();
  res.json({ message: 'Room deleted.' });
});

module.exports = router;
