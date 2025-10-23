import { create } from 'zustand';
import type { Toast, ToastType } from '../components/Toast';

interface ToastStore {
    toasts: Toast[];
    addToast: (type: ToastType, message: string, description?: string, duration?: number) => void;
    removeToast: (id: string) => void;
    clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],

    addToast: (type, message, description, duration) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const toast: Toast = {
            id,
            type,
            message,
            description,
            duration: duration ?? 5000,
        };

        set((state) => ({
            toasts: [...state.toasts, toast],
        }));
    },

    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        }));
    },

    clearToasts: () => {
        set({ toasts: [] });
    },
}));

// Convenience methods for easier usage
export const toast = {
    success: (message: string, description?: string, duration?: number) => {
        useToastStore.getState().addToast('success', message, description, duration);
    },
    error: (message: string, description?: string, duration?: number) => {
        useToastStore.getState().addToast('error', message, description, duration);
    },
    warning: (message: string, description?: string, duration?: number) => {
        useToastStore.getState().addToast('warning', message, description, duration);
    },
    warn: (message: string, description?: string, duration?: number) => {
        useToastStore.getState().addToast('warning', message, description, duration);
    },
    info: (message: string, description?: string, duration?: number) => {
        useToastStore.getState().addToast('info', message, description, duration);
    },
};

