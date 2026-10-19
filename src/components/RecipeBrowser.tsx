import { Flame, Loader2, Search, Sparkles, UtensilsCrossed, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CUISINES } from '@/lib/supabase';
import type { Cuisine, Recipe } from '@/lib/supabase';
import { formatMinutes, groupByCuisine } from '@/lib/hooks';

const CUISINE_ICON: Record<Cuisine, string> = {
  Italian: '🍝',
  Indian: '🍛',
  Mexican: '🌮',
  Asian: '🍜',
  Mediterranean: '🥗',
};

export function RecipeBrowser({
  recipes,
  loading,
  onOpen,
  onPantry,
}: {
  recipes: Recipe[];
  loading: boolean;
  onOpen: (r: Recipe) => void;
  onPantry: () => void;
}) {
  const [query, setQuery] = useState('');
  const [activeCuisine, setActiveCuisine] = useState<Cuisine | 'All'>('All');

  const grouped = useMemo(() => groupByCuisine(recipes), [recipes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      const matchesQuery =
        !q ||
        [r.title, r.description ?? '', r.cuisine ?? '', ...r.tags]
          .join(' ')
          .toLowerCase()
          .includes(q);
      const matchesCuisine = activeCuisine === 'All' || r.cuisine === activeCuisine;
      return matchesQuery && matchesCuisine;
    });
  }, [recipes, query, activeCuisine]);

  const visibleGrouped = useMemo(() => {
    if (activeCuisine !== 'All') {
      const list = filtered;
      return { [activeCuisine]: list } as Partial<Record<Cuisine, Recipe[]>>;
    }
    const result: Partial<Record<Cuisine, Recipe[]>> = {};
    CUISINES.forEach((c) => {
      const list = grouped[c].filter((r) => filtered.includes(r));
      if (list.length) result[c] = list;
    });
    return result;
  }, [filtered, grouped, activeCuisine]);

  return (
    <section>
      {/* Pantry matcher banner */}
      <button
        onClick={onPantry}
        className="tv-focusable group mb-6 flex w-full items-center justify-between rounded-3xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-stone-900/40 px-6 py-4 text-left transition hover:border-emerald-400/60 hover:from-emerald-500/15"
      >
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-stone-900">
            <UtensilsCrossed size={24} />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-200">What's in My Kitchen?</div>
            <div className="text-base text-stone-400">
              Tell us what ingredients you have — we'll match recipes you can cook right now.
            </div>
          </div>
        </div>
        <span className="text-lg font-semibold text-emerald-300 transition group-hover:text-emerald-200">
          Match my pantry →
        </span>
      </button>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Tonight's Recipes</h1>
          <p className="mt-2 text-lg text-stone-400">
            Pick a dish and your kitchen will walk you through it, hands-free.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-stone-500" size={24} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes, tags, cuisines…"
            className="tv-focusable w-[420px] rounded-2xl border border-stone-700 bg-stone-900 py-3 pl-12 pr-5 text-lg text-stone-100 placeholder:text-stone-500 focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Cuisine category tabs */}
      <div className="mt-6 flex flex-wrap gap-3">
        <CuisineTab
          label="All Cuisines"
          active={activeCuisine === 'All'}
          onClick={() => setActiveCuisine('All')}
        />
        {CUISINES.map((c) => (
          <CuisineTab
            key={c}
            label={`${CUISINE_ICON[c]}  ${c}`}
            count={grouped[c].length}
            active={activeCuisine === c}
            onClick={() => setActiveCuisine(c)}
          />
        ))}
      </div>

      {loading ? (
        <div className="mt-20 flex items-center justify-center gap-4 text-2xl text-stone-400">
          <Loader2 className="animate-spin" /> Loading recipes…
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-stone-800 bg-stone-900 p-12 text-center text-xl text-stone-400">
          No recipes match "{query}".
        </div>
      ) : (
        <div className="mt-8 space-y-12">
          {(Object.keys(visibleGrouped) as Cuisine[]).map((cuisine) => (
            <CuisineSection
              key={cuisine}
              cuisine={cuisine}
              recipes={visibleGrouped[cuisine]!}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CuisineTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`tv-focusable flex items-center gap-2 rounded-2xl px-5 py-2.5 text-lg font-semibold transition ${
        active
          ? 'bg-amber-400 text-stone-900'
          : 'border border-stone-700 bg-stone-900 text-stone-200 hover:border-amber-400/50 hover:text-amber-200'
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`rounded-full px-2 text-sm font-bold ${
            active ? 'bg-stone-900/20 text-stone-900' : 'bg-stone-800 text-stone-400'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function CuisineSection({
  cuisine,
  recipes,
  onOpen,
}: {
  cuisine: Cuisine;
  recipes: Recipe[];
  onOpen: (r: Recipe) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="text-2xl">{CUISINE_ICON[cuisine]}</span>
        <h2 className="text-2xl font-bold tracking-tight">{cuisine}</h2>
        <span className="text-base text-stone-500">{recipes.length} recipes</span>
        <div className="ml-4 h-px flex-1 bg-gradient-to-r from-stone-700/60 to-transparent" />
      </div>
      <div className="grid grid-cols-3 gap-6 xl:grid-cols-5">
        {recipes.map((r) => (
          <RecipeCard key={r.id} recipe={r} onOpen={() => onOpen(r)} />
        ))}
      </div>
    </div>
  );
}

function RecipeCard({ recipe, onOpen }: { recipe: Recipe; onOpen: () => void }) {
  const [showSubs, setShowSubs] = useState(false);
  return (
    <>
      <button
        onClick={onOpen}
        className="tv-focusable group relative flex flex-col overflow-hidden rounded-2xl border border-stone-800 bg-stone-900 text-left transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-2xl hover:shadow-orange-900/30"
      >
        <div className="relative h-40 overflow-hidden">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-stone-800 text-stone-600">
              <Flame size={48} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/20 to-transparent" />
          <div className="absolute left-3 top-3 flex gap-2">
            <span className="rounded-full bg-stone-950/85 px-3 py-1 text-sm font-semibold text-amber-300">
              {recipe.difficulty}
            </span>
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-stone-950/85 px-3 py-1 text-sm font-semibold text-stone-100">
            <Flame size={14} className="text-orange-400" />
            {formatMinutes(recipe.prep_minutes)}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-lg font-bold leading-tight">{recipe.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-stone-400">{recipe.description}</p>
          <div className="mt-3 flex items-center gap-1.5 text-sm text-stone-500">
            <UtensilsCrossed size={14} className="text-stone-500" />
            Serves {recipe.servings}
          </div>
          <div className="mt-auto flex items-center justify-between pt-3">
            <span className="text-sm font-semibold text-amber-300 transition group-hover:text-amber-200">
              Start cooking →
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setShowSubs(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  setShowSubs(true);
                }
              }}
              className="tv-focusable flex items-center gap-1 rounded-lg border border-amber-400/40 px-2 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-400/10"
            >
              <Sparkles size={12} /> AI Substitute
            </span>
          </div>
        </div>
      </button>
      {showSubs && (
        <SubstitutePreview recipe={recipe} onClose={() => setShowSubs(false)} onOpen={onOpen} />
      )}
    </>
  );
}

/**
 * A lightweight modal that lists the recipe's ingredients and an "AI Substitute"
 * suggestion for each. Opens from the card's AI Substitute button without
 * navigating into the full cook view.
 */
function SubstitutePreview({
  recipe,
  onClose,
  onOpen,
}: {
  recipe: Recipe;
  onClose: () => void;
  onOpen: () => void;
}) {
  // We only know the recipe-level summary here (no ingredients fetched yet at
  // browse time), so we present a friendly prompt to start cooking for full
  // substitution details — the cook view has the live ingredient list.
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[560px] max-w-[92vw] rounded-3xl border border-stone-700 bg-stone-900 p-7 shadow-2xl"
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
          <h2 className="text-xl font-bold">AI Substitute</h2>
        </div>
        <h3 className="mt-3 text-lg font-semibold text-stone-50">{recipe.title}</h3>
        <p className="mt-2 text-base text-stone-400">
          Start cooking to see each ingredient with personalized swap suggestions,
          ratios, and chef tips — then add the substitute straight to your
          shopping list.
        </p>
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => {
              onClose();
              onOpen();
            }}
            className="tv-focusable flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-base font-bold text-stone-900 hover:bg-amber-300"
          >
            <Sparkles size={18} /> Start Cooking
          </button>
          <button
            onClick={onClose}
            className="tv-focusable rounded-2xl border border-stone-700 px-5 py-3 text-base font-semibold text-stone-300 hover:bg-stone-800"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
