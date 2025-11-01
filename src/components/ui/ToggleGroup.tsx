import React from 'react';
import './ToggleGroup.css';

export interface ToggleOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface ToggleGroupProps {
    label?: string;
    options: ToggleOption[];
    value: string;
    onChange: (value: string) => void;
    helperText?: string;
    error?: string;
    disabled?: boolean;
    className?: string;
}

export const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
    ({ label, options, value, onChange, helperText, error, disabled = false, className = '' }, ref) => {
        return (
            <div ref={ref} className={`toggle-group-wrapper ${className}`}>
                {label && (
                    <label className="toggle-group-label">
                        {label}
                    </label>
                )}

                <div className="toggle-group" role="group">
                    {options.map((option) => {
                        const isSelected = value === option.value;
                        const isDisabled = disabled || option.disabled;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                className={`toggle-option ${isSelected ? 'toggle-option-selected' : ''}`}
                                onClick={() => !isDisabled && onChange(option.value)}
                                disabled={isDisabled}
                                aria-pressed={isSelected}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>

                {helperText && !error && (
                    <div className="toggle-group-helper">{helperText}</div>
                )}

                {error && (
                    <div className="toggle-group-error">{error}</div>
                )}
            </div>
        );
    }
);

ToggleGroup.displayName = 'ToggleGroup';
