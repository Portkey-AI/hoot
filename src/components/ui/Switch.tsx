import React from 'react';
import './Switch.css';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  helperText?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, helperText, className = '', id, ...props }, ref) => {
    // Generate switchId only if id is not provided and label is a string
    const switchId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="switch-wrapper">
        <div className="switch-container">
          <input
            ref={ref}
            type="checkbox"
            id={switchId}
            className={`switch ${className}`.trim()}
            role="switch"
            {...props}
          />
          <label htmlFor={switchId} className="switch-slider"></label>
          {label && (
            <label htmlFor={switchId} className="switch-label">
              {label}
            </label>
          )}
        </div>
        {helperText && <span className="switch-helper-text">{helperText}</span>}
      </div>
    );
  }
);

Switch.displayName = 'Switch';

