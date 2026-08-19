import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 text-center shadow-xl ring-1 ring-line">
            <h1 className="font-display text-xl font-bold">Noe gikk galt</h1>
            <p className="mt-2 text-sm text-muted">
              Det oppstod en uventet feil. Endringene dine er lagret lokalt – last inn siden på nytt.
            </p>
            <button onClick={() => window.location.reload()} className="btn-primary mt-4">
              Last inn på nytt
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}