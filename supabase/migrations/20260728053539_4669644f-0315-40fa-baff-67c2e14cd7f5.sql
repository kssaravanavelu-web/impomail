ALTER TABLE public.profiles ADD COLUMN tier TEXT NOT NULL DEFAULT 'free';

CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year_month TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, year_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ai usage" ON public.ai_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ai usage" ON public.ai_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ai usage" ON public.ai_usage FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ai usage" ON public.ai_usage FOR DELETE TO authenticated USING (auth.uid() = user_id);

UPDATE public.profiles SET tier = 'free' WHERE tier IS NULL;