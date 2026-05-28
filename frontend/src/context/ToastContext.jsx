import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

let id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((toastId) => {
    setToasts((t) => t.filter((x) => x.id !== toastId));
  }, []);

  const toast = useCallback((message, type = 'success') => {
    const toastId = ++id;
    setToasts((t) => [...t, { id: toastId, message, type }]);
    setTimeout(() => dismiss(toastId), 3800);
  }, [dismiss]);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 left-4 right-4 z-[9999] flex flex-col gap-2 md:left-auto md:right-6 md:max-w-sm"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-md border-l-4 px-4 py-3 text-sm font-medium shadow-card ${
              t.type === 'error'
                ? 'border-red-400 bg-red-950/80 text-red-300'
                : t.type === 'info'
                  ? 'border-blue-400 bg-blue-950/80 text-blue-300'
                  : 'border-green-500 bg-green-950/80 text-green-400'
            }`}
          >
            <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✗' : 'ℹ'}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
