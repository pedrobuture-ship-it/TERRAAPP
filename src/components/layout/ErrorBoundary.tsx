import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full rounded-2xl bg-white p-8 text-center shadow-sm border border-slate-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-6">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Ops, algo deu errado</h1>
            <p className="text-slate-600 mb-8">
              Encontramos um erro inesperado no aplicativo. Por favor, recarregue a página para continuar.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-field-600 px-6 font-semibold text-white transition hover:bg-field-700 focus:outline-none focus:ring-2 focus:ring-field-600 focus:ring-offset-2"
            >
              <RefreshCw size={18} />
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}