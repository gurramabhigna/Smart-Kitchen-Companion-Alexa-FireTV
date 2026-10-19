import { useEffect, useState } from 'react';
import { ChefHat, Mic, ShoppingBasket, UtensilsCrossed, Volume2, X } from 'lucide-react';
import { useRecipes, useShoppingList } from '@/lib/hooks';
import type { Recipe } from '@/lib/supabase';
import { RecipeBrowser } from '@/components/RecipeBrowser';
import { RecipeCook } from '@/components/RecipeCook';
import { ShoppingPanel } from '@/components/ShoppingPanel';
import { PantryMatcher } from '@/components/PantryMatcher';

type Screen =
  | { kind: 'browse' }
  | { kind: 'pantry' }
  | { kind: 'cook'; recipeId: string }
  | { kind: 'shopping' };

export function App() {
  const { recipes, loading, error } = useRecipes();
  const [screen, setScreen] = useState<Screen>({ kind: 'browse' });
  const [voiceLog, setVoiceLog] = useState<string[]>([]);
  const shopping = useShoppingList();
  const [voiceOpen, setVoiceOpen] = useState(false);

  const pushLog = (msg: string) =>
    setVoiceLog((prev) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...prev].slice(0, 10));

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) pushLog(`Heard: "${detail}"`);
    };
    window.addEventListener('kitchen-voice', handler);
    return () => window.removeEventListener('kitchen-voice', handler);
  }, []);

  const openRecipe = (r: Recipe) => setScreen({ kind: 'cook', recipeId: r.id });

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-400/30">
      <BackgroundGlow />
      <div className="relative z-10 mx-auto max-w-[1760px] px-10 py-8">
        <Header
          onHome={() => setScreen({ kind: 'browse' })}
          onPantry={() => setScreen({ kind: 'pantry' })}
          onShopping={() => setScreen({ kind: 'shopping' })}
          shoppingCount={shopping.items.length}
          onVoice={() => setVoiceOpen(true)}
        />

        <main className="mt-8">
          {error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-xl text-red-200">
              Couldn't load recipes: {error}
            </div>
          )}

          {screen.kind === 'browse' && (
            <RecipeBrowser
              recipes={recipes}
              loading={loading}
              onOpen={openRecipe}
              onPantry={() => setScreen({ kind: 'pantry' })}
            />
          )}

          {screen.kind === 'pantry' && (
            <PantryMatcher
              recipes={recipes}
              onOpen={openRecipe}
              onClose={() => setScreen({ kind: 'browse' })}
            />
          )}

          {screen.kind === 'cook' && (
            <RecipeCook
              recipeId={screen.recipeId}
              onExit={() => setScreen({ kind: 'browse' })}
              onAddToShopping={(item: string, qty?: string) => shopping.add(item, qty)}
            />
          )}

          {screen.kind === 'shopping' && (
            <ShoppingPanel
              items={shopping.items}
              loading={shopping.loading}
              onToggle={shopping.toggle}
              onRemove={shopping.remove}
            />
          )}
        </main>
      </div>

      {voiceOpen && (
        <VoicePanel
          onClose={() => setVoiceOpen(false)}
          log={voiceLog}
          onClear={() => setVoiceLog([])}
          onCommand={(phrase) => {
            window.dispatchEvent(new CustomEvent('kitchen-voice', { detail: phrase }));
            setVoiceOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Header({
  onHome,
  onPantry,
  onShopping,
  shoppingCount,
  onVoice,
}: {
  onHome: () => void;
  onPantry: () => void;
  onShopping: () => void;
  shoppingCount: number;
  onVoice: () => void;
}) {
  return (
    <header className="flex items-center justify-between">
      <button onClick={onHome} className="tv-focusable group flex items-center gap-4 rounded-2xl">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-stone-900 shadow-lg shadow-orange-900/40 transition-transform group-hover:scale-105">
          <ChefHat size={30} strokeWidth={2.4} />
        </div>
        <div className="text-left">
          <div className="text-2xl font-bold tracking-tight">Smart Kitchen</div>
          <div className="text-base text-stone-400">Fire TV Companion</div>
        </div>
      </button>

      <div className="flex items-center gap-4">
        <button
          onClick={onPantry}
          className="tv-focusable flex items-center gap-3 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-lg font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
        >
          <UtensilsCrossed size={22} />
          What's in My Kitchen?
        </button>
        <button
          onClick={onVoice}
          className="tv-focusable flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-5 py-3 text-lg font-semibold text-amber-300 transition hover:bg-amber-400/20"
        >
          <Mic size={22} />
          Hands-Free Voice
        </button>
        <button
          onClick={onShopping}
          className="tv-focusable relative flex items-center gap-3 rounded-2xl border border-stone-700 bg-stone-900 px-5 py-3 text-lg font-semibold text-stone-200 transition hover:border-stone-500"
        >
          <ShoppingBasket size={22} />
          Shopping List
          {shoppingCount > 0 && (
            <span className="absolute -right-2 -top-2 grid h-7 min-w-7 place-items-center rounded-full bg-amber-400 px-2 text-sm font-bold text-stone-900">
              {shoppingCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

function BackgroundGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -left-32 -top-40 h-[600px] w-[600px] rounded-full bg-orange-600/10 blur-3xl" />
      <div className="absolute -right-32 top-1/3 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-stone-700/10 blur-3xl" />
    </div>
  );
}

export function VoicePanel({
  onClose,
  log,
  onClear,
  onCommand,
}: {
  onClose: () => void;
  log: string[];
  onClear: () => void;
  onCommand: (phrase: string) => void;
}) {
  const commands = [
    'Next Step',
    'Previous Step',
    'Repeat Step',
    'Start Timer',
    'Pause Timer',
    'Substitute Butter',
    'Substitute Eggs',
    'Substitute Sugar',
    'Add to Shopping List',
    'Show Ingredients',
    'Back to Recipes',
    'Finish Cooking',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm">
      <div className="relative w-[1100px] max-w-[94vw] rounded-3xl border border-stone-700 bg-stone-900/95 p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="tv-focusable absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-stone-800 text-stone-300 hover:bg-stone-700"
          aria-label="Close voice panel"
        >
          <X size={22} />
        </button>

        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-stone-900">
            <Mic size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Hands-Free Voice Commands</h2>
            <p className="text-base text-stone-400">
              Tap a phrase to simulate an Alexa command. The kitchen reacts instantly.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-3">
          {commands.map((c) => (
            <button
              key={c}
              onClick={() => onCommand(c)}
              className="tv-focusable flex items-center gap-3 rounded-2xl border border-stone-700 bg-stone-800/80 px-4 py-4 text-left text-base font-semibold text-stone-100 transition hover:border-amber-400/60 hover:bg-amber-400/10 hover:text-amber-200"
            >
              <Volume2 size={20} className="text-amber-300" />
              {c}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-stone-300">Command Log</h3>
            <button
              onClick={onClear}
              className="tv-focusable rounded-xl border border-stone-700 px-4 py-2 text-sm text-stone-400 hover:text-stone-200"
            >
              Clear
            </button>
          </div>
          <div className="h-40 overflow-y-auto rounded-2xl border border-stone-800 bg-stone-950 p-4 font-mono text-sm text-stone-400">
            {log.length === 0 ? (
              <div className="text-stone-600">No commands yet. Tap one above to begin.</div>
            ) : (
              log.map((line, i) => <div key={i}>{line}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
