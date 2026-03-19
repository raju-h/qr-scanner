"use client";

/**
 * React error boundary — catches render errors in children and shows a
 * recovery UI instead of a white screen. Works as both a generic boundary
 * and a scanner-specific boundary depending on props.
 */

import { Component } from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Custom heading shown when an error is caught. */
  heading?: string;
  /** Custom message shown below the heading. */
  message?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const heading = this.props.heading ?? "Something went wrong";
    const message = this.props.message ?? "An unexpected error occurred. Please try again.";

    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
        <div className="rounded-2xl bg-gray-900/80 p-8 backdrop-blur-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white">{heading}</h2>
          <p className="mt-2 text-sm text-gray-400">{message}</p>
          <button
            onClick={this.handleRetry}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
}
