import React from 'react';

/**
 * ErrorBoundary - catches render errors in any child and shows a recovery UI
 * instead of a blank screen.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] Caught render error:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                    <div className="text-center p-4">
                        <i className="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                        <h4 className="text-danger">Something went wrong</h4>
                        <p className="text-muted">{this.state.error?.message || 'Unexpected error'}</p>
                        <button
                            className="btn btn-primary me-2"
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.history.back();
                            }}
                        >
                            Go Back
                        </button>
                        <button
                            className="btn btn-outline-secondary"
                            onClick={() => window.location.reload()}
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
