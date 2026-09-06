import { Component } from 'react'
import ErrorPage from './ErrorPage.jsx'

export default class ErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return <ErrorPage />
    }
    return this.props.children
  }
}
