import React from 'react';
import './Checkbox.css';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  helperText?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, helperText, className = '', id, ...props }, ref) => {
    // Generate checkboxId only if id is not provided and label is a string
    const checkboxId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="checkbox-wrapper">
        <div className="checkbox-container">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={`checkbox ${className}`.trim()}
            {...props}
          />
          {label && (
            <label htmlFor={checkboxId} className="checkbox-label">
              {label}
            </label>
          )}
        </div>
        {helperText && <span className="checkbox-helper-text">{helperText}</span>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

