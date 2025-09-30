import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  type?: ToastType;
  duration?: number; // milliseconds
}

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
  duration: number;
}

interface ToastContextValue {
  show: (message: string, options?: ToastOptions) => string;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 2500;

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<string, number>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timersRef.current[id];
    if (t) {
      window.clearTimeout(t as number);
      delete timersRef.current[id];
    }
  }, []);

  const scheduleAutoDismiss = useCallback((toast: ToastItem) => {
    const timeout = window.setTimeout(() => {
      dismiss(toast.id);
    }, toast.duration);
    timersRef.current[toast.id] = timeout;
  }, [dismiss]);

  const show = useCallback<ToastContextValue['show']>((message, options) => {
    const id = genId();
    const type: ToastType = options?.type ?? 'info';
    const duration = Math.max(1200, options?.duration ?? DEFAULT_DURATION);
    const item: ToastItem = {
      id,
      message,
      type,
      createdAt: Date.now(),
      duration,
    };
    setToasts((prev) => {
      // Batasi maksimal 5 toast tampil
      const next = [...prev, item].slice(-5);
      return next;
    });
    scheduleAutoDismiss(item);
    return id;
  }, [scheduleAutoDismiss]);

  const success = useCallback<ToastContextValue['success']>((message, duration) => show(message, { type: 'success', duration }), [show]);
  const error = useCallback<ToastContextValue['error']>((message, duration) => show(message, { type: 'error', duration }), [show]);
  const info = useCallback<ToastContextValue['info']>((message, duration) => show(message, { type: 'info', duration }), [show]);

  useEffect(() => {
    return () => {
      // cleanup semua timer saat unmount
      Object.values(timersRef.current).forEach((t) => window.clearTimeout(t as number));
      timersRef.current = {};
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ show, success, error, info, dismiss }), [show, success, error, info, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Container Toast - pojok kanan atas */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-[92vw] max-w-sm">
        {toasts.map((t) => {
          const colorByType =
            t.type === 'success'
              ? 'bg-emerald-600'
              : t.type === 'error'
                ? 'bg-rose-600'
                : 'bg-slate-700';
          const borderByType =
            t.type === 'success'
              ? 'border-emerald-700'
              : t.type === 'error'
                ? 'border-rose-700'
                : 'border-slate-600';
          const iconPath =
            t.type === 'success'
              ? 'M5 13l4 4L19 7' // check
              : t.type === 'error'
                ? 'M6 18L18 6M6 6l12 12' // x
                : 'M12 8v4m0 4h.01'; // info

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 text-white ${colorByType} border ${borderByType} shadow-lg rounded-lg p-3 animate-in fade-in slide-in-from-top-2`}
              role="status"
              aria-live="polite"
            >
              <div className="shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                </svg>
              </div>
              <div className="text-sm leading-snug flex-1">{t.message}</div>
              <button
                onClick={() => dismiss(t.id)}
                className="opacity-80 hover:opacity-100 transition"
                aria-label="Tutup notifikasi"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast harus digunakan di dalam ToastProvider');
  }
  return ctx;
};