import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

type SaveFn = () => Promise<void>;
type DiscardFn = () => void;

interface SettingsDirtyContextValue {
  dirty: boolean;
  setDirty: (d: boolean) => void;
  registerHandlers: (save: SaveFn, discard: DiscardFn) => void;
  runSave: () => Promise<boolean>;
  runDiscard: () => void;
}

const SettingsDirtyContext = createContext<SettingsDirtyContextValue | null>(null);

export function SettingsDirtyProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false);
  const handlersRef = useRef<{ save: SaveFn; discard: DiscardFn } | null>(null);

  const registerHandlers = useCallback((save: SaveFn, discard: DiscardFn) => {
    handlersRef.current = { save, discard };
  }, []);

  const runSave = useCallback(async (): Promise<boolean> => {
    const h = handlersRef.current;
    if (!h?.save) return true;
    try {
      await h.save();
      setDirty(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  const runDiscard = useCallback(() => {
    const h = handlersRef.current;
    if (h?.discard) h.discard();
    setDirty(false);
  }, []);

  const value: SettingsDirtyContextValue = {
    dirty,
    setDirty,
    registerHandlers,
    runSave,
    runDiscard,
  };

  return (
    <SettingsDirtyContext.Provider value={value}>
      {children}
    </SettingsDirtyContext.Provider>
  );
}

export function useSettingsDirty() {
  const ctx = useContext(SettingsDirtyContext);
  return ctx;
}
