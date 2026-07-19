const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'Resort News' },
    excerpt: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    author: { type: String, trim: true, default: 'Amihan Cove' },
    image: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BlogPost', blogPostSchema);
