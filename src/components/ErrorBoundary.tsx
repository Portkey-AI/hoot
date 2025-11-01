import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui';
import './ErrorBoundary.css';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('🚨 Error Boundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="error-boundary">
                    <div className="error-boundary-content">
                        <div className="error-icon">
                            <AlertTriangle size={48} />
                        </div>
                        <h2 className="error-title">Something went wrong</h2>
                        <p className="error-message">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        {import.meta.env.DEV && this.state.errorInfo && (
                            <details className="error-details">
                                <summary>Error Details (Dev Mode)</summary>
                                <pre className="error-stack">
                                    {this.state.error?.stack}
                                    {'\n\n'}
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                        <Button variant="primary" onClick={this.handleReset}>
                            <RefreshCw size={16} />
                            <span>Try Again</span>
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

