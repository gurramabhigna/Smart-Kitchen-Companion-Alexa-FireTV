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
