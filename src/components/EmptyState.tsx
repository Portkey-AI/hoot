import { memo } from 'react';
import { Server, Wrench, Clock, AlertCircle } from 'lucide-react';
import './EmptyState.css';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export const EmptyState = memo(function EmptyState({
    icon,
    title,
    description,
    action,
}: EmptyStateProps) {
    return (
        <div className="empty-state">
            {icon && <div className="empty-state-icon">{icon}</div>}
            <h3 className="empty-state-title">{title}</h3>
            <p className="empty-state-description">{description}</p>
            {action && (
                <button className="btn btn-primary" onClick={action.onClick}>
                    {action.label}
                </button>
            )}
        </div>
    );
});

// Pre-built empty states for common use cases
export const NoServersState = memo(function NoServersState({
    onAddServer,
}: {
    onAddServer: () => void;
}) {
    return (
        <EmptyState
            icon={<Server size={48} />}
            title="No servers yet"
            description="Add your first MCP server to get started testing tools and capabilities."
            action={{
                label: 'Add Server',
                onClick: onAddServer,
            }}
        />
    );
});

export const NoToolsState = memo(function NoToolsState() {
    return (
        <EmptyState
            icon={<Wrench size={48} />}
            title="No tools available"
            description="This server doesn't expose any tools, or hasn't been connected yet."
        />
    );
});

export const NoHistoryState = memo(function NoHistoryState() {
    return (
        <EmptyState
            icon={<Clock size={48} />}
            title="No execution history"
            description="Tool execution history will appear here once you start testing."
        />
    );
});

export const ServerErrorState = memo(function ServerErrorState({
    error,
    onRetry,
}: {
    error: string;
    onRetry?: () => void;
}) {
    return (
        <EmptyState
            icon={<AlertCircle size={48} />}
            title="Connection failed"
            description={error}
            action={
                onRetry
                    ? {
                        label: 'Retry Connection',
                        onClick: onRetry,
                    }
                    : undefined
            }
        />
    );
});

