CREATE TABLE public.sender_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, pattern)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sender_rules TO authenticated;
GRANT ALL ON public.sender_rules TO service_role;
ALTER TABLE public.sender_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sender rules" ON public.sender_rules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX sender_rules_user_idx ON public.sender_rules (user_id);