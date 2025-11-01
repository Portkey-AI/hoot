import React from 'react';
import './Radio.css';

export interface RadioOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface RadioGroupProps {
    name: string;
    label?: string;
    options: RadioOption[];
    value?: string;
    onChange?: (value: string) => void;
    error?: string;
    helperText?: string;
    disabled?: boolean;
    className?: string;
    orientation?: 'vertical' | 'horizontal';
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
    name,
    label,
    options,
    value,
    onChange,
    error,
    helperText,
    disabled = false,
    className = '',
    orientation = 'vertical',
}) => {
    return (
        <div className={`radio-group-wrapper ${className}`.trim()}>
            {label && <div className="radio-group-label">{label}</div>}
            <div className={`radio-group-options ${orientation === 'horizontal' ? 'radio-group-horizontal' : ''}`}>
                {options.map((option) => (
                    <label
                        key={option.value}
                        className={`radio-option ${option.disabled || disabled ? 'radio-option-disabled' : ''}`}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={value === option.value}
                            onChange={(e) => onChange?.(e.target.value)}
                            disabled={option.disabled || disabled}
                            className="radio-input"
                        />
                        <span className="radio-label">{option.label}</span>
                    </label>
                ))}
            </div>
            {error && <span className="radio-error-text">{error}</span>}
            {helperText && !error && <span className="radio-helper-text">{helperText}</span>}
        </div>
    );
};

RadioGroup.displayName = 'RadioGroup';

