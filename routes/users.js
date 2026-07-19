const express = require('express');
const User = require('../models/User');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All user-management routes require an authenticated admin
router.use(protect, requireAdmin);

// GET /api/users
router.get('/', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'A user with that email already exists.' });

    const user = await User.create({ name, email, password, role: role || 'staff' });
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, email, role, active, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email.toLowerCase();
    if (role !== undefined) user.role = role;
    if (active !== undefined) user.active = active;
    if (password) user.password = password; // will be re-hashed by pre-save hook

    await user.save();
    res.json({ id: user._id, name: user.name, email: user.email, role: user.role, active: user.active });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  if (req.params.id === String(req.user._id)) {
    return res.status(400).json({ message: "You can't delete your own account while logged in." });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  await user.deleteOne();
  res.json({ message: 'User deleted.' });
});

module.exports = router;
