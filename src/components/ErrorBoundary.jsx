import { Component } from 'react';

// Last line of defence: an unexpected rendering error shows a recovery screen instead of a blank page.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('CampusFlow rendering error:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="placeholder" role="alert">
        <h1>Something went wrong</h1>
        <p>CampusFlow hit an unexpected problem. Reloading the page usually fixes it.</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.assign('/')}>Back to home</button>
      </main>
    );
  }
}
