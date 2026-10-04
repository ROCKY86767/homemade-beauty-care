export interface Category {
  id: string;
  name_en: string;
  name_bn: string;
  slug: string;
  description_bn: string | null;
  image_url: string | null;
  desktop_image_url: string | null;
  mobile_image_url: string | null;
  start_at: string | null;
  end_at: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name_en: string;
  name_bn: string;
  slug: string;
  short_description_bn: string | null;
  description_bn: string | null;
  benefits_bn: string | null;
  how_to_use_bn: string | null;
  ingredients_bn: string | null;
  who_is_it_for_bn: string | null;
  storage_bn: string | null;
  notes_bn: string | null;
  category_id: string | null;
  subcategory: string | null;
  price: number;
  old_price: number | null;
  stock: number;
  sku: string | null;
  is_active: boolean;
  rating: number;
  review_count: number;
  is_best_seller: boolean;
  is_new: boolean;
  is_on_sale: boolean;
  is_featured: boolean;
  image_url: string;
  gallery: string[] | null;
  size_bn: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  location: string | null;
  rating: number;
  review_bn: string | null;
  is_verified: boolean;
  is_approved: boolean;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface Banner {
  id: string;
  title_bn: string;
  small_text_bn: string | null;
  description_bn: string | null;
  button_text_bn: string | null;
  button_link: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  mobile: string;
  alt_phone: string | null;
  email: string | null;
  district: string;
  area: string;
  address: string;
  order_note: string | null;
  delivery_method: string;
  payment_method: string;
  subtotal: number;
  delivery_charge: number;
  discount: number;
  grand_total: number;
  status: string;
  payment_status: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  price: number;
  quantity: number;
  image_url: string | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order: number;
  max_discount: number | null;
  expiry_date: string | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  created_at: string;
}

export interface SiteSettings {
  id: number;
  brand_name: string;
  brand_tagline_bn: string;
  logo_url: string | null;
  favicon_url: string | null;
  phone: string;
  whatsapp_number: string;
  email: string;
  address_bn: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  youtube_url: string;
  delivery_inside_dhaka: number;
  delivery_outside_dhaka: number;
  free_delivery_threshold: number;
  currency: string;
  footer_text_bn: string;
  announcement_bn: string;
  combo_offer_enabled: boolean;
  combo_offer_badge: string;
  combo_offer_title: string;
  combo_offer_description: string;
  combo_offer_original_price: number;
  combo_offer_price: number;
  combo_offer_image_url: string | null;
  combo_offer_button_text: string;
  combo_offer_button_link: string;
  site_language: string;
  timezone: string;
  maintenance_mode: boolean;
  homepage_show_categories: boolean;
  homepage_show_all_products: boolean;
  homepage_show_best_sellers: boolean;
  homepage_show_new_arrivals: boolean;
  homepage_show_sale: boolean;
  homepage_show_hair_care: boolean;
  homepage_show_skin_care: boolean;
  homepage_show_reviews: boolean;
  homepage_show_how_to_order: boolean;
  homepage_show_why_choose_us: boolean;
  homepage_banner_autoplay: boolean;
  homepage_banner_interval: number;
  product_low_stock_threshold: number;
  product_allow_reviews: boolean;
  checkout_guest_enabled: boolean;
  checkout_require_email: boolean;
  checkout_require_terms: boolean;
  order_duplicate_window_minutes: number;
  free_delivery_enabled: boolean;
  free_delivery_minimum: number;
  cod_enabled: boolean;
  online_payment_enabled: boolean;
  order_auto_dispatch_enabled: boolean;
  invoice_enabled: boolean;
  customer_google_login_enabled: boolean;
  customer_email_login_enabled: boolean;
  newsletter_enabled: boolean;
  whatsapp_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  meta_pixel_enabled: boolean;
  google_analytics_enabled: boolean;
  google_analytics_id: string;
  google_search_console_code: string;
  seo_site_title: string;
  seo_meta_description: string;
  seo_canonical_url: string;
  seo_og_image_url: string;
  seo_noindex: boolean;
  contact_whatsapp_enabled: boolean;
  contact_phone_enabled: boolean;
}


export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
}
