ALTER TABLE public.push_subscriptions
ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';