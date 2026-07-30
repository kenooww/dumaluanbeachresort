const express = require('express');
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');
const { upload, cloudinary, uploadBufferToCloudinary } = require('../utils/upload');

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

// POST /api/rooms - admin only, with optional image uploads (stored on Cloudinary)
router.post('/', protect, upload.any(), async (req, res) => {
  try {
    const { name, type, description, pricePerNight, capacity, amenities, available } = req.body;
    const uploadedFiles = Array.isArray(req.files) ? req.files.slice(0, 8) : [];

    const uploadedResults = [];
    for (const file of uploadedFiles) {
      if (!file?.buffer) continue;
      const uploaded = await uploadBufferToCloudinary(file.buffer, 'rooms', file.mimetype);
      uploadedResults.push({ imageUrl: uploaded.secure_url, imagePublicId: uploaded.public_id });
    }

    const imageUrls = uploadedResults.map((item) => item.imageUrl);
    const imagePublicIds = uploadedResults.map((item) => item.imagePublicId);

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
      image: imageUrls[0] || '',
      images: imageUrls,
      imagePublicId: imagePublicIds[0] || '',
      imagePublicIds,
    });

    res.status(201).json(room);
  } catch (err) {
    console.error('POST /api/rooms error:', err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
});

// PUT /api/rooms/:id - admin only, with optional new image uploads
router.put('/:id', protect, upload.any(), async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found.' });

    const { name, type, description, pricePerNight, capacity, amenities, available } = req.body;
    const uploadedFiles = Array.isArray(req.files) ? req.files.slice(0, 8) : [];

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

    if (uploadedFiles.length) {
      const publicIdsToDelete = [...new Set([...(room.imagePublicIds || []), room.imagePublicId].filter(Boolean))];
      await Promise.all(publicIdsToDelete.map((publicId) => cloudinary.uploader.destroy(publicId).catch(() => {})));

      const uploadedResults = [];
      for (const file of uploadedFiles) {
        if (!file?.buffer) continue;
        const uploaded = await uploadBufferToCloudinary(file.buffer, 'rooms', file.mimetype);
        uploadedResults.push({ imageUrl: uploaded.secure_url, imagePublicId: uploaded.public_id });
      }

      room.images = uploadedResults.map((item) => item.imageUrl);
      room.image = room.images[0] || '';
      room.imagePublicIds = uploadedResults.map((item) => item.imagePublicId);
      room.imagePublicId = room.imagePublicIds[0] || '';
    }

    await room.save();
    res.json(room);
  } catch (err) {
    console.error('PUT /api/rooms/:id error:', err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
});

// DELETE /api/rooms/:id - admin only
router.delete('/:id', protect, async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found.' });

  const publicIdsToDelete = [...new Set([...(room.imagePublicIds || []), room.imagePublicId].filter(Boolean))];
  await Promise.all(publicIdsToDelete.map((publicId) => cloudinary.uploader.destroy(publicId).catch(() => {})));

  await room.deleteOne();
  res.json({ message: 'Room deleted.' });
});

module.exports = router;
