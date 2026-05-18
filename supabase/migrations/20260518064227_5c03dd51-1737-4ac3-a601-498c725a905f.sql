CREATE TABLE public.clients (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "public insert clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "public update clients" ON public.clients FOR UPDATE USING (true) WITH CHECK (true);