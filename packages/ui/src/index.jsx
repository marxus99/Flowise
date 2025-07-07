import React, { Suspense } from 'react'
import App from '@/App'
import { store } from '@/store'
import { createRoot } from 'react-dom/client'
import PropTypes from 'prop-types'

// style + assets
import '@/assets/scss/style.scss'

// third party
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { SnackbarProvider } from 'notistack'
import ConfirmContextProvider from '@/store/context/ConfirmContextProvider'
import { ReactFlowContext } from '@/store/context/ReactFlowContext'
import { ConfigProvider } from '@/store/context/ConfigContext'
import { ErrorProvider } from '@/store/context/ErrorContext'

// Loading component for Suspense fallback
const LoadingFallback = () => (
    <div
        style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontSize: '18px',
            color: '#666'
        }}
    >
        Loading Flowise...
    </div>
)

// Error Boundary Component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(_error) {
        return { hasError: true }
    }

    componentDidCatch(_error, errorInfo) {
        console.error('App Error Boundary caught an error:', _error, errorInfo)
        this.setState({
            error: _error,
            errorInfo: errorInfo
        })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        padding: '20px',
                        textAlign: 'center',
                        height: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <h2>Something went wrong</h2>
                    <p>The application encountered an error and needs to be refreshed.</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '10px 20px',
                            fontSize: '16px',
                            backgroundColor: '#1976d2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginTop: '20px'
                        }}
                    >
                        Refresh Page
                    </button>
                    {process.env.NODE_ENV === 'development' && (
                        <details style={{ marginTop: '20px', textAlign: 'left' }}>
                            <summary>Error Details (Development)</summary>
                            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', maxWidth: '600px' }}>
                                {this.state.error && this.state.error.toString()}
                                <br />
                                {this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            )
        }

        return this.props.children
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.any
}

// Optimized Provider wrapper to prevent initialization issues
const AppProviders = ({ children }) => {
    return (
        <ErrorBoundary>
            <Provider store={store}>
                <BrowserRouter>
                    <SnackbarProvider
                        maxSnack={3}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'right'
                        }}
                    >
                        <ConfigProvider>
                            <ErrorProvider>
                                <ConfirmContextProvider>
                                    <ReactFlowContext>
                                        <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
                                    </ReactFlowContext>
                                </ConfirmContextProvider>
                            </ErrorProvider>
                        </ConfigProvider>
                    </SnackbarProvider>
                </BrowserRouter>
            </Provider>
        </ErrorBoundary>
    )
}

AppProviders.propTypes = {
    children: PropTypes.any
}

const container = document.getElementById('root')
const root = createRoot(container)

// Enhanced error handling for root rendering
try {
    root.render(
        <React.StrictMode>
            <AppProviders>
                <App />
            </AppProviders>
        </React.StrictMode>
    )
} catch (error) {
    console.error('Failed to render app:', error)
    // Fallback rendering without StrictMode if there are issues
    root.render(
        <AppProviders>
            <App />
        </AppProviders>
    )
}
