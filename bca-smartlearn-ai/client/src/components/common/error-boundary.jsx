import { Component } from 'react';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';

/** Catches render errors so one broken page never blanks the whole app. */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surfaced in the browser console for debugging; no PII is transmitted.
    console.error('UI error boundary caught:', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-6">
        <EmptyState
          preset="error"
          className="w-full border-solid"
          title="This page hit a snag"
          description={error.message || 'An unexpected error occurred while rendering this view.'}
          action={
            <div className="mt-2 flex gap-2">
              <Button onClick={() => this.setState({ error: null })}>Try again</Button>
              <Button variant="outline" onClick={() => window.location.assign('/')}>
                Reload app
              </Button>
            </div>
          }
        />
      </div>
    );
  }
}

export default ErrorBoundary;
