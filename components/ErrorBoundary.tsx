import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('=== REACT ERROR BOUNDARY CAUGHT ERROR ===');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Stack:', error.stack);
    
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
          <div className="max-w-4xl mx-auto bg-red-900/50 border border-red-700 rounded-lg p-6">
            <h1 className="text-3xl font-bold mb-4 text-red-200">Application Error</h1>
            <p className="text-red-100 mb-4">
              The application encountered an unexpected error. Please check the browser console for details.
            </p>
            
            {this.state.error && (
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2 text-red-200">Error Message:</h2>
                <pre className="bg-gray-900 p-4 rounded text-sm text-red-100 overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}
            
            {this.state.errorInfo && (
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2 text-red-200">Component Stack:</h2>
                <pre className="bg-gray-900 p-4 rounded text-xs text-gray-300 overflow-auto max-h-64">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
            
            {this.state.error?.stack && (
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2 text-red-200">Stack Trace:</h2>
                <pre className="bg-gray-900 p-4 rounded text-xs text-gray-300 overflow-auto max-h-64">
                  {this.state.error.stack}
                </pre>
              </div>
            )}
            
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.reload();
              }}
              className="mt-4 bg-brand-blue hover:bg-brand-purple text-white font-bold py-2 px-4 rounded"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

