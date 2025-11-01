import { memo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

interface ModalProps {
    onClose: () => void;
    children: React.ReactNode;
}

export const Modal = memo(function Modal({ onClose, children }: ModalProps) {
    useEffect(() => {
        // Prevent body scroll when modal is open
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>,
        document.body
    );
});


