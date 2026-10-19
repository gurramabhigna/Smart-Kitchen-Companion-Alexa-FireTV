import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export type Cuisine = 'Italian' | 'Indian' | 'Mexican' | 'Asian' | 'Mediterranean';

export const CUISINES: Cuisine[] = ['Italian', 'Indian', 'Mexican', 'Asian', 'Mediterranean'];

export type Recipe = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  servings: number;
  difficulty: string;
  cuisine: Cuisine | null;
  tags: string[];
  prep_minutes: number;
  created_at: string;
};

export type Ingredient = {
  id: string;
  recipe_id: string;
  name: string;
  quantity: string;
  position: number;
  is_protein: boolean;
};

export type Substitution = {
  id: string;
  ingredient_name: string;
  substitute: string;
  ratio: string | null;
  note: string | null;
};

export type Step = {
  id: string;
  recipe_id: string;
  position: number;
  instruction: string;
  timer_seconds: number | null;
  image_url: string | null;
  tip: string | null;
  ingredients_needed: string[];
};

export type ShoppingItem = {
  id: string;
  item: string;
  quantity: string | null;
  added_at: string;
  checked: boolean;
};
