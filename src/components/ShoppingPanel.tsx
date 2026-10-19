import { Check, ShoppingBasket, Trash2 } from 'lucide-react';
import type { ShoppingItem } from '@/lib/supabase';

export function ShoppingPanel({
  items,
  loading,
  onToggle,
  onRemove,
}: {
  items: ShoppingItem[];
  loading: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const pending = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  return (
    <section>
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-stone-900">
          <ShoppingBasket size={32} />
        </div>
        <div>
          <h1 className="text-5xl font-bold tracking-tight">Shopping List</h1>
          <p className="mt-2 text-xl text-stone-400">
            Items you've added from the kitchen. Check them off as you shop.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-16 text-2xl text-stone-400">Loading your list…</div>
      ) : items.length === 0 ? (
        <div className="mt-16 rounded-3xl border border-dashed border-stone-700 bg-stone-900 p-16 text-center">
          <div className="text-3xl font-semibold text-stone-300">Your list is empty</div>
          <p className="mt-3 text-xl text-stone-500">
            While cooking, say "Add to Shopping List" or use a recipe's quick action to
            stock up here.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-10">
          <ListBlock
            title="Need to Buy"
            count={pending.length}
            items={pending}
            onToggle={onToggle}
            onRemove={onRemove}
            accent
          />
          <ListBlock
            title="In the Cart"
            count={done.length}
            items={done}
            onToggle={onToggle}
            onRemove={onRemove}
          />
        </div>
      )}
    </section>
  );
}

function ListBlock({
  title,
  count,
  items,
  onToggle,
  onRemove,
  accent,
}: {
  title: string;
  count: number;
  items: ShoppingItem[];
  onToggle: (id: string, checked: boolean) => void;
  onRemove: (id: string) => void;
  accent?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
      <div className="flex items-center justify-between px-2">
        <h2
          className={`text-2xl font-bold ${
            accent ? 'text-amber-300' : 'text-stone-300'
          }`}
        >
          {title}
        </h2>
        <span className="rounded-full bg-stone-800 px-4 py-1 text-lg font-semibold text-stone-200">
          {count}
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {items.length === 0 && (
          <li className="rounded-2xl border border-dashed border-stone-800 p-6 text-lg text-stone-500">
            Nothing here yet.
          </li>
        )}
        {items.map((i) => (
          <li
            key={i.id}
            className="flex items-center justify-between rounded-2xl border border-stone-800 bg-stone-950/60 px-5 py-4"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => onToggle(i.id, !i.checked)}
                className={`grid h-10 w-10 place-items-center rounded-lg border ${
                  i.checked
                    ? 'border-emerald-500 bg-emerald-500 text-stone-900'
                    : 'border-stone-700 text-transparent hover:border-amber-400'
                }`}
              >
                <Check size={22} />
              </button>
              <div>
                <div
                  className={`text-2xl font-semibold ${
                    i.checked ? 'text-stone-400 line-through' : 'text-stone-50'
                  }`}
                >
                  {i.item}
                </div>
                {i.quantity && (
                  <div className="text-lg text-amber-300">{i.quantity}</div>
                )}
              </div>
            </div>
            <button
              onClick={() => onRemove(i.id)}
              className="grid h-10 w-10 place-items-center rounded-lg text-stone-500 hover:bg-stone-800 hover:text-red-300"
              aria-label="Remove item"
            >
              <Trash2 size={22} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
