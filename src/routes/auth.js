const express = require('express');
const { supabaseAdmin } = require('../config/supabaseClient');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
const ALLOWED_DOMAIN = 'iiitl.ac.in';

// In-memory OTP storage for rapid lookup and fallback
// Map<email, { otp, hashed_token, expiresAt, createdAt }>
const otpStore = new Map();

// Whitelist of allowed testing accounts
const TEST_ACCOUNTS = ['lcs2025000@iiitl.ac.in'];

/**
 * POST /api/auth/send-otp
 * Generates a 6-digit OTP, stores it in the database (login_otps, profiles.last_otp, and auth.users metadata),
 * and logs it clearly to the console for easy verification.
 */
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  const normalized = email?.trim().toLowerCase();

  if (!normalized) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  // Strict domain check — only IIITL emails allowed
  const domain = normalized.substring(normalized.lastIndexOf('@') + 1);
  if (domain !== ALLOWED_DOMAIN) {
    return res.status(400).json({
      error: `Only @${ALLOWED_DOMAIN} institutional email IDs are allowed.`
    });
  }

  try {
    // 1. Generate Supabase magic link / auth token
    const linkRes = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: normalized,
    });

    if (linkRes.error) {
      console.error('Error generating auth link:', linkRes.error);
      return res.status(500).json({ error: 'Failed to initiate login session.' });
    }

    const hashed_token = linkRes.data?.properties?.hashed_token;
    const user = linkRes.data?.user;

    // 2. Generate a clean 6-digit OTP code
    // For test account, we also allow standard 6-digit or preset
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // 3. Save to in-memory store
    otpStore.set(normalized, {
      otp,
      hashed_token,
      expiresAt: expiresAt.getTime(),
      createdAt: new Date().toISOString()
    });

    // 4. Update Supabase Auth user metadata (viewable in Supabase Dashboard > Authentication > Users)
    if (user?.id) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            last_otp: otp,
            last_otp_time: new Date().toISOString(),
            email_verified: true
          }
        });
      } catch (metaErr) {
        console.warn('Could not update user metadata:', metaErr.message);
      }
    }

    // 5. Update profiles table (viewable in Supabase Dashboard > Table Editor > profiles)
    if (user?.id) {
      try {
        await supabaseAdmin.from('profiles').update({
          email: normalized,
          last_otp: otp,
          last_otp_created_at: new Date().toISOString()
        }).eq('id', user.id);
      } catch (profErr) {
        console.warn('Note: profiles table last_otp update notice:', profErr.message);
      }
    }

    // 6. Update login_otps table (viewable in Supabase Dashboard > Table Editor > login_otps)
    try {
      await supabaseAdmin.from('login_otps').upsert({
        email: normalized,
        otp,
        token_hash: hashed_token,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      });
    } catch (dbErr) {
      console.warn('Note: login_otps table notice (run STEP 14 in SQL Editor if table not yet created):', dbErr.message);
    }

    // 7. Clear terminal logging for manual inspection
    console.log('\n======================================================');
    console.log('🔑 [CAMPUS AUTH OTP GENERATED]');
    console.log(`📧 User:   ${normalized}`);
    console.log(`👉 OTP:    ${otp}`);
    console.log(`💾 Saved:  Database (profiles.last_otp, login_otps, auth metadata)`);
    console.log(`⏰ Expiry: 15 minutes (${expiresAt.toLocaleTimeString()})`);
    console.log('======================================================\n');

    res.status(200).json({
      success: true,
      message: `OTP sent to ${normalized}. Enter the 6-digit code.`,
      email: normalized,
      // Include OTP in non-production responses for instant developer convenience
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });

  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Server error generating OTP.' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verifies the 6-digit OTP entered manually by the user against database / memory.
 * Returns the Supabase session token_hash for client authentication.
 */
router.post('/verify-otp', async (req, res) => {
  const { email, otp, code, token } = req.body;
  const normalized = email?.trim().toLowerCase();
  const enteredOtp = (otp || code || token || '').trim();

  if (!normalized || !enteredOtp) {
    return res.status(400).json({ error: 'Email and OTP code are required.' });
  }

  try {
    let valid = false;
    let hashed_token = null;

    // Check 1: In-memory store
    const memEntry = otpStore.get(normalized);
    if (memEntry && memEntry.expiresAt > Date.now()) {
      if (memEntry.otp === enteredOtp) {
        valid = true;
        hashed_token = memEntry.hashed_token;
      }
    }

    // Check 2: Database table public.login_otps
    if (!valid) {
      try {
        const { data: dbEntry } = await supabaseAdmin
          .from('login_otps')
          .select('*')
          .eq('email', normalized)
          .single();

        if (dbEntry && dbEntry.otp === enteredOtp) {
          if (!dbEntry.expires_at || new Date(dbEntry.expires_at) > new Date()) {
            valid = true;
            hashed_token = dbEntry.token_hash;
          }
        }
      } catch (e) {
        // Table might not exist yet
      }
    }

    // Check 3: Database table public.profiles
    if (!valid) {
      try {
        const { data: profEntry } = await supabaseAdmin
          .from('profiles')
          .select('last_otp')
          .eq('email', normalized)
          .single();

        if (profEntry && profEntry.last_otp === enteredOtp) {
          valid = true;
        }
      } catch (e) {
        // Column might not exist yet
      }
    }

    // Check 4: Supabase Auth user metadata
    if (!valid) {
      try {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const user = users?.find(u => u.email === normalized);
        if (user?.user_metadata?.last_otp === enteredOtp) {
          valid = true;
        }
      } catch (e) {
        // Fallback
      }
    }

    // Check 5: Master test bypass for designated test accounts
    if (!valid && TEST_ACCOUNTS.includes(normalized) && (enteredOtp === '000000' || enteredOtp === '123456')) {
      valid = true;
    }

    if (!valid) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // If hashed_token is missing or old, generate a fresh valid token_hash from Supabase Admin
    if (!hashed_token) {
      const linkRes = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: normalized
      });
      hashed_token = linkRes.data?.properties?.hashed_token;
    }

    // Clear from active store on successful use
    otpStore.delete(normalized);

    res.status(200).json({
      success: true,
      hashed_token,
      email: normalized
    });

  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Server error during OTP verification.' });
  }
});

/**
 * GET /api/auth/latest-otp
 * Quick endpoint to view the latest OTP for an email (great for dev testing/verification)
 */
router.get('/latest-otp', async (req, res) => {
  const { email } = req.query;
  const normalized = email?.trim().toLowerCase();

  if (!normalized) {
    return res.status(400).json({ error: 'Email query parameter required.' });
  }

  // 1. From memory
  const mem = otpStore.get(normalized);
  if (mem) {
    return res.status(200).json({
      email: normalized,
      otp: mem.otp,
      expiresAt: new Date(mem.expiresAt).toISOString(),
      source: 'memory'
    });
  }

  // 2. From login_otps table
  try {
    const { data: dbEntry } = await supabaseAdmin
      .from('login_otps')
      .select('otp, created_at, expires_at')
      .eq('email', normalized)
      .single();

    if (dbEntry) {
      return res.status(200).json({
        email: normalized,
        otp: dbEntry.otp,
        createdAt: dbEntry.created_at,
        expiresAt: dbEntry.expires_at,
        source: 'login_otps'
      });
    }
  } catch (e) {}

  // 3. From profiles table
  try {
    const { data: profEntry } = await supabaseAdmin
      .from('profiles')
      .select('last_otp, last_otp_created_at')
      .eq('email', normalized)
      .single();

    if (profEntry?.last_otp) {
      return res.status(200).json({
        email: normalized,
        otp: profEntry.last_otp,
        createdAt: profEntry.last_otp_created_at,
        source: 'profiles'
      });
    }
  } catch (e) {}

  res.status(404).json({ error: `No active OTP found for ${normalized}.` });
});

/**
 * POST /api/auth/test-login
 * Kept for backward compatibility
 */
router.post('/test-login', async (req, res) => {
  const { email } = req.body;
  const normalized = email?.trim().toLowerCase();

  if (!normalized || !TEST_ACCOUNTS.includes(normalized)) {
    return res.status(403).json({ error: 'Not an allowed test account.' });
  }

  try {
    const linkRes = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: normalized
    });

    if (linkRes.error) {
      return res.status(500).json({ error: linkRes.error.message });
    }

    res.status(200).json({
      success: true,
      hashed_token: linkRes.data?.properties?.hashed_token,
      email_otp: linkRes.data?.properties?.email_otp,
      email: normalized
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error generating test token.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Failed to fetch user profile.' });
    }

    res.status(200).json({
      user: req.user,
      profile: profile || null
    });
  } catch (err) {
    console.error('Me route error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  res.status(200).json({ message: 'Logged out successfully.' });
});

module.exports = router;
