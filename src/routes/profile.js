const express = require('express');
const { supabaseAdmin } = require('../config/supabaseClient');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// GET /api/profile — Get own profile
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        listings (
          id, title, price, images, condition, category_id, is_sold, created_at,
          categories ( name, icon )
        )
      `)
      .eq('id', req.userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    res.status(200).json(profile);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/profile — Update own profile
router.put('/', authMiddleware, async (req, res) => {
  const { full_name, roll_number, branch, year, hostel, phone, avatar_url } = req.body;

  try {
    // Upsert: create or update profile row
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: req.userId,
        full_name,
        roll_number,
        branch,
        year,
        hostel,
        phone,
        avatar_url,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: 'Failed to update profile.' });
    }

    res.status(200).json({ message: 'Profile updated successfully.', profile: data });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/profile/:id — Get any user's public profile
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, full_name, branch, year, hostel, avatar_url, rating, total_sales, created_at,
        listings (
          id, title, price, images, condition, is_sold, created_at,
          categories ( name, icon )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Filter out only active (non-sold) listings for public view
    if (profile.listings) {
      profile.active_listings = profile.listings.filter(l => !l.is_sold);
    }

    res.status(200).json(profile);
  } catch (err) {
    console.error('Get user profile error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
