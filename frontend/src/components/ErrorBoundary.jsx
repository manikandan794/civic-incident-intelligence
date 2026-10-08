import React from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[UrbanGrid ErrorBoundary] Caught render error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-[#070D18]">
          <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400 mb-6 shadow-xl shadow-red-950/20">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-slate-400 max-w-md mb-8">
            The portal could not be loaded. A temporary display issue occurred while rendering this civic interface.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center space-x-2 transition-colors shadow-lg shadow-sky-600/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
            <a
              href="/"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700/80 flex items-center space-x-2 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Return to Portals</span>
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
