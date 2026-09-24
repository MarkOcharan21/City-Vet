import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error && error.message ? error.message : String(error) };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          background: '#f8fafc',
          color: '#241416',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'inherit',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>May nangyaring error sa page na ito</h2>
          <p style={{ margin: 0, maxWidth: 480, opacity: 0.75 }}>
            Hindi ito nakaapekto sa iyong data. I-reload mo lang ang pahina para magpatuloy.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, message: '' });
              window.location.reload();
            }}
            style={{
              padding: '0.65rem 1.5rem',
              background: '#0f3d2e',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            Reload
          </button>
          {this.state.message && (
            <pre style={{ fontSize: '0.75rem', opacity: 0.5, maxWidth: 520, whiteSpace: 'pre-wrap', margin: 0 }}>
              {this.state.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}