const express = require('express');
const { supabaseAdmin } = require('../config/supabaseClient');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// GET /api/wishlist — Get user's wishlist
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('wishlist')
      .select(`
        id, created_at,
        listings (
          id, title, price, images, condition, is_sold,
          profiles ( id, full_name ),
          categories ( name, icon )
        )
      `)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to fetch wishlist.' });

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/wishlist/:listingId — Add to wishlist (like College Bazaar's heart button)
router.post('/:listingId', authMiddleware, async (req, res) => {
  const { listingId } = req.params;

  try {
    // Check listing exists
    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('id')
      .eq('id', listingId)
      .single();

    if (!listing) return res.status(404).json({ error: 'Listing not found.' });

    const { data, error } = await supabaseAdmin
      .from('wishlist')
      .insert({ user_id: req.userId, listing_id: listingId })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (already in wishlist)
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Item already in wishlist.' });
      }
      return res.status(500).json({ error: 'Failed to add to wishlist.' });
    }

    res.status(201).json({ message: 'Added to wishlist!', wishlist: data });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/wishlist/:listingId — Remove from wishlist
router.delete('/:listingId', authMiddleware, async (req, res) => {
  const { listingId } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('wishlist')
      .delete()
      .eq('user_id', req.userId)
      .eq('listing_id', listingId);

    if (error) return res.status(500).json({ error: 'Failed to remove from wishlist.' });

    res.status(200).json({ message: 'Removed from wishlist.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/wishlist/check/:listingId — Check if listing is in user's wishlist
router.get('/check/:listingId', authMiddleware, async (req, res) => {
  const { listingId } = req.params;

  try {
    const { data } = await supabaseAdmin
      .from('wishlist')
      .select('id')
      .eq('user_id', req.userId)
      .eq('listing_id', listingId)
      .single();

    res.status(200).json({ in_wishlist: !!data });
  } catch (err) {
    res.status(200).json({ in_wishlist: false });
  }
});

module.exports = router;
