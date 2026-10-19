import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Cuisine, Ingredient, Recipe, Step, Substitution } from '@/lib/supabase';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('cuisine', { ascending: true })
        .order('title', { ascending: true });
      if (!active) return;
      if (error) setError(error.message);
      else setRecipes(data ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { recipes, loading, error };
}

export type RecipeDetail = {
  recipe: Recipe;
  ingredients: Ingredient[];
  steps: Step[];
};

export function useRecipeDetail(recipeId: string | null) {
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recipeId) {
      setDetail(null);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      const [recipeRes, ingRes, stepsRes] = await Promise.all([
        supabase.from('recipes').select('*').eq('id', recipeId).maybeSingle(),
        supabase
          .from('ingredients')
          .select('*')
          .eq('recipe_id', recipeId)
          .order('position', { ascending: true }),
        supabase
          .from('steps')
          .select('*')
          .eq('recipe_id', recipeId)
          .order('position', { ascending: true }),
      ]);
      if (!active) return;
      if (recipeRes.error || ingRes.error || stepsRes.error) {
        setError(
          recipeRes.error?.message || ingRes.error?.message || stepsRes.error?.message || 'Load failed'
        );
        setDetail(null);
      } else if (recipeRes.data) {
        setDetail({
          recipe: recipeRes.data as Recipe,
          ingredients: ingRes.data as Ingredient[],
          steps: stepsRes.data as Step[],
        });
        setError(null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [recipeId]);

  return { detail, loading, error };
}

export function useSubstitutions() {
  const [subs, setSubs] = useState<Substitution[]>([]);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from('substitutions').select('*');
      if (active) setSubs(data ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);
  return subs;
}

/**
 * Fetches ALL ingredients across ALL recipes in a single query, grouped by
 * recipe_id. Used by the Pantry Matcher to compute match scores without
 * fetching each recipe's ingredients individually.
 */
export function useAllIngredients() {
  const [byRecipe, setByRecipe] = useState<Record<string, Ingredient[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('ingredients')
        .select('*')
        .order('position', { ascending: true });
      if (!active) return;
      const grouped: Record<string, Ingredient[]> = {};
      (data ?? []).forEach((ing) => {
        const r = ing.recipe_id as string;
        if (!grouped[r]) grouped[r] = [];
        grouped[r].push(ing as Ingredient);
      });
      setByRecipe(grouped);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { byRecipe, loading };
}

/** Returns the set of distinct ingredient names across all recipes. */
export function allIngredientNames(byRecipe: Record<string, Ingredient[]>): string[] {
  const names = new Set<string>();
  Object.values(byRecipe).forEach((ings) => {
    ings.forEach((i) => names.add(i.name));
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export type PantryMatch = {
  recipe: Recipe;
  matched: string[];
  missing: string[];
  missingWithSubs: string[];
  score: number; // 0-100
};

/**
 * Computes a match score for each recipe against the pantry. The score is the
 * percentage of the recipe's ingredients that are either in the pantry OR have
 * a known AI substitution available for a missing ingredient.
 */
export function computePantryMatches(
  recipes: Recipe[],
  byRecipe: Record<string, Ingredient[]>,
  pantry: Set<string>,
  subs: Substitution[]
): PantryMatch[] {
  if (pantry.size === 0) return [];
  const subNames = new Set(subs.map((s) => s.ingredient_name.toLowerCase()));

  return recipes
    .map((recipe) => {
      const ings = byRecipe[recipe.id] ?? [];
      if (ings.length === 0) return null;
      const matched: string[] = [];
      const missing: string[] = [];
      const missingWithSubs: string[] = [];
      ings.forEach((ing) => {
        if (pantry.has(ing.name.toLowerCase())) {
          matched.push(ing.name);
        } else {
          missing.push(ing.name);
          if (subNames.has(ing.name.toLowerCase())) {
            missingWithSubs.push(ing.name);
          }
        }
      });
      const covered = matched.length + missingWithSubs.length;
      const score = Math.round((covered / ings.length) * 100);
      return { recipe, matched, missing, missingWithSubs, score };
    })
    .filter((m): m is PantryMatch => m !== null)
    .sort((a, b) => b.score - a.score);
}

export function useShoppingList() {
  const [items, setItems] = useState<{
    id: string;
    item: string;
    quantity: string | null;
    added_at: string;
    checked: boolean;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('shopping_list')
      .select('*')
      .order('added_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(async (item: string, quantity?: string) => {
    const { data, error } = await supabase
      .from('shopping_list')
      .insert({ item, quantity: quantity ?? null })
      .select('*')
      .maybeSingle();
    if (!error && data) setItems((prev) => [data, ...prev]);
  }, []);

  const toggle = useCallback(async (id: string, checked: boolean) => {
    await supabase.from('shopping_list').update({ checked }).eq('id', id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked } : i)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await supabase.from('shopping_list').delete().eq('id', id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { items, loading, add, toggle, remove, refresh };
}

type TimerState = 'idle' | 'running' | 'paused' | 'done';

export function useStepTimer(totalSeconds: number | null) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds ?? 0);
  const [status, setStatus] = useState<TimerState>('idle');
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setSecondsLeft(totalSeconds ?? 0);
    setStatus('idle');
  }, [totalSeconds]);

  const stopInterval = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = useCallback(() => {
    if (!totalSeconds) return;
    setStatus('running');
    stopInterval();
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          stopInterval();
          setStatus('done');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [totalSeconds]);

  const pause = useCallback(() => {
    stopInterval();
    setStatus('paused');
  }, []);

  const reset = useCallback(() => {
    stopInterval();
    setSecondsLeft(totalSeconds ?? 0);
    setStatus('idle');
  }, [totalSeconds]);

  useEffect(() => stopInterval, []);

  return { secondsLeft, status, start, pause, reset };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function groupByCuisine(recipes: Recipe[]): Record<Cuisine, Recipe[]> {
  const empty = { Italian: [], Indian: [], Mexican: [], Asian: [], Mediterranean: [] } as Record<
    Cuisine,
    Recipe[]
  >;
  return recipes.reduce((acc, r) => {
    if (r.cuisine) acc[r.cuisine].push(r);
    return acc;
  }, empty);
}

// ===== Speech & Audio =====

/**
 * Wraps the browser SpeechSynthesis API. Returns a `speak` function that
 * cancels any in-flight utterance first, plus helpers to cancel and to check
 * support. Voices load asynchronously in most browsers, so we warm them up on
 * mount and refresh state when the `voiceschanged` event fires.
 */
export function useSpeech() {
  const [supported] = useState(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [supported]);

  const speak = useCallback(
    (text: string, opts?: { rate?: number; pitch?: number }) => {
      if (!supported || !text) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = opts?.rate ?? 0.95;
        u.pitch = opts?.pitch ?? 1;
        // Prefer a natural-sounding English voice if one is available.
        const preferred =
          voices.find((v) => /en[-_]US/i.test(v.lang) && /natural|google|samantha|aria/i.test(v.name)) ??
          voices.find((v) => /^en/i.test(v.lang));
        if (preferred) u.voice = preferred;
        window.speechSynthesis.speak(u);
      } catch {
        /* no-op — speech not available in this browser */
      }
    },
    [supported, voices]
  );

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { supported, speak, cancel };
}

/**
 * Plays a short three-note "ding" chime using the Web Audio API. No asset file
 * needed — synthesized on the fly. Safe to call repeatedly.
 */
export function playChime(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes = [880, 1108.73, 1318.51]; // A5, C#6, E6 — a bright major triad
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.18;
      const end = start + 0.5;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, end);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.05);
    });
    // Close the context after the last note to free resources.
    window.setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    /* no-op — audio not available */
  }
}
