import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface ToastProps {
  id?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "destructive" | "success";
  duration?: number;
}

interface ToastContextType {
  toast: (props: ToastProps) => string;
  removeToast: (id: string) => void;
  toasts: ToastProps[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const toast = useCallback(
    ({ id, title, description, action, variant = "default", duration = 5000 }: ToastProps) => {
      const key = id ?? Math.random().toString(36).slice(2, 9);
      setToasts((prevToasts) => [...prevToasts, { id: key, title, description, action, variant, duration }]);
      
      // Samo ako je postavljen konačan timeout, onda automatski ukloni toast
      if (duration !== Infinity && duration > 0) {
        setTimeout(() => {
          setToasts((prevToasts) => prevToasts.filter((t) => t.id !== key));
        }, duration);
      }
      
      // Vraćamo ID toasta tako da ga komponenta može kasnije ukloniti
      return key;
    },
    []
  );
  
  // Dodajemo funkciju za ručno uklanjanje toasta
  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, removeToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};