-- Keep customer phone numbers separate from public review records.
CREATE TABLE IF NOT EXISTS public.review_customer_details (
  review_id uuid PRIMARY KEY REFERENCES public.reviews(id) ON DELETE CASCADE,
  customer_phone text NOT NULL CHECK (length(customer_phone) BETWEEN 10 AND 15),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_customer_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit review customer details" ON public.review_customer_details;
CREATE POLICY "Anyone can submit review customer details"
  ON public.review_customer_details FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view review customer details" ON public.review_customer_details;
CREATE POLICY "Admins can view review customer details"
  ON public.review_customer_details FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.user_id = (SELECT auth.uid())
    )
  );

REVOKE ALL ON public.review_customer_details FROM PUBLIC;
GRANT INSERT ON public.review_customer_details TO anon, authenticated;
GRANT SELECT ON public.review_customer_details TO authenticated;
