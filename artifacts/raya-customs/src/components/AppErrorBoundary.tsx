import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Keep an unexpected client-side error from becoming a blank application page. */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Raya application error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen grid place-items-center bg-navy-950 px-4 text-center">
        <section className="max-w-md rounded-xl border border-danger/40 bg-elevated p-8">
          <AlertTriangle className="mx-auto mb-4 text-danger" size={30} />
          <h1 className="mb-2 text-xl font-semibold text-white">Something went wrong</h1>
          <p className="mb-6 text-sm text-muted" dir="rtl">
            حدث خطأ غير متوقع. يمكنك إعادة تحميل الصفحة أو العودة إلى الصفحة الرئيسية.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              <RefreshCw size={16} /> Reload
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-strong px-4 py-2 text-sm font-medium text-slate-200 hover:text-white"
            >
              <Home size={16} /> Home
            </a>
          </div>
        </section>
      </main>
    );
  }
}