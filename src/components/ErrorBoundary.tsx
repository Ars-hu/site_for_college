import { Component, ErrorInfo, ReactNode } from "react";
import { BLUE } from "../lib/constants";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Что-то пошло не так
            </h2>
            <p className="text-gray-500 mb-5">Пожалуйста, обновите страницу</p>
            <button
              onClick={() => this.setState({ hasError: false })}
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
