import { Flame, Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Recipe } from '@/lib/supabase';

export function RecipeBrowser({
  recipes,
  loading,
  onOpen,
}: {
  recipes: Recipe[];
  loading: boolean;
  onOpen: (r: Recipe) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) =>
      [r.title, r.description ?? '', r.cuisine ?? '', ...r.tags]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [recipes, query]);

  return (
    <section>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-5xl font-bold tracking-tight">Tonight's Recipes</h1>
          <p className="mt-2 text-xl text-stone-400">
            Pick a dish and your kitchen will walk you through it, hands-free.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-stone-500" size={26} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes, tags, cuisines…"
            className="w-[460px] rounded-2xl border border-stone-700 bg-stone-900 py-4 pl-14 pr-6 text-xl text-stone-100 placeholder:text-stone-500 focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="mt-20 flex items-center justify-center gap-4 text-2xl text-stone-400">
          <Loader2 className="animate-spin" /> Loading recipes…
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-3 gap-8">
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} onOpen={() => onOpen(r)} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 rounded-2xl border border-stone-800 bg-stone-900 p-12 text-center text-2xl text-stone-400">
              No recipes match "{query}".
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function RecipeCard({ recipe, onOpen }: { recipe: Recipe; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-stone-800 bg-stone-900 text-left transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-2xl hover:shadow-orange-900/30"
    >
      <div className="relative h-64 overflow-hidden">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-stone-800 text-stone-600">
            <Flame size={64} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/20 to-transparent" />
        <div className="absolute left-4 top-4 flex gap-2">
          <span className="rounded-full bg-stone-950/80 px-4 py-1.5 text-base font-semibold text-amber-300">
            {recipe.difficulty}
          </span>
          {recipe.cuisine && (
            <span className="rounded-full bg-stone-950/80 px-4 py-1.5 text-base font-semibold text-stone-200">
              {recipe.cuisine}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-2xl font-bold leading-tight">{recipe.title}</h3>
        <p className="mt-2 line-clamp-2 text-lg text-stone-400">{recipe.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {recipe.tags.map((t) => (
            <span
              key={t}
              className="rounded-lg bg-stone-800 px-3 py-1 text-base text-stone-300"
            >
              #{t}
            </span>
          ))}
        </div>
        <div className="mt-auto pt-6 text-lg font-semibold text-amber-300 transition group-hover:text-amber-200">
          Start cooking →
        </div>
      </div>
    </button>
  );
}
