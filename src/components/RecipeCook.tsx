import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  Clock,
  Hourglass,
  ListChecks,
  Pause,
  Play,
  RefreshCw,
  Repeat,
  Salad,
  ScrollText,
  ShoppingBasket,
  Sparkles,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  formatTime,
  useRecipeDetail,
  useStepTimer,
  useSubstitutions,
} from '@/lib/hooks';
import type { Ingredient, Substitution } from '@/lib/supabase';

export function RecipeCook({
  recipeId,
  onExit,
  onAddToShopping,
}: {
  recipeId: string;
  onExit: () => void;
  onAddToShopping: (item: string, qty?: string) => void;
}) {
  const { detail, loading, error } = useRecipeDetail(recipeId);
  const subs = useSubstitutions();
  const [stepIndex, setStepIndex] = useState(0);
  const [showIngredients, setShowIngredients] = useState(true);
  const [subFor, setSubFor] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const steps = detail?.steps ?? [];
  const currentStep = steps[stepIndex];
  const timer = useStepTimer(currentStep?.timer_seconds ?? null);

  useEffect(() => {
    setStepIndex(0);
  }, [recipeId]);

  // Voice command simulator: listen for the kitchen-voice events and react.
  useEffect(() => {
    if (!detail) return;
    const handler = (e: Event) => {
      const phrase = (e as CustomEvent<string>).detail?.toLowerCase() ?? '';
      actOnVoice(phrase);
    };
    window.addEventListener('kitchen-voice', handler);
    return () => window.removeEventListener('kitchen-voice', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, stepIndex]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const actOnVoice = useCallback(
    (phrase: string) => {
      if (!detail) return;
      if (phrase.includes('next')) {
        setStepIndex((i) => Math.min(i + 1, Math.max(0, steps.length - 1)));
        flash('Moving to the next step.');
      } else if (phrase.includes('previous') || phrase.includes('back to')) {
        if (phrase.includes('recipes')) {
          onExit();
          return;
        }
        setStepIndex((i) => Math.max(0, i - 1));
        flash('Going back a step.');
      } else if (phrase.includes('repeat')) {
        flash(`Repeating step ${stepIndex + 1}.`);
      } else if (phrase.includes('start timer')) {
        timer.start();
        flash('Timer started.');
      } else if (phrase.includes('pause timer')) {
        timer.pause();
        flash('Timer paused.');
      } else if (phrase.includes('reset timer')) {
        timer.reset();
        flash('Timer reset.');
      } else if (phrase.includes('ingredient')) {
        setShowIngredients(true);
        flash('Showing ingredients.');
      } else if (phrase.includes('substitute')) {
        const target = phrase.replace('substitute', '').trim();
        const match = detail.ingredients.find((ing) =>
          ing.name.toLowerCase().includes(target)
        );
        if (match) {
          setSubFor(match.name);
          flash(`Substituting ${match.name}.`);
        } else {
          flash(`No substitute found for "${target}".`);
        }
      } else if (phrase.includes('shopping')) {
        const missing = detail.ingredients.filter(
          (ing) => !ingAcquired.has(ing.id)
        );
        const targets = phrase.includes('all')
          ? detail.ingredients
          : missing.length > 0
          ? [missing[0]]
          : [];
        targets.forEach((ing) => onAddToShopping(ing.name, ing.quantity));
        if (targets.length > 0) {
          flash(`Added ${targets.length} item${targets.length > 1 ? 's' : ''} to the shopping list.`);
        } else {
          flash('Shopping list is up to date.');
        }
      } else if (phrase.includes('finish')) {
        onExit();
      } else {
        flash(`Heard: "${phrase}" — try another command.`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detail, stepIndex, steps.length, timer]
  );

  const [ingAcquired, setIngAcquired] = useState<Set<string>>(new Set());
  useEffect(() => setIngAcquired(new Set()), [recipeId]);

  const toggleAcquired = (id: string) =>
    setIngAcquired((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-3xl text-stone-400">
        <RefreshCw className="mr-4 animate-spin" /> Loading recipe…
      </div>
    );
  }
  if (error || !detail) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-2xl text-red-200">
        {error ?? 'Recipe not found.'}
      </div>
    );
  }

  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  return (
    <section>
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          className="flex items-center gap-3 rounded-2xl border border-stone-700 bg-stone-900 px-5 py-3 text-xl text-stone-300 transition hover:border-stone-500 hover:text-stone-100"
        >
          <ArrowLeft size={24} /> Recipes
        </button>
        <div className="flex items-center gap-3 text-lg text-stone-400">
          <ChefHat size={22} className="text-amber-300" />
          <span className="text-stone-200">{detail.recipe.title}</span>
          <span>·</span>
          <span>Serves {detail.recipe.servings}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-lg text-stone-400">
          <span>
            Step {stepIndex + 1} of {steps.length}
          </span>
          <span>{progress}% complete</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-[1fr_460px] gap-8">
        {/* Main step panel */}
        <div className="rounded-3xl border border-stone-800 bg-stone-900/80 p-10">
          <div className="flex items-center gap-3 text-amber-300">
            <ScrollText size={28} />
            <span className="text-xl font-semibold uppercase tracking-widest">
              Step {stepIndex + 1}
            </span>
          </div>
          <p className="mt-6 text-4xl font-semibold leading-snug text-stone-50">
            {currentStep?.instruction}
          </p>

          {currentStep?.timer_seconds ? (
            <div className="mt-10 rounded-3xl border border-amber-400/30 bg-gradient-to-br from-stone-900 to-stone-950 p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xl text-amber-300">
                  <AlarmClock size={26} /> Step Timer
                </div>
                <div className="flex items-center gap-3 text-stone-400">
                  <Clock size={20} />
                  <span>
                    Total {formatTime(currentStep.timer_seconds)}
                  </span>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-8">
                <div
                  className={`font-mono text-[120px] font-bold leading-none tabular-nums transition-colors ${
                    timer.status === 'done'
                      ? 'text-emerald-400'
                      : timer.status === 'running'
                      ? 'text-amber-300'
                      : 'text-stone-100'
                  }`}
                >
                  {formatTime(timer.secondsLeft)}
                </div>
                <div className="flex flex-col gap-3">
                  {timer.status === 'running' ? (
                    <button
                      onClick={timer.pause}
                      className="flex items-center gap-2 rounded-2xl bg-stone-800 px-6 py-4 text-xl font-semibold text-stone-100 hover:bg-stone-700"
                    >
                      <Pause size={22} /> Pause
                    </button>
                  ) : (
                    <button
                      onClick={timer.start}
                      disabled={timer.status === 'done'}
                      className="flex items-center gap-2 rounded-2xl bg-amber-400 px-6 py-4 text-xl font-bold text-stone-900 transition hover:bg-amber-300 disabled:opacity-40"
                    >
                      <Play size={22} /> Start
                    </button>
                  )}
                  <button
                    onClick={timer.reset}
                    className="flex items-center gap-2 rounded-2xl border border-stone-700 px-6 py-4 text-xl font-semibold text-stone-300 hover:bg-stone-800"
                  >
                    <RefreshCw size={20} /> Reset
                  </button>
                </div>
              </div>
              {timer.status === 'done' && (
                <div className="mt-6 flex items-center gap-3 rounded-2xl bg-emerald-500/15 px-5 py-4 text-xl font-semibold text-emerald-300">
                  <Check size={24} /> Timer finished — time to move on.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-10 flex items-center gap-3 rounded-2xl border border-stone-800 bg-stone-950 px-5 py-4 text-xl text-stone-400">
              <Hourglass size={24} className="text-stone-500" />
              No timer for this step — move on when ready.
            </div>
          )}

          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
              className="flex items-center gap-3 rounded-2xl border border-stone-700 px-6 py-4 text-xl font-semibold text-stone-200 disabled:opacity-30 hover:bg-stone-800"
            >
              <ArrowLeft size={22} /> Previous
            </button>
            <button
              onClick={() => flash('Repeating current step.')}
              className="flex items-center gap-3 rounded-2xl border border-stone-700 px-6 py-4 text-xl font-semibold text-stone-200 hover:bg-stone-800"
            >
              <Repeat size={22} /> Repeat
            </button>
            {stepIndex < steps.length - 1 ? (
              <button
                onClick={() => setStepIndex((i) => Math.min(i + 1, steps.length - 1))}
                className="flex items-center gap-3 rounded-2xl bg-amber-400 px-6 py-4 text-xl font-bold text-stone-900 transition hover:bg-amber-300"
              >
                Next Step <ArrowRight size={22} />
              </button>
            ) : (
              <button
                onClick={onExit}
                className="flex items-center gap-3 rounded-2xl bg-emerald-500 px-6 py-4 text-xl font-bold text-stone-900 transition hover:bg-emerald-400"
              >
                <Check size={22} /> Finish
              </button>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-6">
          <button
            onClick={() => setShowIngredients((s) => !s)}
            className="flex items-center justify-between rounded-2xl border border-stone-700 bg-stone-900 px-6 py-5 text-2xl font-semibold text-stone-100 transition hover:border-amber-400/50"
          >
            <span className="flex items-center gap-3">
              <ListChecks size={26} className="text-amber-300" /> Ingredients
            </span>
            <span className="text-lg text-stone-400">
              {showIngredients ? 'Hide' : 'Show'}
            </span>
          </button>

          {showIngredients && (
            <div className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
              <ul className="space-y-3">
                {detail.ingredients.map((ing) => (
                  <li key={ing.id}>
                    <IngredientRow
                      ing={ing}
                      acquired={ingAcquired.has(ing.id)}
                      onToggle={() => toggleAcquired(ing.id)}
                      onSubstitute={() => setSubFor(ing.name)}
                      hasSub={subs.some(
                        (s) => s.ingredient_name.toLowerCase() === ing.name.toLowerCase()
                      )}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
            <div className="flex items-center gap-3 text-amber-300">
              <UtensilsCrossed size={24} />
              <h3 className="text-xl font-semibold">Quick Actions</h3>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <QuickBtn
                label="Add missing to list"
                icon={<ShoppingBasket size={20} />}
                onClick={() => {
                  const missing = detail.ingredients.filter(
                    (i) => !ingAcquired.has(i.id)
                  );
                  if (missing.length === 0) {
                    flash('Everything is checked off.');
                    return;
                  }
                  missing.forEach((i) => onAddToShopping(i.name, i.quantity));
                  flash(`Added ${missing.length} items to the shopping list.`);
                }}
              />
              <QuickBtn
                label="Swap an ingredient"
                icon={<Salad size={20} />}
                onClick={() => {
                  const firstSub = detail.ingredients.find((i) =>
                    subs.some((s) => s.ingredient_name.toLowerCase() === i.name.toLowerCase())
                  );
                  if (firstSub) setSubFor(firstSub.name);
                  else flash('No substitutions available for this recipe.');
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {subFor && (
        <SubstitutionModal
          ingredientName={subFor}
          subs={subs.filter(
            (s) => s.ingredient_name.toLowerCase() === subFor.toLowerCase()
          )}
          onClose={() => setSubFor(null)}
          onAdd={(sub) => {
            onAddToShopping(`${sub.substitute} (for ${subFor})`);
            flash(`Added ${sub.substitute} to your shopping list.`);
            setSubFor(null);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-10 left-1/2 z-40 -translate-x-1/2 rounded-2xl border border-amber-400/40 bg-stone-900 px-8 py-4 text-2xl font-semibold text-amber-200 shadow-2xl">
          {toast}
        </div>
      )}
    </section>
  );
}

function IngredientRow({
  ing,
  acquired,
  onToggle,
  onSubstitute,
  hasSub,
}: {
  ing: Ingredient;
  acquired: boolean;
  onToggle: () => void;
  onSubstitute: () => void;
  hasSub: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl border px-5 py-4 transition ${
        acquired
          ? 'border-emerald-500/30 bg-emerald-500/5 text-stone-400'
          : 'border-stone-800 bg-stone-950/60 text-stone-100'
      }`}
    >
      <button onClick={onToggle} className="flex flex-1 items-center gap-4 text-left">
        <span
          className={`grid h-9 w-9 place-items-center rounded-lg border ${
            acquired
              ? 'border-emerald-500 bg-emerald-500 text-stone-900'
              : 'border-stone-700 text-transparent'
          }`}
        >
          <Check size={20} />
        </span>
        <span className="text-2xl font-semibold">{ing.name}</span>
        <span className={`text-xl ${acquired ? 'line-through' : 'text-amber-300'}`}>
          {ing.quantity}
        </span>
      </button>
      {hasSub && (
        <button
          onClick={onSubstitute}
          className="ml-3 flex items-center gap-2 rounded-xl border border-amber-400/40 px-4 py-2 text-base font-semibold text-amber-300 hover:bg-amber-400/10"
        >
          <Sparkles size={16} /> Substitute
        </button>
      )}
    </div>
  );
}

function QuickBtn({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-stone-700 bg-stone-950 px-5 py-5 text-xl font-semibold text-stone-100 transition hover:border-amber-400/60 hover:bg-amber-400/10"
    >
      <span className="text-amber-300">{icon}</span>
      {label}
    </button>
  );
}

function SubstitutionModal({
  ingredientName,
  subs,
  onClose,
  onAdd,
}: {
  ingredientName: string;
  subs: Substitution[];
  onClose: () => void;
  onAdd: (sub: Substitution) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm">
      <div className="relative w-[820px] max-w-[92vw] rounded-3xl border border-stone-700 bg-stone-900 p-10 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 grid h-12 w-12 place-items-center rounded-full bg-stone-800 text-stone-300 hover:bg-stone-700"
        >
          <X size={24} />
        </button>
        <div className="flex items-center gap-3 text-amber-300">
          <Salad size={28} />
          <h2 className="text-3xl font-bold">Substituting {ingredientName}</h2>
        </div>
        {subs.length === 0 ? (
          <p className="mt-6 text-xl text-stone-400">
            No substitutions on file for {ingredientName}.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {subs.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-stone-800 bg-stone-950 p-5"
              >
                <div>
                  <div className="text-2xl font-semibold text-stone-50">{s.substitute}</div>
                  {s.ratio && (
                    <div className="mt-1 text-lg text-amber-300">Ratio: {s.ratio}</div>
                  )}
                  {s.note && (
                    <div className="mt-1 text-lg text-stone-400">{s.note}</div>
                  )}
                </div>
                <button
                  onClick={() => onAdd(s)}
                  className="flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-lg font-bold text-stone-900 hover:bg-amber-300"
                >
                  <ShoppingBasket size={20} /> Add to list
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
