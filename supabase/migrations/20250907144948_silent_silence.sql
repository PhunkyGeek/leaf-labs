/*
  # Create Leaf Labs Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, references auth.users)
      - `email` (text)
      - `name` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `scans`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `image_url` (text)
      - `model_version` (text)
      - `confidence` (numeric)
      - `status` (enum: processing, completed, failed)
      - `created_at` (timestamp)
    - `scan_results`
      - `id` (uuid, primary key) 
      - `scan_id` (uuid, foreign key)
      - `disease_id` (text, nullable)
      - `stage` (integer, nullable)
      - `parts` (jsonb)
      - `explanation` (text)
      - `advice` (text)
      - `postcare` (text)
      - `created_at` (timestamp)
    - `diseases`
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (enum: fungal, bacterial, viral)
      - `short_desc` (text)
      - `long_desc` (text)
      - `thumbnail_url` (text)
      - `tips` (jsonb)
      - `created_at` (timestamp)
    - `meta`
      - `id` (uuid, primary key)
      - `last_synced_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for reading disease information
*/

/*
  Leaf Labs - Final Idempotent Migration
  - Backend (service_role) performs processing inserts/updates
  - Authenticated users can create scans for themselves and read their own scans & results
  - Diseases & meta readable by authenticated users (disease library)
  - Profiles synced from auth.users (trigger)
  - Idempotent and Supabase-friendly
*/

-- 0) extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Create or ensure enum types (safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'scan_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.scan_status AS ENUM ('processing', 'completed', 'failed');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'disease_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.disease_type AS ENUM ('fungal', 'bacterial', 'viral');
  END IF;
END$$;

-- Ensure enum contains required values for Postgres >= 14
ALTER TYPE public.scan_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE public.scan_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.scan_status ADD VALUE IF NOT EXISTS 'failed';

ALTER TYPE public.disease_type ADD VALUE IF NOT EXISTS 'fungal';
ALTER TYPE public.disease_type ADD VALUE IF NOT EXISTS 'bacterial';
ALTER TYPE public.disease_type ADD VALUE IF NOT EXISTS 'viral';

-- 2) Profiles table (sync with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for determinism
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service can manage profiles" ON public.profiles;

-- Authenticated users can operate on their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Service role (backend) may manage profiles (helpful for migrations/admin ops)
-- Grant broad rights to the service role; the role is only available to your server key.
CREATE POLICY "Service can manage profiles"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3) Scans table
CREATE TABLE IF NOT EXISTS public.scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  model_version text NOT NULL DEFAULT 'v1.0',
  confidence numeric(5,4) NOT NULL DEFAULT 0,
  status public.scan_status DEFAULT 'processing',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own scans" ON public.scans;
DROP POLICY IF EXISTS "Users can insert own scans" ON public.scans;
DROP POLICY IF EXISTS "Users can update own scans" ON public.scans;
DROP POLICY IF EXISTS "Service can write scans" ON public.scans;
DROP POLICY IF EXISTS "Service can update scans" ON public.scans;
DROP POLICY IF EXISTS "Service can read scans" ON public.scans;

-- Users can read their own scans
CREATE POLICY "Users can read own scans"
  ON public.scans
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert scans that belong to them (client creates scan row after upload)
CREATE POLICY "Users can insert own scans"
  ON public.scans
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users may update some fields of their scans (optional; keep as owner-only)
CREATE POLICY "Users can update own scans"
  ON public.scans
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Backend service may insert/update/read scans (for processing/marking status)
CREATE POLICY "Service can write scans"
  ON public.scans
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service can update scans"
  ON public.scans
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can read scans"
  ON public.scans
  FOR SELECT
  TO service_role
  USING (true);

-- 4) Scan results table
CREATE TABLE IF NOT EXISTS public.scan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES public.scans(id) ON DELETE CASCADE NOT NULL,
  disease_id text,
  stage integer,
  parts jsonb DEFAULT '{}'::jsonb,
  explanation text NOT NULL DEFAULT '',
  advice text NOT NULL DEFAULT '',
  postcare text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own scan results" ON public.scan_results;
DROP POLICY IF EXISTS "Users can insert own scan results" ON public.scan_results;
DROP POLICY IF EXISTS "Service can write scan results" ON public.scan_results;
DROP POLICY IF EXISTS "Service can update scan results" ON public.scan_results;
DROP POLICY IF EXISTS "Service can read scan results" ON public.scan_results;

-- Auth users can read scan_results only if the parent scan belongs to them
CREATE POLICY "Users can read own scan results"
  ON public.scan_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE public.scans.id = public.scan_results.scan_id
      AND public.scans.user_id = auth.uid()
    )
  );

-- Backend service inserts scan_results (after processing)
CREATE POLICY "Service can write scan results"
  ON public.scan_results
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- If you ever want frontend to insert results (unlikely), keep the following commented option:
-- CREATE POLICY "Users can insert scan results if they own parent scan"
--   ON public.scan_results
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM public.scans
--       WHERE public.scans.id = public.scan_results.scan_id
--       AND public.scans.user_id = auth.uid()
--     )
--   );

-- Allow service to read/update results as needed
CREATE POLICY "Service can read scan results"
  ON public.scan_results
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service can update scan results"
  ON public.scan_results
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5) Diseases table (library) - readable by authenticated users
CREATE TABLE IF NOT EXISTS public.diseases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.disease_type NOT NULL,
  short_desc text NOT NULL,
  long_desc text NOT NULL,
  thumbnail_url text NOT NULL,
  tips jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.diseases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read diseases" ON public.diseases;
DROP POLICY IF EXISTS "Service can manage diseases" ON public.diseases;

-- Authenticated users can read the disease library
CREATE POLICY "Anyone can read diseases"
  ON public.diseases
  FOR SELECT
  TO authenticated
  USING (true);

-- Service can insert/update/delete disease rows (useful for admin scripts)
CREATE POLICY "Service can manage diseases"
  ON public.diseases
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6) Meta table (app metadata)
CREATE TABLE IF NOT EXISTS public.meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read meta" ON public.meta;
DROP POLICY IF EXISTS "Service can manage meta" ON public.meta;

CREATE POLICY "Anyone can read meta"
  ON public.meta
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service can manage meta"
  ON public.meta
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7) Indexes - ensure unique disease name BEFORE seeding
CREATE UNIQUE INDEX IF NOT EXISTS idx_diseases_name ON public.diseases(name);

CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON public.scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_results_scan_id ON public.scan_results(scan_id);
CREATE INDEX IF NOT EXISTS idx_diseases_type ON public.diseases(type);

-- 8) Seed disease data (idempotent)
INSERT INTO public.diseases (name, type, short_desc, long_desc, thumbnail_url, tips)
VALUES
(
  'Early Blight',
  'fungal',
  'Dark lesions with concentric rings on leaves, typically starting on lower foliage',
  'Early blight is a fungal disease caused by Alternaria solani that affects tomato, potato, and other nightshade plants. It begins as small dark spots on older leaves and progresses to form characteristic bull''s-eye patterns. The disease thrives in warm, humid conditions and can cause significant defoliation if left untreated.',
  'https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=400',
  '{"prevention": ["Ensure good air circulation", "Water at soil level", "Apply mulch to prevent soil splash"], "treatment": ["Remove affected leaves", "Apply copper-based fungicides", "Improve plant spacing"]}'
),
(
  'Bacterial Spot',
  'bacterial',
  'Small dark spots with yellow halos on leaves, caused by Xanthomonas bacteria',
  'Bacterial spot is caused by several Xanthomonas species and creates small, dark, water-soaked spots that may have yellow halos. The disease spreads rapidly in warm, wet conditions through water splash and contaminated tools. It can affect both foliage and fruit, leading to significant crop losses.',
  'https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=400',
  '{"prevention": ["Use disease-free seeds", "Practice crop rotation", "Avoid overhead watering"], "treatment": ["Apply copper-based bactericides", "Remove infected plant debris", "Improve drainage"]}'
),
(
  'Mosaic Virus',
  'viral',
  'Mottled light and dark green patterns on leaves, spread by insect vectors',
  'Mosaic viruses cause characteristic mottled or streaked patterns on plant leaves, with alternating light and dark green areas. These viruses are typically transmitted by aphids, thrips, or through contaminated tools. There is no cure for viral infections, making prevention and vector control crucial for management.',
  'https://images.pexels.com/photos/1379636/pexels-photo-1379636.jpeg?auto=compress&cs=tinysrgb&w=400',
  '{"prevention": ["Control insect vectors", "Use virus-free planting material", "Sanitize tools regularly"], "treatment": ["Remove infected plants", "Control aphid populations", "No chemical cure available"]}'
)
ON CONFLICT (name) DO NOTHING
;

-- 9) Insert initial meta record (idempotent)
INSERT INTO public.meta (id, last_synced_at)
SELECT gen_random_uuid(), now()
WHERE NOT EXISTS (SELECT 1 FROM public.meta);

-- 10) Update timestamp trigger function (profiles.updated_at)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create trigger only if not exists (idempotent pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'update_profiles_updated_at' AND c.relname = 'profiles'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- 11) Sync auth.users -> profiles (recreate function + trigger)
-- Create or replace function to handle new auth.users inserts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert minimal profile row; avoid duplicate errors
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, now(), now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (drop first to be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 12) (Optional) One-time resync of existing auth.users into profiles
-- Uncomment and run manually if needed to restore missing profile rows:
INSERT INTO public.profiles (id, email, created_at, updated_at)
SELECT u.id, u.email, now(), now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 13) Helpful notes (no-op):
-- - The server/backend should use the Supabase service_role key to insert/update scan_results and mark scan statuses.
-- - Client (frontend) should insert scans with user_id = auth.uid() so RLS allows it.
-- - Authenticated users can SELECT diseases/meta and SELECT their own scans & scan_results.

-- End of migration
