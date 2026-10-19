import { Check, ChefHat, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  allIngredientNames,
  computePantryMatches,
  formatMinutes,
  useAllIngredients,
  useSubstitutions,
} from '@/lib/hooks';
import type { Ingredient, Recipe, Substitution } from '@/lib/supabase';

/**
 * "What's in My Kitchen?" — a pantry matcher panel. Users select ingredients
 * they have on hand from large tiles (or type to add a custom one). Recipes are
 * scored by how many of their ingredients are in the pantry, with missing
 * ingredients that have AI substitutes highlighted so users can swap them in.
 */
export function PantryMatcher({
  recipes,
  onOpen,
  onClose,
}: {
  recipes: Recipe[];
  onOpen: (r: Recipe) => void;
  onClose: () => void;
}) {
  const { byRecipe, loading } = useAllIngredients();
  const subs = useSubstitutions();
  const [pantry, setPantry] = useState<Set<string>>(new Set());
  const [customInput, setCustomInput] = useState('');
  const [selectedMissing, setSelectedMissing] = useState<{
    recipeId: string;
    ingredient: string;
  } | null>(null);

  const allNames = useMemo(() => allIngredientNames(byRecipe), [byRecipe]);

  const matches = useMemo(
    () => computePantryMatches(recipes, byRecipe, pantry, subs),
    [recipes, byRecipe, pantry, subs]
  );

  const togglePantry = (name: string) => {
    setPantry((prev) => {
      const next = new Set(prev);
      const key = name.toLowerCase();
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const addCustom = () => {
    const name = customInput.trim();
    if (!name) return;
    togglePantry(name);
    setCustomInput('');
  };

  const pantryList = Array.from(pantry).sort();

  return (
    <section>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-stone-900 shadow-lg shadow-emerald-900/40">
            <ChefHat size={28} strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">What's in My Kitchen?</h1>
            <p className="mt-1 text-lg text-stone-400">
              Pick the ingredients you have on hand — we'll find recipes you can cook right now.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="tv-focusable flex items-center gap-2 rounded-2xl border border-stone-700 bg-stone-900 px-5 py-3 text-lg font-semibold text-stone-300 transition hover:border-stone-500 hover:text-stone-100"
        >
          <X size={20} /> Back to Recipes
        </button>
      </div>

      {/* Custom ingredient input */}
      <div className="mt-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-[500px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={20} />
          <input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCustom();
            }}
            placeholder="Type an ingredient and press Enter (e.g. Rice, Chicken, Garlic)…"
            className="tv-focusable w-full rounded-2xl border border-stone-700 bg-stone-900 py-3 pl-12 pr-4 text-lg text-stone-100 placeholder:text-stone-500 focus:border-amber-400 focus:outline-none"
          />
        </div>
        <button
          onClick={addCustom}
          className="tv-focusable flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-lg font-bold text-stone-900 transition hover:bg-amber-300"
        >
          <Plus size={20} /> Add
        </button>
      </div>

      {/* Selected pantry chips */}
      {pantryList.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold uppercase tracking-wider text-stone-500">
            Your Pantry ({pantryList.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {pantryList.map((name) => (
              <button
                key={name}
                onClick={() => togglePantry(name)}
                className="tv-focusable flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-base font-medium text-emerald-200 transition hover:bg-emerald-500/20"
              >
                {name}
                <X size={14} className="text-emerald-400/70" />
              </button>
            ))}
            <button
              onClick={() => setPantry(new Set())}
              className="tv-focusable flex items-center gap-1.5 rounded-xl border border-stone-700 px-3 py-1.5 text-base text-stone-400 hover:text-red-300"
            >
              <Trash2 size={14} /> Clear all
            </button>
          </div>
        </div>
      )}

      {/* Ingredient tiles */}
      {!loading && (
        <div className="mt-6">
          <div className="mb-2 text-sm font-semibold uppercase tracking-wider text-stone-500">
            Tap to add to pantry
          </div>
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 lg:grid-cols-8">
            {allNames.map((name) => {
              const selected = pantry.has(name.toLowerCase());
              return (
                <button
                  key={name}
                  onClick={() => togglePantry(name)}
                  className={`tv-focusable flex items-center justify-center gap-2 rounded-xl border px-3 py-3.5 text-center text-base font-semibold transition ${
                    selected
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                      : 'border-stone-700 bg-stone-900 text-stone-200 hover:border-amber-400/50 hover:bg-amber-400/5'
                  }`}
                >
                  {selected && <Check size={16} className="text-emerald-400" />}
                  <span className="line-clamp-2 leading-tight">{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Match results */}
      {pantry.size > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Recipe Matches</h2>
            <span className="rounded-full bg-stone-800 px-3 py-1 text-base font-semibold text-stone-300">
              {matches.length} recipes
            </span>
            <div className="ml-2 h-px flex-1 bg-gradient-to-r from-stone-700/60 to-transparent" />
          </div>

          {matches.length === 0 ? (
            <div className="rounded-2xl border border-stone-800 bg-stone-900 p-10 text-center text-xl text-stone-400">
              No recipes match — try adding more pantry items.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
              {matches.map((m) => (
                <MatchCard
                  key={m.recipe.id}
                  match={m}
                  onOpen={() => onOpen(m.recipe)}
                  onSubstitute={(ingredient) =>
                    setSelectedMissing({ recipeId: m.recipe.id, ingredient })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {selectedMissing && (
        <MissingSubModal
          ingredientName={selectedMissing.ingredient}
          subs={subs.filter(
            (s) => s.ingredient_name.toLowerCase() === selectedMissing.ingredient.toLowerCase()
          )}
          onClose={() => setSelectedMissing(null)}
        />
      )}
    </section>
  );
}

function MatchCard({
  match,
  onOpen,
  onSubstitute,
}: {
  match: {
    recipe: Recipe;
    matched: string[];
    missing: string[];
    missingWithSubs: string[];
    score: number;
  };
  onOpen: () => void;
  onSubstitute: (ingredient: string) => void;
}) {
  const { recipe, matched, missing, missingWithSubs, score } = match;
  const scoreColor =
    score >= 80 ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40'
    : score >= 50 ? 'text-amber-300 bg-amber-500/15 border-amber-500/40'
    : 'text-stone-300 bg-stone-800 border-stone-700';

  return (
    <div className="tv-focusable group flex flex-col overflow-hidden rounded-2xl border border-stone-800 bg-stone-900 transition hover:border-amber-400/50">
      <div className="relative h-36 overflow-hidden">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-stone-800 text-stone-600">
            <ChefHat size={40} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/30 to-transparent" />
        <div className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-sm font-bold ${scoreColor}`}>
          {score}% Match
        </div>
        {missing.length <= 1 && (
          <div className="absolute right-3 top-3 rounded-full bg-emerald-500/90 px-2.5 py-1 text-xs font-bold text-stone-900">
            Ready!
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-bold leading-tight">{recipe.title}</h3>
        <div className="mt-1 flex items-center gap-3 text-sm text-stone-400">
          <span>{recipe.cuisine}</span>
          <span>·</span>
          <span>{formatMinutes(recipe.prep_minutes)}</span>
          <span>·</span>
          <span>{recipe.difficulty}</span>
        </div>

        {/* Matched ingredients */}
        {matched.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
              You have ({matched.length})
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {matched.slice(0, 6).map((name) => (
                <span
                  key={name}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-sm text-emerald-200"
                >
                  {name}
                </span>
              ))}
              {matched.length > 6 && (
                <span className="px-1 text-sm text-stone-500">+{matched.length - 6} more</span>
              )}
            </div>
          </div>
        )}

        {/* Missing ingredients */}
        {missing.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-400/80">
              Missing ({missing.length})
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {missing.map((name) => {
                const hasSub = missingWithSubs.includes(name);
                return (
                  <button
                    key={name}
                    onClick={() => hasSub && onSubstitute(name)}
                    disabled={!hasSub}
                    className={`tv-focusable flex items-center gap-1 rounded-lg border px-2 py-0.5 text-sm transition ${
                      hasSub
                        ? 'border-amber-400/50 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20'
                        : 'border-stone-700 bg-stone-800 text-stone-400'
                    }`}
                  >
                    {name}
                    {hasSub && <Sparkles size={11} className="text-amber-300" />}
                  </button>
                );
              })}
            </div>
            {missingWithSubs.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-sm text-amber-300/80">
                <Sparkles size={13} />
                Tap a highlighted missing ingredient to see an AI substitute.
              </div>
            )}
          </div>
        )}

        <button
          onClick={onOpen}
          className="tv-focusable mt-4 flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-base font-bold text-stone-900 transition hover:bg-amber-300"
        >
          Start Cooking →
        </button>
      </div>
    </div>
  );
}

function MissingSubModal({
  ingredientName,
  subs,
  onClose,
}: {
  ingredientName: string;
  subs: Substitution[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[600px] max-w-[92vw] rounded-3xl border border-stone-700 bg-stone-900 p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="tv-focusable absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-stone-800 text-stone-300 hover:bg-stone-700"
        >
          <X size={20} />
        </button>
        <div className="flex items-center gap-3 text-amber-300">
          <Sparkles size={24} />
          <h2 className="text-xl font-bold">AI Substitute for {ingredientName}</h2>
        </div>
        {subs.length === 0 ? (
          <p className="mt-4 text-base text-stone-400">
            No substitutions on file for {ingredientName}.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {subs.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-stone-800 bg-stone-950 p-4"
              >
                <div className="text-lg font-semibold text-stone-50">{s.substitute}</div>
                {s.ratio && (
                  <div className="mt-1 text-base text-amber-300">Ratio: {s.ratio}</div>
                )}
                {s.note && <div className="mt-1 text-sm text-stone-400">{s.note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
