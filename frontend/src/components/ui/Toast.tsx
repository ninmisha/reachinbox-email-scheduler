import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  text: string;
}
const Ctx = createContext<(kind: ToastItem['kind'], text: string) => void>(() => undefined);
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((kind: ToastItem['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, kind, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4500);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              t.kind === 'success' ? 'bg-accent text-white' : 'bg-danger text-white'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
