CREATE TABLE public.chit_auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chit_groups(id) ON DELETE CASCADE,
  month_no integer NOT NULL CHECK (month_no > 0),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  winner_name text NOT NULL,
  prize_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, month_no),
  UNIQUE (subscription_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chit_auctions TO authenticated;
GRANT ALL ON public.chit_auctions TO service_role;
ALTER TABLE public.chit_auctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin write auctions" ON public.chit_auctions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "group members read auctions" ON public.chit_auctions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.subscriptions s JOIN public.members m ON m.id = s.member_id
    WHERE s.group_id = chit_auctions.group_id AND m.user_id = auth.uid()));