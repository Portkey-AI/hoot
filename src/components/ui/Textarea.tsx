import React from 'react';
import './Textarea.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: React.ReactNode;
    error?: string;
    helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, error, helperText, className = '', id, ...props }, ref) => {
        // Generate textareaId only if id is not provided and label is a string
        const textareaId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

        return (
            <div className="textarea-wrapper">
                {label && (
                    <label htmlFor={textareaId} className="textarea-label">
                        {label}
                        {props.required && <span className="textarea-required">*</span>}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    className={`textarea ${error ? 'textarea-error' : ''} ${className}`.trim()}
                    {...props}
                />
                {error && <span className="textarea-error-text">{error}</span>}
                {helperText && !error && <span className="textarea-helper-text">{helperText}</span>}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';

