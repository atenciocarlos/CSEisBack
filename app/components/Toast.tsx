"use client";

import { useState, useCallback, useEffect } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    message: string;
    variant: ToastVariant;
}

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, variant: ToastVariant = "info") => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setToasts(prev => [...prev, { id, message, variant }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3500);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, addToast, removeToast };
}

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: string; iconColor: string; text: string }> = {
    success: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "check_circle", iconColor: "text-emerald-500", text: "text-emerald-800" },
    error: { bg: "bg-red-50", border: "border-red-200", icon: "error", iconColor: "text-red-500", text: "text-red-800" },
    warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "warning", iconColor: "text-amber-500", text: "text-amber-800" },
    info: { bg: "bg-blue-50", border: "border-blue-200", icon: "info", iconColor: "text-blue-500", text: "text-blue-800" },
};

export function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-96 z-100 flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setIsVisible(true));
        const timer = setTimeout(() => setIsVisible(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!isVisible) {
            const timer = setTimeout(onDismiss, 300);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onDismiss]);

    const s = VARIANT_STYLES[toast.variant];

    return (
        <div
            className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-300 ${s.bg} ${s.border} ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
            role="alert"
        >
            <span className={`material-icons-outlined text-lg shrink-0 mt-0.5 ${s.iconColor}`}>{s.icon}</span>
            <p className={`text-sm font-medium m-0 flex-1 ${s.text}`}>{toast.message}</p>
            <button
                onClick={onDismiss}
                className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none cursor-pointer p-0"
            >
                <span className="material-icons-outlined text-base">close</span>
            </button>
        </div>
    );
}
