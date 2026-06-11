import { Component, ErrorInfo, ReactNode } from "react";
import { BLUE } from "../lib/constants";

interface Props {
  children: ReactNode;
  // Опциональный fallback — если не передан, используется дефолтный
  fallback?: ReactNode;
  // Метка для логов — чтобы знать какой именно компонент упал
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const label = this.props.name ?? "Unknown";
    console.error(`[ErrorBoundary:${label}] Uncaught render error:`, error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Что-то пошло не так
            </h2>
            <p className="text-gray-500 mb-5">Пожалуйста, обновите страницу</p>
            <button
              onClick={this.handleRetry}
              className="px-5 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: BLUE }}
            >
              Попробовать снова
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
