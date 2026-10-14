const express = require('express');
const { supabaseAdmin } = require('../config/supabaseClient');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// ─────────────────────────────────────────────
// POST /api/orders — Create a purchase request (buyer sends to seller)
// ─────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { listing_id, message } = req.body;

  if (!listing_id) {
    return res.status(400).json({ error: 'listing_id is required.' });
  }

  try {
    // Fetch the listing to get seller_id
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('id, seller_id, is_sold, title')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    if (listing.is_sold) {
      return res.status(400).json({ error: 'This item has already been sold.' });
    }

    // Prevent seller from buying their own item
    if (listing.seller_id === req.userId) {
      return res.status(400).json({ error: 'You cannot purchase your own listing.' });
    }

    // Check if buyer already has a pending order for this listing
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('listing_id', listing_id)
      .eq('buyer_id', req.userId)
      .eq('status', 'pending')
      .single();

    if (existingOrder) {
      return res.status(400).json({
        error: 'You already have a pending purchase request for this item.'
      });
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert({
        listing_id,
        buyer_id: req.userId,
        seller_id: listing.seller_id,
        message: message?.trim() || null,
        status: 'pending'
      })
      .select(`
        *,
        listings ( id, title, price, images ),
        buyer:profiles!orders_buyer_id_fkey ( id, full_name, avatar_url ),
        seller:profiles!orders_seller_id_fkey ( id, full_name, avatar_url )
      `)
      .single();

    if (error) {
      console.error('Create order error:', error);
      return res.status(500).json({ error: 'Failed to create purchase request.' });
    }

    res.status(201).json({
      message: 'Purchase request sent successfully!',
      order
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/orders — Get all orders for current user (both buyer + seller)
// ─────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  const { role } = req.query; // 'buyer' | 'seller' | undefined (both)

  try {
    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        listings ( id, title, price, images, condition ),
        buyer:profiles!orders_buyer_id_fkey ( id, full_name, avatar_url, hostel ),
        seller:profiles!orders_seller_id_fkey ( id, full_name, avatar_url, hostel )
      `)
      .order('created_at', { ascending: false });

    if (role === 'buyer') {
      query = query.eq('buyer_id', req.userId);
    } else if (role === 'seller') {
      query = query.eq('seller_id', req.userId);
    } else {
      query = query.or(`buyer_id.eq.${req.userId},seller_id.eq.${req.userId}`);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch orders.' });
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/orders/:id — Get single order (buyer or seller only)
// ─────────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        listings ( * ),
        buyer:profiles!orders_buyer_id_fkey ( * ),
        seller:profiles!orders_seller_id_fkey ( * )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Only buyer or seller can view the order
    if (order.buyer_id !== req.userId && order.seller_id !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: Access denied.' });
    }

    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/orders/:id/status — Update order status
// Seller can: accept, reject
// Buyer can: cancel
// Either can: complete (after acceptance)
// ─────────────────────────────────────────────
router.put('/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['accepted', 'rejected', 'completed', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  try {
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Permission checks
    if (order.buyer_id !== req.userId && order.seller_id !== req.userId) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    // Role-based status transitions
    if ((status === 'accepted' || status === 'rejected') && order.seller_id !== req.userId) {
      return res.status(403).json({ error: 'Only the seller can accept or reject requests.' });
    }

    if (status === 'cancelled' && order.buyer_id !== req.userId) {
      return res.status(403).json({ error: 'Only the buyer can cancel their request.' });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    const { data: updated, error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update order status.' });

    // If completed, mark listing as sold
    if (status === 'completed') {
      await supabaseAdmin
        .from('listings')
        .update({ is_sold: true })
        .eq('id', order.listing_id);
    }

    res.status(200).json({ message: `Order ${status} successfully.`, order: updated });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
