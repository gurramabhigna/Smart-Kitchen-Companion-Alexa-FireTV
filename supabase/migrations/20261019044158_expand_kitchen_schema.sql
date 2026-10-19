/*
# Expand kitchen schema for 25-recipe Fire TV experience

## Overview
Augments the Smart Kitchen Companion schema to support cuisine categories,
prep-time display, per-step visuals, per-step ingredient lists, and chef tips.

## Changes
1. `recipes`
   - ADD `prep_minutes` int NOT NULL DEFAULT 20 — total active + cook time, in minutes.
   - Constrain `cuisine` to the five supported Fire TV categories after first
     aligning any existing rows to one of those cuisines.
2. `steps`
   - ADD `image_url` text — Pexels image URL for the step's action.
   - ADD `tip` text — short chef tip shown in a highlighted tip box.
   - ADD `ingredients_needed` text[] — ingredient names used at this step.
3. `ingredients`
   - ADD `is_protein` boolean DEFAULT false — highlights the star ingredient.

## Security
- No new tables. RLS stays enabled; policies unchanged (TO anon, authenticated,
  USING(true)/WITH CHECK(true), documented in the prior migration).
- No data dropped or renamed; all new columns have safe defaults.
*/

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS prep_minutes int NOT NULL DEFAULT 20;

-- Align any existing rows to a valid cuisine before adding the check.
UPDATE recipes SET cuisine = 'Italian' WHERE cuisine IS NULL OR cuisine NOT IN ('Italian','Indian','Mexican','Asian','Mediterranean');

ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_cuisine_check;
ALTER TABLE recipes
  ADD CONSTRAINT recipes_cuisine_check
  CHECK (cuisine IS NULL OR cuisine IN ('Italian','Indian','Mexican','Asian','Mediterranean'));

ALTER TABLE steps
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE steps
  ADD COLUMN IF NOT EXISTS tip text;

ALTER TABLE steps
  ADD COLUMN IF NOT EXISTS ingredients_needed text[] NOT NULL DEFAULT '{}';

ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS is_protein boolean NOT NULL DEFAULT false;
