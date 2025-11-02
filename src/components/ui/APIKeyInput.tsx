import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './APIKeyInput.css';

export interface APIKeyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: React.ReactNode;
    error?: string;
    helperText?: string;
    showToggle?: boolean;
}

export const APIKeyInput = React.forwardRef<HTMLInputElement, APIKeyInputProps>(
    ({ label, error, helperText, showToggle = true, className = '', id, ...props }, ref) => {
        const [showKey, setShowKey] = useState(false);
        
        // Generate inputId only if id is not provided and label is a string
        const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

        return (
            <div className="api-key-input-wrapper">
                {label && (
                    <label htmlFor={inputId} className="api-key-input-label">
                        {label}
                        {props.required && <span className="api-key-input-required">*</span>}
                    </label>
                )}
                <div className="api-key-input-container">
                    <input
                        ref={ref}
                        id={inputId}
                        type={showKey ? 'text' : 'password'}
                        className={`api-key-input ${error ? 'api-key-input-error' : ''} ${className}`.trim()}
                        autoComplete="off"
                        {...props}
                    />
                    {showToggle && (
                        <button
                            type="button"
                            className="api-key-toggle-button"
                            onClick={() => setShowKey(!showKey)}
                            aria-label={showKey ? 'Hide API key' : 'Show API key'}
                            tabIndex={-1}
                        >
                            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    )}
                </div>
                {error && <span className="api-key-input-error-text">{error}</span>}
                {helperText && !error && <span className="api-key-input-helper-text">{helperText}</span>}
            </div>
        );
    }
);

APIKeyInput.displayName = 'APIKeyInput';

