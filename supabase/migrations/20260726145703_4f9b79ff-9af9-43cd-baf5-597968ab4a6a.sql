CREATE TABLE public.mail_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'card',
  color text NOT NULL DEFAULT 'primary',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.mail_card_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.mail_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, email)
);

CREATE INDEX mail_card_addresses_card_id_idx ON public.mail_card_addresses(card_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mail_cards TO authenticated;
GRANT ALL ON public.mail_cards TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mail_card_addresses TO authenticated;
GRANT ALL ON public.mail_card_addresses TO service_role;

ALTER TABLE public.mail_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_card_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts manage their own cards" ON public.mail_cards
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Hosts manage their own card addresses" ON public.mail_card_addresses
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_mail_cards_updated_at BEFORE UPDATE ON public.mail_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();