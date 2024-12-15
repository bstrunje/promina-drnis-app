import * as React from "react"

interface ToastProps {
    id?: string;
    title?: string;
    description?: string;
    action?: React.ReactNode;
    variant?: "default" | "destructive" | "success";
    duration?: number;
}

const useToast = () => {
    const [toasts, setToasts] = React.useState<ToastProps[]>([]);

    const toast = React.useCallback(({ title, description, variant = "default", duration = 5000 }: ToastProps) => {
        const id = Math.random().toString(36).slice(2, 9);
        setToasts((prevToasts) => [...prevToasts, { id, title, description, variant, duration }]);

        setTimeout(() => {
            setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
        }, duration);
    }, []);

    return { toast, toasts, setToasts };
};

export { useToast, type ToastProps };