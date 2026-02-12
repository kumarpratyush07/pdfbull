import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-50 text-red-900 border border-red-200 rounded m-4">
                    <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
                    <pre className="whitespace-pre-wrap text-sm">{this.state.error?.message}</pre>
                    <pre className="whitespace-pre-wrap text-xs mt-2 text-red-700">{this.state.error?.stack}</pre>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
