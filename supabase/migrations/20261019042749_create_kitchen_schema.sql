/*
# Smart Kitchen Companion schema (single-tenant, no auth)

## Overview
Creates a recipe database for a Fire TV kitchen companion app. Recipes have
ingredients, ordered steps (some with timers), and ingredient substitution
suggestions. A shopping list table persists items the user asks to add via the
voice command simulator. All data is intentionally shared/public across the
kitchen device, so policies are scoped to `anon, authenticated` with `USING(true)`.

## New Tables

1. `recipes`
   - `id` uuid PK
   - `title` text NOT NULL
   - `description` text
   - `image_url` text (optional hero image)
   - `servings` int default 4
   - `difficulty` text ('Easy' | 'Medium' | 'Hard')
   - `cuisine` text (e.g. 'Italian')
   - `tags` text[] (e.g. ['vegetarian','quick'])
   - `created_at` timestamptz default now()

2. `ingredients`
   - `id` uuid PK
   - `recipe_id` uuid FK -> recipes ON DELETE CASCADE
   - `name` text NOT NULL (e.g. 'Butter')
   - `quantity` text NOT NULL (e.g. '1 cup')
   - `position` int (display order)

3. `substitutions`
   - `id` uuid PK
   - `ingredient_name` text NOT NULL (matched against ingredients.name, case-insensitive)
   - `substitute` text NOT NULL (e.g. 'Coconut oil')
   - `ratio` text (e.g. '1:1')
   - `note` text (optional tip)

4. `steps`
   - `id` uuid PK
   - `recipe_id` uuid FK -> recipes ON DELETE CASCADE
   - `position` int NOT NULL (1-based order)
   - `instruction` text NOT NULL
   - `timer_seconds` int (optional; when present, step has a countdown timer)

5. `shopping_list`
   - `id` uuid PK
   - `item` text NOT NULL
   - `quantity` text
   - `added_at` timestamptz default now()
   - `checked` boolean default false

## Security
- RLS enabled on every table.
- All tables are publicly read/write by `anon, authenticated` (single shared
  kitchen device, no sign-in screen). `USING(true)` / `WITH CHECK(true)` is
  intentional and documented here.
- Foreign keys cascade deletes so removing a recipe cleans its rows.
- Indexes on `recipe_id` columns and `ingredients.name` for substitution lookups.
*/

CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  servings int NOT NULL DEFAULT 4,
  difficulty text NOT NULL DEFAULT 'Easy',
  cuisine text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity text NOT NULL,
  position int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS substitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name text NOT NULL,
  substitute text NOT NULL,
  ratio text,
  note text
);

CREATE TABLE IF NOT EXISTS steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  position int NOT NULL,
  instruction text NOT NULL,
  timer_seconds int
);

CREATE TABLE IF NOT EXISTS shopping_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item text NOT NULL,
  quantity text,
  added_at timestamptz NOT NULL DEFAULT now(),
  checked boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_name_lower ON ingredients (lower(name));
CREATE INDEX IF NOT EXISTS idx_substitutions_ingredient_name_lower ON substitutions (lower(ingredient_name));
CREATE INDEX IF NOT EXISTS idx_steps_recipe_id ON steps(recipe_id);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;

-- recipes policies (public CRUD, single-tenant kitchen device)
DROP POLICY IF EXISTS "anon_select_recipes" ON recipes;
CREATE POLICY "anon_select_recipes" ON recipes FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_recipes" ON recipes;
CREATE POLICY "anon_insert_recipes" ON recipes FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_recipes" ON recipes;
CREATE POLICY "anon_update_recipes" ON recipes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_recipes" ON recipes;
CREATE POLICY "anon_delete_recipes" ON recipes FOR DELETE
  TO anon, authenticated USING (true);

-- ingredients policies
DROP POLICY IF EXISTS "anon_select_ingredients" ON ingredients;
CREATE POLICY "anon_select_ingredients" ON ingredients FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_ingredients" ON ingredients;
CREATE POLICY "anon_insert_ingredients" ON ingredients FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_ingredients" ON ingredients;
CREATE POLICY "anon_update_ingredients" ON ingredients FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_ingredients" ON ingredients;
CREATE POLICY "anon_delete_ingredients" ON ingredients FOR DELETE
  TO anon, authenticated USING (true);

-- substitutions policies
DROP POLICY IF EXISTS "anon_select_substitutions" ON substitutions;
CREATE POLICY "anon_select_substitutions" ON substitutions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_substitutions" ON substitutions;
CREATE POLICY "anon_insert_substitutions" ON substitutions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_substitutions" ON substitutions;
CREATE POLICY "anon_update_substitutions" ON substitutions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_substitutions" ON substitutions;
CREATE POLICY "anon_delete_substitutions" ON substitutions FOR DELETE
  TO anon, authenticated USING (true);

-- steps policies
DROP POLICY IF EXISTS "anon_select_steps" ON steps;
CREATE POLICY "anon_select_steps" ON steps FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_steps" ON steps;
CREATE POLICY "anon_insert_steps" ON steps FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_steps" ON steps;
CREATE POLICY "anon_update_steps" ON steps FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_steps" ON steps;
CREATE POLICY "anon_delete_steps" ON steps FOR DELETE
  TO anon, authenticated USING (true);

-- shopping_list policies
DROP POLICY IF EXISTS "anon_select_shopping_list" ON shopping_list;
CREATE POLICY "anon_select_shopping_list" ON shopping_list FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_shopping_list" ON shopping_list;
CREATE POLICY "anon_insert_shopping_list" ON shopping_list FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_shopping_list" ON shopping_list;
CREATE POLICY "anon_update_shopping_list" ON shopping_list FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_shopping_list" ON shopping_list;
CREATE POLICY "anon_delete_shopping_list" ON shopping_list FOR DELETE
  TO anon, authenticated USING (true);
