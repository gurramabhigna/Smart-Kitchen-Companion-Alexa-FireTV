import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChefHat,
  Clock,
  Hourglass,
  Lightbulb,
  ListChecks,
  Pause,
  Play,
  RefreshCw,
  Repeat,
  Salad,
  ScrollText,
  ShoppingBasket,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  formatTime,
  playChime,
  useRecipeDetail,
  useSpeech,
  useStepTimer,
  useSubstitutions,
} from '@/lib/hooks';
import type { Ingredient, Step, Substitution } from '@/lib/supabase';

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
  const [muted, setMuted] = useState(false);
  const speech = useSpeech();
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const steps = detail?.steps ?? [];
  const currentStep = steps[stepIndex];
  const timer = useStepTimer(currentStep?.timer_seconds ?? null);
  const stepNum = stepIndex + 1;

  // Reset step index when switching recipes.
  useEffect(() => {
    setStepIndex(0);
    speech.cancel();
  }, [recipeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build the spoken text for a step: "Step N. <instruction>. Tip: <tip>"
  const stepSpeechText = useCallback((step: Step | undefined, num: number) => {
    if (!step) return '';
    const parts = [`Step ${num}.`, step.instruction];
    if (step.tip) parts.push(`Tip: ${step.tip}`);
    return parts.join(' ');
  }, []);

  // Auto-read each step aloud when it becomes active (unless muted).
  useEffect(() => {
    if (!detail || !currentStep || mutedRef.current) return;
    speech.speak(stepSpeechText(currentStep, stepNum));
    return () => speech.cancel();
  }, [detail, stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the timer hits zero: play a chime and speak a notification.
  const prevTimerStatus = useRef(timer.status);
  useEffect(() => {
    if (prevTimerStatus.current !== 'done' && timer.status === 'done' && !mutedRef.current) {
      playChime();
      speech.speak(`Timer finished for Step ${stepNum}! Time to move on.`);
      flash(`Timer finished for Step ${stepNum}!`);
    }
    prevTimerStatus.current = timer.status;
  }, [timer.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Voice command simulator.
  useEffect(() => {
    if (!detail) return;
    const handler = (e: Event) => {
      const phrase = (e as CustomEvent<string>).detail?.toLowerCase() ?? '';
      actOnVoice(phrase);
    };
    window.addEventListener('kitchen-voice', handler);
    return () => window.removeEventListener('kitchen-voice', handler);
  }, [detail, stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const readStepAloud = useCallback(() => {
    if (!currentStep || mutedRef.current) {
      if (mutedRef.current) flash('Voice guide is muted. Unmute to hear the step.');
      return;
    }
    speech.speak(stepSpeechText(currentStep, stepNum));
    flash('Reading step aloud.');
  }, [currentStep, stepNum, speech, stepSpeechText]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (next) speech.cancel();
      flash(next ? 'Voice guide muted.' : 'Voice guide on.');
      return next;
    });
  }, [speech]);

  const actOnVoice = useCallback(
    (phrase: string) => {
      if (!detail) return;
      if (phrase.includes('next')) {
        setStepIndex((i) => Math.min(i + 1, Math.max(0, steps.length - 1)));
      } else if (phrase.includes('previous')) {
        if (phrase.includes('recipes')) {
          onExit();
          return;
        }
        setStepIndex((i) => Math.max(0, i - 1));
      } else if (phrase.includes('repeat') || phrase.includes('read')) {
        readStepAloud();
      } else if (phrase.includes('start timer')) {
        timer.start();
        flash('Timer started.');
      } else if (phrase.includes('pause timer')) {
        timer.pause();
        flash('Timer paused.');
      } else if (phrase.includes('reset timer')) {
        timer.reset();
        flash('Timer reset.');
      } else if (phrase.includes('mute')) {
        toggleMute();
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
        const missing = detail.ingredients.filter((ing) => !ingAcquired.has(ing.id));
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
    [detail, stepIndex, steps.length, timer, readStepAloud, toggleMute]
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

  const progress = steps.length > 0 ? Math.round(((stepIndex + 1) / steps.length) * 100) : 0;
  const stepIngredients =
    currentStep?.ingredients_needed
      ?.map((name) => detail.ingredients.find((i) => i.name.toLowerCase() === name.toLowerCase()))
      .filter((i): i is Ingredient => Boolean(i)) ?? [];

  return (
    <section>
      {/* Top bar: back, recipe title, mute toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            speech.cancel();
            onExit();
          }}
          className="tv-focusable flex items-center gap-3 rounded-2xl border border-stone-700 bg-stone-900 px-5 py-3 text-lg text-stone-300 transition hover:border-stone-500 hover:text-stone-100"
        >
          <ArrowLeft size={22} /> Recipes
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-base text-stone-400">
            <ChefHat size={20} className="text-amber-300" />
            <span className="text-stone-200">{detail.recipe.title}</span>
            <span>·</span>
            <span>Serves {detail.recipe.servings}</span>
          </div>
          <button
            onClick={toggleMute}
            className={`tv-focusable flex items-center gap-2 rounded-2xl border px-4 py-3 text-base font-semibold transition ${
              muted
                ? 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
            }`}
            title={muted ? 'Unmute voice guide' : 'Mute voice guide'}
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            {muted ? 'Muted' : 'Voice On'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-base text-stone-400">
          <span>
            Step {stepNum} of {steps.length}
          </span>
          <span>{progress}% complete</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-stone-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[1fr_400px] gap-6">
        {/* Main step panel */}
        <div className="rounded-3xl border border-stone-800 bg-stone-900/80 p-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-amber-300">
              <ScrollText size={24} />
              <span className="text-lg font-semibold uppercase tracking-widest">
                Step {stepNum}
              </span>
            </div>
            <button
              onClick={readStepAloud}
              className="tv-focusable flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-base font-semibold text-amber-300 transition hover:bg-amber-400/20"
              title="Read this step aloud"
            >
              <Volume2 size={20} /> Read Step Aloud
            </button>
          </div>

          {/* Step image */}
          {currentStep?.image_url && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-stone-700">
              <img
                src={currentStep.image_url}
                alt={`Step ${stepNum} visual`}
                loading="lazy"
                className="h-52 w-full object-cover"
              />
            </div>
          )}

          <p className="mt-5 text-2xl font-semibold leading-snug text-stone-50">
            {currentStep?.instruction}
          </p>

          {/* Tip box */}
          {currentStep?.tip && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
              <Lightbulb size={22} className="mt-0.5 shrink-0 text-amber-300" />
              <div>
                <div className="text-sm font-bold uppercase tracking-wider text-amber-300">
                  Chef's Tip
                </div>
                <p className="mt-1 text-base text-amber-100/90">{currentStep.tip}</p>
              </div>
            </div>
          )}

          {/* Per-step ingredients */}
          {stepIngredients.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-2 text-stone-300">
                <ListChecks size={18} className="text-amber-300" />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  You need right now
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {stepIngredients.map((ing) => (
                  <span
                    key={ing.id}
                    className={`rounded-xl border px-3 py-1.5 text-base font-medium ${
                      ing.is_protein
                        ? 'border-orange-500/40 bg-orange-500/10 text-orange-200'
                        : 'border-stone-700 bg-stone-800 text-stone-200'
                    }`}
                  >
                    {ing.name} · <span className="text-stone-400">{ing.quantity}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timer */}
          {currentStep?.timer_seconds ? (
            <div className="mt-6 rounded-2xl border border-amber-400/30 bg-gradient-to-br from-stone-900 to-stone-950 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-lg text-amber-300">
                  <AlarmClock size={24} /> Step Timer
                </div>
                <div className="flex items-center gap-3 text-stone-400">
                  <Clock size={18} />
                  <span>Total {formatTime(currentStep.timer_seconds)}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-6">
                <div
                  className={`font-mono text-[88px] font-bold leading-none tabular-nums transition-colors ${
                    timer.status === 'done'
                      ? 'text-emerald-400'
                      : timer.status === 'running'
                      ? 'text-amber-300'
                      : 'text-stone-100'
                  }`}
                >
                  {formatTime(timer.secondsLeft)}
                </div>
                <div className="flex flex-col gap-2.5">
                  {timer.status === 'running' ? (
                    <button
                      onClick={timer.pause}
                      className="tv-focusable flex items-center gap-2 rounded-2xl bg-stone-800 px-5 py-3 text-lg font-semibold text-stone-100 hover:bg-stone-700"
                    >
                      <Pause size={20} /> Pause
                    </button>
                  ) : (
                    <button
                      onClick={timer.start}
                      disabled={timer.status === 'done'}
                      className="tv-focusable flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-lg font-bold text-stone-900 transition hover:bg-amber-300 disabled:opacity-40"
                    >
                      <Play size={20} /> Start
                    </button>
                  )}
                  <button
                    onClick={timer.reset}
                    className="tv-focusable flex items-center gap-2 rounded-2xl border border-stone-700 px-5 py-3 text-lg font-semibold text-stone-300 hover:bg-stone-800"
                  >
                    <RefreshCw size={18} /> Reset
                  </button>
                </div>
              </div>
              {timer.status === 'done' && (
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-500/15 px-4 py-3 text-lg font-semibold text-emerald-300">
                  <Bell size={22} /> Timer finished — time to move on.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-stone-800 bg-stone-950 px-4 py-3 text-lg text-stone-400">
              <Hourglass size={22} className="text-stone-500" />
              No timer for this step — move on when ready.
            </div>
          )}

          {/* Nav buttons */}
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
              className="tv-focusable flex items-center gap-3 rounded-2xl border border-stone-700 px-5 py-3 text-lg font-semibold text-stone-200 disabled:opacity-30 hover:bg-stone-800"
            >
              <ArrowLeft size={20} /> Previous
            </button>
            <button
              onClick={readStepAloud}
              className="tv-focusable flex items-center gap-3 rounded-2xl border border-stone-700 px-5 py-3 text-lg font-semibold text-stone-200 hover:bg-stone-800"
            >
              <Repeat size={20} /> Repeat
            </button>
            {stepIndex < steps.length - 1 ? (
              <button
                onClick={() => setStepIndex((i) => Math.min(i + 1, steps.length - 1))}
                className="tv-focusable flex items-center gap-3 rounded-2xl bg-amber-400 px-5 py-3 text-lg font-bold text-stone-900 transition hover:bg-amber-300"
              >
                Next Step <ArrowRight size={20} />
              </button>
            ) : (
              <button
                onClick={() => {
                  speech.cancel();
                  onExit();
                }}
                className="tv-focusable flex items-center gap-3 rounded-2xl bg-emerald-500 px-5 py-3 text-lg font-bold text-stone-900 transition hover:bg-emerald-400"
              >
                <Check size={20} /> Finish
              </button>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-5">
          <button
            onClick={() => setShowIngredients((s) => !s)}
            className="tv-focusable flex items-center justify-between rounded-2xl border border-stone-700 bg-stone-900 px-5 py-4 text-xl font-semibold text-stone-100 transition hover:border-amber-400/50"
          >
            <span className="flex items-center gap-3">
              <ListChecks size={24} className="text-amber-300" /> Ingredients
            </span>
            <span className="text-base text-stone-400">{showIngredients ? 'Hide' : 'Show'}</span>
          </button>

          {showIngredients && (
            <div className="rounded-3xl border border-stone-800 bg-stone-900/80 p-5">
              <ul className="space-y-2.5">
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

          <div className="rounded-3xl border border-stone-800 bg-stone-900/80 p-5">
            <div className="flex items-center gap-3 text-amber-300">
              <Sparkles size={22} />
              <h3 className="text-lg font-semibold">Quick Actions</h3>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2.5">
              <QuickBtn
                label="Add missing to shopping list"
                icon={<ShoppingBasket size={18} />}
                onClick={() => {
                  const missing = detail.ingredients.filter((i) => !ingAcquired.has(i.id));
                  if (missing.length === 0) {
                    flash('Everything is checked off.');
                    return;
                  }
                  missing.forEach((i) => onAddToShopping(i.name, i.quantity));
                  flash(`Added ${missing.length} items to the shopping list.`);
                }}
              />
              <QuickBtn
                label="Swap an ingredient (AI)"
                icon={<Salad size={18} />}
                onClick={() => {
                  const firstSub = detail.ingredients.find((i) =>
                    subs.some((s) => s.ingredient_name.toLowerCase() === i.name.toLowerCase())
                  );
                  if (firstSub) setSubFor(firstSub.name);
                  else flash('No substitutions available for this recipe.');
                }}
              />
              <QuickBtn
                label={muted ? 'Unmute voice guide' : 'Mute voice guide'}
                icon={muted ? <Volume2 size={18} /> : <VolumeX size={18} />}
                onClick={toggleMute}
              />
            </div>
          </div>
        </div>
      </div>

      {subFor && (
        <SubstitutionModal
          ingredientName={subFor}
          subs={subs.filter((s) => s.ingredient_name.toLowerCase() === subFor.toLowerCase())}
          onClose={() => setSubFor(null)}
          onAdd={(sub) => {
            onAddToShopping(`${sub.substitute} (for ${subFor})`);
            flash(`Added ${sub.substitute} to your shopping list.`);
            setSubFor(null);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-10 left-1/2 z-40 -translate-x-1/2 rounded-2xl border border-amber-400/40 bg-stone-900 px-7 py-3.5 text-xl font-semibold text-amber-200 shadow-2xl">
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
      className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
        acquired
          ? 'border-emerald-500/30 bg-emerald-500/5 text-stone-400'
          : 'border-stone-800 bg-stone-950/60 text-stone-100'
      }`}
    >
      <button onClick={onToggle} className="tv-focusable flex flex-1 items-center gap-3 text-left">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${
            acquired
              ? 'border-emerald-500 bg-emerald-500 text-stone-900'
              : 'border-stone-700 text-transparent'
          }`}
        >
          <Check size={18} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{ing.name}</span>
            {ing.is_protein && (
              <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-xs font-bold text-orange-300">
                PROTEIN
              </span>
            )}
          </div>
          <span className={`text-base ${acquired ? 'line-through' : 'text-amber-300'}`}>
            {ing.quantity}
          </span>
        </div>
      </button>
      {hasSub && (
        <button
          onClick={onSubstitute}
          className="tv-focusable ml-2 flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/40 px-3 py-1.5 text-sm font-semibold text-amber-300 hover:bg-amber-400/10"
        >
          <Sparkles size={14} /> AI Sub
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
      className="tv-focusable flex items-center gap-3 rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3.5 text-base font-semibold text-stone-100 transition hover:border-amber-400/60 hover:bg-amber-400/10"
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
      <div className="relative w-[720px] max-w-[92vw] rounded-3xl border border-stone-700 bg-stone-900 p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="tv-focusable absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-stone-800 text-stone-300 hover:bg-stone-700"
        >
          <X size={22} />
        </button>
        <div className="flex items-center gap-3 text-amber-300">
          <Salad size={26} />
          <h2 className="text-2xl font-bold">AI Substitute: {ingredientName}</h2>
        </div>
        {subs.length === 0 ? (
          <p className="mt-5 text-lg text-stone-400">
            No substitutions on file for {ingredientName}.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {subs.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-stone-800 bg-stone-950 p-4"
              >
                <div>
                  <div className="text-xl font-semibold text-stone-50">{s.substitute}</div>
                  {s.ratio && (
                    <div className="mt-1 text-base text-amber-300">Ratio: {s.ratio}</div>
                  )}
                  {s.note && <div className="mt-1 text-base text-stone-400">{s.note}</div>}
                </div>
                <button
                  onClick={() => onAdd(s)}
                  className="tv-focusable flex items-center gap-2 rounded-2xl bg-amber-400 px-4 py-2.5 text-base font-bold text-stone-900 hover:bg-amber-300"
                >
                  <ShoppingBasket size={18} /> Add to list
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
