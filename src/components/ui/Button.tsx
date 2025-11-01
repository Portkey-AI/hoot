import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', className = '', type = 'button', children, ...props }, ref) => {
        const variantClass = `btn-${variant}`;
        const sizeClass = `btn-${size}`;

        return (
            <button
                ref={ref}
                type={type}
                className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

