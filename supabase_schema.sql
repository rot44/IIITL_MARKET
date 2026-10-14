-- ================================================================
-- IIITL Market — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ================================================================

-- ─── STEP 1: Enable Extensions ───────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── STEP 2: Profiles (extends auth.users) ───────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name       TEXT,
  roll_number     TEXT UNIQUE,
  branch          TEXT,
  year            INT CHECK (year BETWEEN 1 AND 5),
  hostel          TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  rating          NUMERIC(3,2) DEFAULT 5.0,
  total_sales     INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── STEP 3: Categories ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id      SERIAL PRIMARY KEY,
  name    TEXT NOT NULL UNIQUE,
  icon    TEXT DEFAULT '📦'
);

-- Insert default IIITL-relevant categories
INSERT INTO categories (name, icon) VALUES
  ('Books', '📚'),
  ('Electronics', '💻'),
  ('Stationary', '✏️'),
  ('Sports', '⚽'),
  ('Clothing', '👕'),
  ('Daily-use', '🧴'),
  ('Hostel Essentials', '🛏️'),
  ('Others', '📦')
ON CONFLICT (name) DO NOTHING;

-- ─── STEP 4: Listings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL CHECK (price > 0),
  category_id     INT REFERENCES categories(id),
  condition       TEXT NOT NULL CHECK (condition IN ('New', 'Like New', 'Good', 'Fair', 'Poor')),
  images          TEXT[] DEFAULT '{}',
  is_sold         BOOLEAN DEFAULT FALSE,
  is_negotiable   BOOLEAN DEFAULT FALSE,
  tags            TEXT[] DEFAULT '{}',
  location        TEXT,
  views           INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_is_sold ON listings(is_sold);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);

-- ─── STEP 5: Orders ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id      UUID REFERENCES listings(id) ON DELETE SET NULL,
  buyer_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  message         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_listing ON orders(listing_id);

-- ─── STEP 6: Messages ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id        UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  sender_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content         TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_order ON messages(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- ─── STEP 7: Wishlist ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id      UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- ─── STEP 8: Reviews ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id        UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL UNIQUE,
  reviewer_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reviewee_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── STEP 9: Auto-create profile on user signup ──────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── STEP 10: Auto-update updated_at ─────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── STEP 11: Row Level Security (RLS) ───────────────────────────

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- LISTINGS
CREATE POLICY "Active listings are viewable by everyone"
  ON listings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create listings"
  ON listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own listings"
  ON listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own listings"
  ON listings FOR DELETE USING (auth.uid() = seller_id);

-- ORDERS
CREATE POLICY "Users can view orders they are part of"
  ON orders FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Authenticated buyers can create orders"
  ON orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants can update order status"
  ON orders FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- MESSAGES
CREATE POLICY "Order participants can view messages"
  ON messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = messages.order_id
        AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );
CREATE POLICY "Order participants can send messages"
  ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = messages.order_id
        AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );
CREATE POLICY "Participants can update message read status"
  ON messages FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = messages.order_id
        AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

-- WISHLIST
CREATE POLICY "Users can view own wishlist"
  ON wishlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own wishlist"
  ON wishlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove from own wishlist"
  ON wishlist FOR DELETE USING (auth.uid() = user_id);

-- REVIEWS
CREATE POLICY "Reviews are public"
  ON reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can write reviews"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- ─── STEP 12: Supabase Storage Buckets ───────────────────────────
-- Run these in Supabase Dashboard > Storage, or via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('listing-images', 'listing-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies
CREATE POLICY "Anyone can view listing images"
  ON storage.objects FOR SELECT USING (bucket_id = 'listing-images');
CREATE POLICY "Authenticated users can upload listing images"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'listing-images' AND auth.role() = 'authenticated'
  );
CREATE POLICY "Users can delete own listing images"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── STEP 13: Helper Functions ──────────────────────────────────
CREATE OR REPLACE FUNCTION increment_total_sales(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET total_sales = total_sales + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- ─── STEP 14: OTP Field in Database & Manual Login ──────────────
-- 1. Add email and last_otp to profiles table (directly viewable in Supabase Table Editor)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_otp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_otp_created_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill email from auth.users into profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- 2. Create login_otps table for tracking active verification codes
CREATE TABLE IF NOT EXISTS public.login_otps (
  email       TEXT PRIMARY KEY,
  otp         TEXT NOT NULL,
  token_hash  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes')
);

ALTER TABLE public.login_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role full access to login_otps" ON public.login_otps;
CREATE POLICY "Allow service role full access to login_otps"
  ON public.login_otps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Update trigger to automatically save email on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, last_otp)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'last_otp'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

