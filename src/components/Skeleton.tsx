import { memo } from 'react';
import './Skeleton.css';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    variant?: 'text' | 'rectangular' | 'circular';
    className?: string;
}

export const Skeleton = memo(function Skeleton({
    width,
    height,
    variant = 'rectangular',
    className = '',
}: SkeletonProps) {
    const style = {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
    };

    return (
        <div className={`skeleton skeleton-${variant} ${className}`} style={style} />
    );
});

// Pre-built skeleton components for common use cases
export const ServerItemSkeleton = memo(function ServerItemSkeleton() {
    return (
        <div className="server-item-skeleton">
            <div className="skeleton-header">
                <Skeleton variant="circular" width={8} height={8} />
                <Skeleton width="60%" height={14} />
                <Skeleton width={24} height={18} />
            </div>
            <div className="skeleton-footer">
                <Skeleton width={60} height={16} />
                <Skeleton width={40} height={16} />
            </div>
        </div>
    );
});

export const ToolItemSkeleton = memo(function ToolItemSkeleton() {
    return (
        <div className="tool-item-skeleton">
            <Skeleton width="70%" height={16} />
            <Skeleton width="100%" height={12} />
        </div>
    );
});

export const ExecutionResultSkeleton = memo(function ExecutionResultSkeleton() {
    return (
        <div className="execution-result-skeleton">
            <div className="skeleton-status">
                <Skeleton variant="circular" width={24} height={24} />
                <Skeleton width={120} height={16} />
            </div>
            <Skeleton width="100%" height={200} />
        </div>
    );
});

