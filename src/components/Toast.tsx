import { memo, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    description?: string;
    duration?: number;
}

interface ToastProps {
    toast: Toast;
    onDismiss: (id: string) => void;
}

export const ToastItem = memo(function ToastItem({ toast, onDismiss }: ToastProps) {
    useEffect(() => {
        const duration = toast.duration || 5000;

        if (duration > 0) {
            const timer = setTimeout(() => {
                onDismiss(toast.id);
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [toast, onDismiss]);

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return <CheckCircle size={20} />;
            case 'error':
                return <XCircle size={20} />;
            case 'warning':
                return <AlertCircle size={20} />;
            case 'info':
                return <Info size={20} />;
        }
    };

    return (
        <div className={`toast toast-${toast.type}`}>
            <div className="toast-icon">{getIcon()}</div>
            <div className="toast-content">
                <div className="toast-message">{toast.message}</div>
                {toast.description && <div className="toast-description">{toast.description}</div>}
            </div>
            <button
                className="toast-close"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss"
            >
                <X size={16} />
            </button>
        </div>
    );
});

interface ToastContainerProps {
    toasts: Toast[];
    onDismiss: (id: string) => void;
}

export const ToastContainer = memo(function ToastContainer({
    toasts,
    onDismiss,
}: ToastContainerProps) {
    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
});

