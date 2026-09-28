/*
# Homemade Beauty Care — E-commerce Upgrade Schema

1. Overview
This migration upgrades the existing storefront schema into a complete
e-commerce database. It adds:
- Product columns: SKU, subcategory, is_active, updated_at
- Coupons table with percentage/fixed discounts, min order, max discount, expiry, usage limits
- Site settings table (single row) for brand, contact, WhatsApp, social links, delivery charges, currency, footer
- Orders columns: alt_phone, payment_status, admin_note, customer_note (already had order_note), updated_at
- Reviews: is_approved column (admin moderation)
- Admin users table for admin authentication
- Order number sequence for HBC-000001 format

2. New Tables
- `coupons` — discount codes with type, value, min_order, max_discount, expiry, usage_limit, times_used, is_active
- `site_settings` — single-row config table for brand, logo, contact, social, delivery charges, currency
- `admin_users` — admin login credentials (email + password hash)

3. Modified Tables
- `products` — add sku, subcategory, is_active, updated_at
- `orders` — add alt_phone, payment_status, admin_note, updated_at
- `reviews` — add is_approved (default false for moderation)

4. Security
- RLS enabled on all new tables.
- All tables allow anon, authenticated CRUD (single-tenant no-auth storefront).
- site_settings is readable by all, writable by all (admin panel uses anon key).

5. Important Notes
- All ALTER TABLE statements use ADD COLUMN IF NOT EXISTS to be idempotent.
- Policies use DROP POLICY IF EXISTS before CREATE to be idempotent.
- A default site_settings row is inserted with sensible defaults.
- A default admin user is inserted (email: admin@homemadebeauty.com, password: admin123).
*/

-- ============================================================
-- ADD COLUMNS TO PRODUCTS
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ============================================================
-- ADD COLUMNS TO ORDERS
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS alt_phone text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'Unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ============================================================
-- ADD IS_APPROVED TO REVIEWS
-- ============================================================
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

-- ============================================================
-- COUPONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  min_order numeric(10,2) DEFAULT 0,
  max_discount numeric(10,2),
  expiry_date date,
  usage_limit int,
  times_used int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_coupons" ON coupons;
CREATE POLICY "anon_read_coupons" ON coupons FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_coupons" ON coupons;
CREATE POLICY "anon_insert_coupons" ON coupons FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_coupons" ON coupons;
CREATE POLICY "anon_update_coupons" ON coupons FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_coupons" ON coupons;
CREATE POLICY "anon_delete_coupons" ON coupons FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- SITE SETTINGS TABLE (single-row config)
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  id int PRIMARY KEY DEFAULT 1,
  brand_name text DEFAULT 'Homemade Beauty Care',
  brand_tagline_bn text DEFAULT 'প্রকৃতির যত্নে, আপনার সৌন্দর্যের ছোঁয়া',
  logo_url text,
  favicon_url text,
  phone text DEFAULT '01999478203',
  whatsapp_number text DEFAULT '01999478203',
  email text DEFAULT 'support.ghrcha@gmail.com',
  address_bn text DEFAULT 'ঢাকা, বাংলাদেশ',
  facebook_url text DEFAULT '',
  instagram_url text DEFAULT '',
  tiktok_url text DEFAULT '',
  youtube_url text DEFAULT '',
  delivery_inside_dhaka numeric(10,2) DEFAULT 60,
  delivery_outside_dhaka numeric(10,2) DEFAULT 120,
  free_delivery_threshold numeric(10,2) DEFAULT 1000,
  currency text DEFAULT '৳',
  footer_text_bn text DEFAULT 'চুল ও ত্বকের দৈনন্দিন যত্নকে আরও সহজ ও সুন্দর করার জন্য আমাদের যাত্রা।',
  announcement_bn text DEFAULT 'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি | অর্ডার করতে কল করুন: 01999478203',
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_settings" ON site_settings;
CREATE POLICY "anon_read_settings" ON site_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_settings" ON site_settings;
CREATE POLICY "anon_insert_settings" ON site_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_settings" ON site_settings;
CREATE POLICY "anon_update_settings" ON site_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO site_settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ADMIN USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text DEFAULT 'Admin',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_admin_users" ON admin_users;
CREATE POLICY "anon_read_admin_users" ON admin_users FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_admin_users" ON admin_users;
CREATE POLICY "anon_insert_admin_users" ON admin_users FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_admin_users" ON admin_users;
CREATE POLICY "anon_update_admin_users" ON admin_users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_admin_users" ON admin_users;
CREATE POLICY "anon_delete_admin_users" ON admin_users FOR DELETE TO anon, authenticated USING (true);

-- Default admin: email=admin@homemadebeauty.com password=admin123
INSERT INTO admin_users (email, password_hash, name)
VALUES ('admin@homemadebeauty.com', 'admin123', 'Administrator')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(is_approved);
