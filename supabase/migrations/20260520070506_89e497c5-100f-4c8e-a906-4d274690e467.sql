CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read app_config" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "public insert app_config" ON public.app_config FOR INSERT WITH CHECK (true);
CREATE POLICY "public update app_config" ON public.app_config FOR UPDATE USING (true) WITH CHECK (true);