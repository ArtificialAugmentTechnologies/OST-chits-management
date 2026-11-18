CREATE TABLE public.chit_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chit_groups(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'NEW',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, member_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chit_interests TO authenticated;
GRANT ALL ON public.chit_interests TO service_role;
ALTER TABLE public.chit_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interest read" ON public.chit_interests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND m.user_id = auth.uid()));
CREATE POLICY "interest insert own" ON public.chit_interests FOR INSERT TO authenticated
WITH CHECK (status = 'NEW' AND EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND m.user_id = auth.uid()));
CREATE POLICY "interest admin write" ON public.chit_interests FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));