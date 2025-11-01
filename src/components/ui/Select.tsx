import React from 'react';
import './Select.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, placeholder, className = '', id, ...props }, ref) => {
    // Generate selectId only if id is not provided and label is a string
    const selectId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="select-wrapper">
        {label && (
          <label htmlFor={selectId} className="select-label">
            {label}
            {props.required && <span className="select-required">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`select ${error ? 'select-error' : ''} ${className}`.trim()}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {error && <span className="select-error-text">{error}</span>}
        {helperText && !error && <span className="select-helper-text">{helperText}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';

