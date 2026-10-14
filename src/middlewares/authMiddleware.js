const { supabaseAdmin } = require('../config/supabaseClient');

const ALLOWED_DOMAIN = 'iiitl.ac.in';

/**
 * Middleware that validates Supabase JWT from Authorization header.
 * Attaches req.user with the authenticated user data.
 * Also enforces that only @iiitl.ac.in emails are allowed.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized: No token provided. Please log in.'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized: Invalid or expired token. Please log in again.'
      });
    }

    // Extra guard: enforce @iiitl.ac.in domain even for existing sessions
    const email = user.email;
    const domain = email.substring(email.lastIndexOf('@') + 1);

    if (domain !== ALLOWED_DOMAIN) {
      return res.status(403).json({
        error: `Forbidden: Only @${ALLOWED_DOMAIN} email addresses are allowed.`
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;
    next();

  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({
      error: 'Internal server error during authentication.'
    });
  }
};

module.exports = authMiddleware;
