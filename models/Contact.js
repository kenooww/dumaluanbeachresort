const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, trim: true, default: '' },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false }, // lets the admin dashboard mark messages as handled
  },
  { timestamps: true }
);

module.exports = mongoose.model('Contact', contactSchema);