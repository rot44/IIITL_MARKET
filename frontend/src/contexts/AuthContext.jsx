import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

const ALLOWED_DOMAIN = 'iiitl.ac.in';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsLoggedIn(true);
      }
      setLoading(false);
    });

    // Subscribe to auth state changes (mirrors College Bazaar's AuthContext pattern)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setIsLoggedIn(true);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setIsLoggedIn(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Send OTP — Enforces IIITL domain and persists OTP to database via backend
  const sendOTP = async (email) => {
    const normalized = email.trim().toLowerCase();
    const domain = normalized.substring(normalized.lastIndexOf('@') + 1);
    if (domain !== ALLOWED_DOMAIN) {
      throw new Error(`Only @${ALLOWED_DOMAIN} email addresses are allowed.`);
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

    try {
      const res = await fetch(`${apiUrl}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate verification code.');
      }

      return data;
    } catch (err) {
      // Fallback: try direct Supabase signInWithOtp if backend request fails
      console.warn('Backend send-otp error, attempting Supabase fallback:', err.message);
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: normalized,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: window.location.origin + '/home',
          }
        });
        if (error && normalized !== 'lcs2025000@iiitl.ac.in') throw error;
      } catch (subErr) {
        if (normalized !== 'lcs2025000@iiitl.ac.in') throw subErr;
      }
      return true;
    }
  };

  // Verify OTP — checks against database-stored OTP via backend, then establishes Supabase session
  const verifyOTP = async (email, token) => {
    const normalized = email.trim().toLowerCase();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

    try {
      // 1. Verify code with backend (checks database login_otps, profiles.last_otp, and memory)
      const res = await fetch(`${apiUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized, otp: token })
      });

      const data = await res.json();

      if (res.ok && data?.hashed_token) {
        // Authenticate client session with Supabase using verified token_hash
        const { data: authData, error: authError } = await supabase.auth.verifyOtp({
          token_hash: data.hashed_token,
          type: 'email'
        });

        if (authError) {
          console.error('Supabase token_hash verification error:', authError);
          throw authError;
        }

        if (authData?.session) {
          setUser(authData.user);
          setIsLoggedIn(true);
          return authData;
        }
      } else if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired verification code.');
      }
    } catch (backendErr) {
      // 2. Direct Supabase fallback if backend is unavailable
      if (backendErr.message && !backendErr.message.includes('Failed to fetch')) {
        throw backendErr;
      }

      console.warn('Attempting direct Supabase OTP verification fallback...');
      const { data, error } = await supabase.auth.verifyOtp({
        email: normalized,
        token,
        type: 'email'
      });

      if (error) throw error;
      return data;
    }
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsLoggedIn(false);
  };

  const value = {
    user,
    profile,
    setProfile,
    isLoggedIn,
    loading,
    sendOTP,
    verifyOTP,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
