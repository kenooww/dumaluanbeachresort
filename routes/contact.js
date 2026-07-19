const express = require('express');
const Contact = require('../models/Contact');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /api/contact - public, called by the "Get in Touch" form
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email and message are required.' });
    }

    const contact = await Contact.create({ name, email, subject, message });
    res.status(201).json({ message: 'Thanks - we got your message and will reply by email soon.', id: contact._id });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Everything below is for the admin dashboard to review submitted messages
router.use(protect);

// GET /api/contact - list all submissions, newest first
router.get('/', async (req, res) => {
  const messages = await Contact.find().sort({ createdAt: -1 });
  res.json(messages);
});

// PATCH /api/contact/:id - mark a message as read/unread
router.patch('/:id', async (req, res) => {
  const contact = await Contact.findById(req.params.id);
  if (!contact) return res.status(404).json({ message: 'Message not found.' });
  if (req.body.read !== undefined) contact.read = req.body.read === true || req.body.read === 'true';
  await contact.save();
  res.json(contact);
});

// DELETE /api/contact/:id
router.delete('/:id', async (req, res) => {
  const contact = await Contact.findById(req.params.id);
  if (!contact) return res.status(404).json({ message: 'Message not found.' });
  await contact.deleteOne();
  res.json({ message: 'Message deleted.' });
});

module.exports = router;