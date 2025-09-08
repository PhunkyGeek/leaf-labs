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

-- Create custom types
CREATE TYPE scan_status AS ENUM ('processing', 'completed', 'failed');
CREATE TYPE disease_type AS ENUM ('fungal', 'bacterial', 'viral');

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Scans table
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  model_version text NOT NULL DEFAULT 'v1.0',
  confidence numeric(5,4) NOT NULL DEFAULT 0,
  status scan_status DEFAULT 'processing',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own scans"
  ON scans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans"
  ON scans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans"
  ON scans
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Scan results table
CREATE TABLE IF NOT EXISTS scan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES scans(id) ON DELETE CASCADE NOT NULL,
  disease_id text,
  stage integer,
  parts jsonb DEFAULT '{}',
  explanation text NOT NULL DEFAULT '',
  advice text NOT NULL DEFAULT '',
  postcare text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own scan results"
  ON scan_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scans 
      WHERE scans.id = scan_results.scan_id 
      AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own scan results"
  ON scan_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scans 
      WHERE scans.id = scan_results.scan_id 
      AND scans.user_id = auth.uid()
    )
  );

-- Diseases table (public readable)
CREATE TABLE IF NOT EXISTS diseases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type disease_type NOT NULL,
  short_desc text NOT NULL,
  long_desc text NOT NULL,
  thumbnail_url text NOT NULL,
  tips jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE diseases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read diseases"
  ON diseases
  FOR SELECT
  TO authenticated
  USING (true);

-- Meta table for app metadata
CREATE TABLE IF NOT EXISTS meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read meta"
  ON meta
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial disease data
INSERT INTO diseases (name, type, short_desc, long_desc, thumbnail_url, tips) VALUES
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
);

-- Insert initial meta record
INSERT INTO meta (last_synced_at) VALUES (now());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_results_scan_id ON scan_results(scan_id);
CREATE INDEX IF NOT EXISTS idx_diseases_type ON diseases(type);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();