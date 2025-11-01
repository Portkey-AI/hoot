import React from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: React.ReactNode;
    error?: string;
    helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, className = '', id, ...props }, ref) => {
        // Generate inputId only if id is not provided and label is a string
        const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

        return (
            <div className="input-wrapper">
                {label && (
                    <label htmlFor={inputId} className="input-label">
                        {label}
                        {props.required && <span className="input-required">*</span>}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={`input ${error ? 'input-error' : ''} ${className}`.trim()}
                    {...props}
                />
                {error && <span className="input-error-text">{error}</span>}
                {helperText && !error && <span className="input-helper-text">{helperText}</span>}
            </div>
        );
    }
);

Input.displayName = 'Input';

