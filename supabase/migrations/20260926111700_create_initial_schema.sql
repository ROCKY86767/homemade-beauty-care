/*
# Homemade Beauty Care — Initial Schema

1. Overview
This migration creates the complete database for a natural/herbal beauty e-commerce
storefront (single-tenant, no auth). It includes categories, products, product images,
reviews, banners, orders, order items, newsletter subscribers, and contact messages.

2. New Tables
- `categories` — product categories (Hair Care, Skin Care, Face Care, Body Care, Combo, etc.)
- `products` — catalog items with price, discount, stock, images, descriptions
- `reviews` — customer reviews with rating, verified flag
- `banners` — hero slider content
- `orders` — customer orders with delivery info and payment method
- `order_items` — line items for each order
- `newsletter` — email subscribers
- `messages` — contact form submissions

3. Security
- RLS enabled on every table.
- All tables allow `anon, authenticated` CRUD (single-tenant no-auth storefront).
- `USING (true)` is intentional: this is a public storefront where the anon-key
  client manages all data. No user accounts / sign-in in this app.
*/

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_bn text NOT NULL,
  slug text UNIQUE NOT NULL,
  description_bn text,
  image_url text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_categories" ON categories;
CREATE POLICY "anon_read_categories" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_bn text NOT NULL,
  slug text UNIQUE NOT NULL,
  short_description_bn text,
  description_bn text,
  benefits_bn text,
  how_to_use_bn text,
  ingredients_bn text,
  who_is_it_for_bn text,
  storage_bn text,
  notes_bn text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  price numeric(10,2) NOT NULL,
  old_price numeric(10,2),
  stock int DEFAULT 0,
  rating numeric(2,1) DEFAULT 0,
  review_count int DEFAULT 0,
  is_best_seller boolean DEFAULT false,
  is_new boolean DEFAULT false,
  is_on_sale boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  image_url text NOT NULL,
  gallery jsonb DEFAULT '[]',
  size_bn text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_products" ON products;
CREATE POLICY "anon_read_products" ON products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  location text,
  rating int NOT NULL DEFAULT 5,
  review_bn text,
  is_verified boolean DEFAULT true,
  image_url text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_reviews" ON reviews;
CREATE POLICY "anon_read_reviews" ON reviews FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_reviews" ON reviews;
CREATE POLICY "anon_insert_reviews" ON reviews FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_reviews" ON reviews;
CREATE POLICY "anon_update_reviews" ON reviews FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_reviews" ON reviews;
CREATE POLICY "anon_delete_reviews" ON reviews FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- BANNERS
-- ============================================================
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_bn text NOT NULL,
  small_text_bn text,
  description_bn text,
  button_text_bn text,
  button_link text,
  image_url text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_banners" ON banners;
CREATE POLICY "anon_read_banners" ON banners FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_banners" ON banners;
CREATE POLICY "anon_insert_banners" ON banners FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_banners" ON banners;
CREATE POLICY "anon_update_banners" ON banners FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_banners" ON banners;
CREATE POLICY "anon_delete_banners" ON banners FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  mobile text NOT NULL,
  email text,
  district text NOT NULL,
  area text NOT NULL,
  address text NOT NULL,
  order_note text,
  delivery_method text DEFAULT 'Home Delivery',
  payment_method text DEFAULT 'Cash on Delivery',
  subtotal numeric(10,2) DEFAULT 0,
  delivery_charge numeric(10,2) DEFAULT 0,
  discount numeric(10,2) DEFAULT 0,
  grand_total numeric(10,2) DEFAULT 0,
  status text DEFAULT 'Order Placed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_orders" ON orders;
CREATE POLICY "anon_read_orders" ON orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "anon_update_orders" ON orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
CREATE POLICY "anon_delete_orders" ON orders FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  price numeric(10,2) NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  image_url text
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_order_items" ON order_items;
CREATE POLICY "anon_read_order_items" ON order_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_order_items" ON order_items;
CREATE POLICY "anon_insert_order_items" ON order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_order_items" ON order_items;
CREATE POLICY "anon_update_order_items" ON order_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_order_items" ON order_items;
CREATE POLICY "anon_delete_order_items" ON order_items FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- NEWSLETTER
-- ============================================================
CREATE TABLE IF NOT EXISTS newsletter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE newsletter ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_newsletter" ON newsletter;
CREATE POLICY "anon_read_newsletter" ON newsletter FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_newsletter" ON newsletter;
CREATE POLICY "anon_insert_newsletter" ON newsletter FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_newsletter" ON newsletter;
CREATE POLICY "anon_delete_newsletter" ON newsletter FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- MESSAGES (Contact form)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_messages" ON messages;
CREATE POLICY "anon_read_messages" ON messages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_messages" ON messages;
CREATE POLICY "anon_insert_messages" ON messages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_messages" ON messages;
CREATE POLICY "anon_delete_messages" ON messages FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
