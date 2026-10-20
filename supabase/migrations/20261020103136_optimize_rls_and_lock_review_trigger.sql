-- Behavior-preserving RLS evaluation optimization: evaluate auth.uid() once per statement.
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.customer_addresses;
CREATE POLICY "Users can view their own addresses" ON public.customer_addresses
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.customer_addresses;
CREATE POLICY "Users can insert their own addresses" ON public.customer_addresses
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own addresses" ON public.customer_addresses;
CREATE POLICY "Users can update their own addresses" ON public.customer_addresses
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.customer_addresses;
CREATE POLICY "Users can delete their own addresses" ON public.customer_addresses
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can check own admin access" ON public.admin_users;
CREATE POLICY "Users can check own admin access" ON public.admin_users
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
CREATE POLICY "Customers can view own orders" ON public.orders
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Customers can view own order items" ON public.order_items;
CREATE POLICY "Customers can view own order items" ON public.order_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can view integration settings" ON public.integration_settings;
CREATE POLICY "Admins can view integration settings" ON public.integration_settings
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can manage integration settings" ON public.integration_settings;
CREATE POLICY "Admins can manage integration settings" ON public.integration_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = (SELECT auth.uid())));

-- Trigger execution does not require callers to invoke this helper directly.
REVOKE EXECUTE ON FUNCTION public.sync_product_review_stats() FROM PUBLIC, anon, authenticated;
