import React from 'react';
import './Spinner.css';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'white';
}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', variant = 'primary', className = '', ...props }, ref) => {
    const sizeClass = `spinner-${size}`;
    const variantClass = `spinner-${variant}`;
    
    return (
      <div
        ref={ref}
        className={`spinner ${sizeClass} ${variantClass} ${className}`.trim()}
        role="status"
        aria-label="Loading"
        {...props}
      >
        <span className="spinner-sr-only">Loading...</span>
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';

