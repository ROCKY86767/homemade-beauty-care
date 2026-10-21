import { supabase } from '@/lib/supabase';

export async function verifyCustomerPurchasedProduct(productId: string, phone: string) {
  const normalized = phone.replace(/\D/g, '').replace(/^88/, '');
  if (!/^01[3-9]\d{8}$/.test(normalized)) return false;

  const { data, error } = await supabase.rpc('verify_review_customer', {
    p_product_id: productId,
    p_customer_phone: normalized,
  });

  if (error) throw error;
  return data === true;
}
