import { memo } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

interface ModalProps {
    onClose: () => void;
    children: React.ReactNode;
}

export const Modal = memo(function Modal({ onClose, children }: ModalProps) {
    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>,
        document.body
    );
});


