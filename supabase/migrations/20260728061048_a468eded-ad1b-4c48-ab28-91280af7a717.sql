CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'gmail',
  source_ref text,
  gmail_message_id text,
  gmail_thread_id text,
  direction text NOT NULL DEFAULT 'debit',
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  merchant text,
  counterparty text,
  sender text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  txn_ref text,
  upi_ref text,
  payment_method text,
  category text NOT NULL DEFAULT 'other',
  category_locked boolean NOT NULL DEFAULT false,
  account_hint text,
  has_invoice boolean NOT NULL DEFAULT false,
  confidence numeric(4,3) NOT NULL DEFAULT 0.5,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX transactions_user_msg_uniq ON public.transactions (user_id, gmail_message_id) WHERE gmail_message_id IS NOT NULL;
CREATE INDEX transactions_user_time_idx ON public.transactions (user_id, occurred_at DESC);
CREATE INDEX transactions_user_cat_idx ON public.transactions (user_id, category);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own transactions" ON public.transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  period text NOT NULL DEFAULT 'monthly',
  currency text NOT NULL DEFAULT 'INR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budgets" ON public.budgets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  merchant text,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  cadence text NOT NULL DEFAULT 'monthly',
  next_renewal_at date,
  last_charged_at date,
  status text NOT NULL DEFAULT 'active',
  source text NOT NULL DEFAULT 'gmail',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  biller text NOT NULL,
  bill_type text NOT NULL DEFAULT 'other',
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  due_date date,
  status text NOT NULL DEFAULT 'unpaid',
  gmail_message_id text,
  source text NOT NULL DEFAULT 'gmail',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX bills_user_msg_uniq ON public.bills (user_id, gmail_message_id) WHERE gmail_message_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO authenticated;
GRANT ALL ON public.bills TO service_role;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bills" ON public.bills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.monthly_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month date NOT NULL,
  income numeric(14,2) NOT NULL DEFAULT 0,
  expense numeric(14,2) NOT NULL DEFAULT 0,
  savings numeric(14,2) NOT NULL DEFAULT 0,
  by_category jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_summary TO authenticated;
GRANT ALL ON public.monthly_summary TO service_role;
ALTER TABLE public.monthly_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own summaries" ON public.monthly_summary FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.finance_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  severity text NOT NULL DEFAULT 'info',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_insights_user_idx ON public.finance_insights (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_insights TO authenticated;
GRANT ALL ON public.finance_insights TO service_role;
ALTER TABLE public.finance_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own insights" ON public.finance_insights FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_monthly_summary_updated_at BEFORE UPDATE ON public.monthly_summary FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();