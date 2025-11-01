import React from 'react';
import './Badge.css';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline';
    size?: 'sm' | 'md';
    children: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    ({ variant = 'default', size = 'md', className = '', children, ...props }, ref) => {
        const variantClass = `badge-${variant}`;
        const sizeClass = `badge-${size}`;

        return (
            <span
                ref={ref}
                className={`badge ${variantClass} ${sizeClass} ${className}`.trim()}
                {...props}
            >
                {children}
            </span>
        );
    }
);

Badge.displayName = 'Badge';

