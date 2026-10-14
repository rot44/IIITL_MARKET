const express = require('express');
const { supabaseAdmin } = require('../config/supabaseClient');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// ─────────────────────────────────────────────
// GET /api/chat/order/:orderId — Get messages for an order
// ─────────────────────────────────────────────
router.get('/order/:orderId', authMiddleware, async (req, res) => {
  const { orderId } = req.params;

  try {
    // Verify user is participant in this order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('buyer_id, seller_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.buyer_id !== req.userId && order.seller_id !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: You are not part of this conversation.' });
    }

    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey ( id, full_name, avatar_url )
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: 'Failed to fetch messages.' });

    // Mark unread messages as read for the current user
    await supabaseAdmin
      .from('messages')
      .update({ is_read: true })
      .eq('order_id', orderId)
      .neq('sender_id', req.userId)
      .eq('is_read', false);

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/chat/order/:orderId — Send a message
// ─────────────────────────────────────────────
router.post('/order/:orderId', authMiddleware, async (req, res) => {
  const { orderId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content cannot be empty.' });
  }

  try {
    // Verify user is participant
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('buyer_id, seller_id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.buyer_id !== req.userId && order.seller_id !== req.userId) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    if (order.status === 'rejected' || order.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot send messages in a closed conversation.' });
    }

    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .insert({
        order_id: orderId,
        sender_id: req.userId,
        content: content.trim()
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey ( id, full_name, avatar_url )
      `)
      .single();

    if (error) {
      console.error('Send message error:', error);
      return res.status(500).json({ error: 'Failed to send message.' });
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/chat/conversations — Get all conversations for the user
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    // Get all orders where user is buyer or seller, with last message
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id, status, updated_at,
        listings ( id, title, images ),
        buyer:profiles!orders_buyer_id_fkey ( id, full_name, avatar_url ),
        seller:profiles!orders_seller_id_fkey ( id, full_name, avatar_url )
      `)
      .or(`buyer_id.eq.${req.userId},seller_id.eq.${req.userId}`)
      .in('status', ['pending', 'accepted', 'completed'])
      .order('updated_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to fetch conversations.' });

    // Get unread count for each order
    const { data: unreadCounts } = await supabaseAdmin
      .from('messages')
      .select('order_id')
      .neq('sender_id', req.userId)
      .eq('is_read', false);

    const unreadMap = {};
    if (unreadCounts) {
      unreadCounts.forEach(m => {
        unreadMap[m.order_id] = (unreadMap[m.order_id] || 0) + 1;
      });
    }

    const enriched = orders.map(o => ({
      ...o,
      unread_count: unreadMap[o.id] || 0
    }));

    res.status(200).json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
