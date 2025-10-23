import { memo } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    danger?: boolean;
}

export const ConfirmDialog = memo(function ConfirmDialog({
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    danger = false,
}: ConfirmDialogProps) {
    return createPortal(
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal modal-small" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                </div>

                <div className="modal-body">
                    <p style={{ lineHeight: 1.6 }}>{message}</p>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button
                        className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
});


