const express = require('express');
const BlogPost = require('../models/BlogPost');
const { protect } = require('../middleware/auth');
const { blogUpload, cloudinary, uploadBufferToCloudinary } = require('../utils/upload');

const router = express.Router();

// GET /api/blog-posts - public, newest published posts first
router.get('/', async (req, res) => {
  const posts = await BlogPost.find({ published: true }).sort({ createdAt: -1 });
  res.json(posts);
});

// GET /api/blog-posts/recent - public
router.get('/recent', async (req, res) => {
  const posts = await BlogPost.find({ published: true }).sort({ createdAt: -1 }).limit(5);
  res.json(posts);
});

// GET /api/blog-posts/category - public
router.get('/category', async (req, res) => {
  const posts = await BlogPost.aggregate([
    { $match: { published: true } },
    { $sort: { createdAt: -1 } }, // newest first
    {
      $group: {
        _id: "$category",      // group by category
        post: { $first: "$$ROOT" } // take the newest post in each category
      }
    },
    { $replaceRoot: { newRoot: "$post" } },
    { $sort: { createdAt: -1 } }, // sort again after grouping
    { $limit: 5 }
  ]);

  res.json(posts);
});

// GET /api/blog-posts/admin/all - admin, includes drafts
router.get('/admin/all', protect, async (req, res) => {
  const posts = await BlogPost.find().sort({ createdAt: -1 });
  res.json(posts);
});

// GET /api/blog-posts/:id - public
router.get('/:id', async (req, res) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post || (!post.published && req.query.preview !== 'true')) {
    return res.status(404).json({ message: 'Blog post not found.' });
  }
  res.json(post);
});

// Everything below is admin only
router.use(protect);

router.post('/', blogUpload.single('image'), async (req, res) => {
  try {
    const { title, category, excerpt, content, author, published } = req.body;
    let image = '';
    let imagePublicId = '';

    if (req.file?.buffer) {
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, 'blog', req.file.mimetype);
      image = uploaded.secure_url;
      imagePublicId = uploaded.public_id;
    }

    const post = await BlogPost.create({
      title,
      category,
      excerpt,
      content,
      author,
      published: published === undefined ? true : published === 'true' || published === true,
      image,
      imagePublicId,
    });
    res.status(201).json(post);
  } catch (err) {
    console.error('POST /api/blog-posts error:', err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
});

router.put('/:id', blogUpload.single('image'), async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Blog post not found.' });

    const { title, category, excerpt, content, author, published } = req.body;
    if (title !== undefined) post.title = title;
    if (category !== undefined) post.category = category;
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (content !== undefined) post.content = content;
    if (author !== undefined) post.author = author;
    if (published !== undefined) post.published = published === 'true' || published === true;

    if (req.file?.buffer) {
      if (post.imagePublicId) {
        cloudinary.uploader.destroy(post.imagePublicId).catch(() => {});
      }
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, 'blog', req.file.mimetype);
      post.image = uploaded.secure_url;
      post.imagePublicId = uploaded.public_id;
    }

    await post.save();
    res.json(post);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Blog post not found.' });

  if (post.imagePublicId) {
    cloudinary.uploader.destroy(post.imagePublicId).catch(() => {});
  }

  await post.deleteOne();
  res.json({ message: 'Blog post deleted.' });
});

module.exports = router;
