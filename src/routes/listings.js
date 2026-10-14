const express = require('express');
const { supabaseAdmin } = require('../config/supabaseClient');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// VALID TAGS (mirrors College Bazaar's approach, expanded for IIITL)
const VALID_TAGS = [
  'Books', 'Electronics', 'Stationary', 'Sports',
  'Clothing', 'Daily-use', 'Hostel Essentials', 'Others'
];

const VALID_CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

// ─────────────────────────────────────────────
// GET /api/listings — Get all active listings
// Supports: ?category=, ?search=, ?min_price=, ?max_price=, ?condition=, ?sort=, ?page=, ?limit=
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      category,
      search,
      min_price,
      max_price,
      condition,
      sort = 'created_at',
      order = 'desc',
      page = 1,
      limit = 12
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabaseAdmin
      .from('listings')
      .select(`
        *,
        profiles ( id, full_name, avatar_url, rating, hostel ),
        categories ( name, icon )
      `, { count: 'exact' })
      .eq('is_sold', false)
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + parseInt(limit) - 1);

    // Filters
    if (category) query = query.eq('category_id', parseInt(category));
    if (condition && VALID_CONDITIONS.includes(condition)) {
      query = query.eq('condition', condition);
    }
    if (min_price) query = query.gte('price', parseFloat(min_price));
    if (max_price) query = query.lte('price', parseFloat(max_price));
    if (search) query = query.ilike('title', `%${search}%`);

    const { data, error, count } = await query;

    if (error) {
      console.error('Get listings error:', error);
      return res.status(500).json({ error: 'Failed to fetch listings.' });
    }

    res.status(200).json({
      listings: data,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (err) {
    console.error('Get listings error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/listings/my — Get seller's own listings (protected)
// ─────────────────────────────────────────────
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('*, categories ( name, icon )')
      .eq('seller_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to fetch your listings.' });

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/listings/:id — Single listing detail
// ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select(`
        *,
        profiles ( id, full_name, avatar_url, rating, hostel, branch, year ),
        categories ( name, icon )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Listing not found.' });

    // Increment view count (fire and forget)
    supabaseAdmin
      .from('listings')
      .update({ views: (data.views || 0) + 1 })
      .eq('id', req.params.id)
      .then(() => {});

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/listings — Create new listing (protected)
// ─────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const {
    title, description, price, category_id,
    condition, images, is_negotiable, tags, location
  } = req.body;

  // Validation (similar to College Bazaar's approach)
  if (!title || !price || !category_id || !condition) {
    return res.status(400).json({
      error: 'Bad Request: title, price, category_id, and condition are required.'
    });
  }

  if (!VALID_CONDITIONS.includes(condition)) {
    return res.status(400).json({
      error: `Invalid condition. Must be one of: ${VALID_CONDITIONS.join(', ')}`
    });
  }

  if (price <= 0) {
    return res.status(400).json({ error: 'Price must be greater than 0.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .insert({
        seller_id: req.userId,
        title: title.trim(),
        description: description?.trim(),
        price: parseFloat(price),
        category_id: parseInt(category_id),
        condition,
        images: images || [],
        is_negotiable: is_negotiable || false,
        tags: tags || [],
        location: location?.trim() || null
      })
      .select(`
        *,
        categories ( name, icon )
      `)
      .single();

    if (error) {
      console.error('Create listing error:', error);
      return res.status(500).json({ error: 'Failed to create listing.' });
    }

    res.status(201).json({
      message: 'Listing created successfully!',
      listing: data
    });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/listings/:id — Update listing (only seller)
// ─────────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    if (existing.seller_id !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own listings.' });
    }

    const {
      title, description, price, category_id,
      condition, images, is_negotiable, tags, location, is_sold
    } = req.body;

    const updates = {};
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (price) updates.price = parseFloat(price);
    if (category_id) updates.category_id = parseInt(category_id);
    if (condition && VALID_CONDITIONS.includes(condition)) updates.condition = condition;
    if (images) updates.images = images;
    if (is_negotiable !== undefined) updates.is_negotiable = is_negotiable;
    if (tags) updates.tags = tags;
    if (location !== undefined) updates.location = location;
    if (is_sold !== undefined) updates.is_sold = is_sold;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update listing.' });
    }

    res.status(200).json({ message: 'Listing updated successfully.', listing: data });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/listings/:id — Delete listing (only seller)
// ─────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    if (existing.seller_id !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own listings.' });
    }

    const { error } = await supabaseAdmin
      .from('listings')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: 'Failed to delete listing.' });

    res.status(200).json({ message: 'Listing deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/listings/categories/all
router.get('/categories/all', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('name');

    if (error) return res.status(500).json({ error: 'Failed to fetch categories.' });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
