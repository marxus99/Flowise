import React from 'react'
import PropTypes from 'prop-types'
import { Box, Button, Typography, Paper } from '@mui/material'
import { IconRefreshAlert, IconChevronLeft } from '@tabler/icons-react'

class CanvasErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: null
        }
    }

    static getDerivedStateFromError(_error) {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            errorId: Date.now()
        }
    }

    componentDidCatch(_error, errorInfo) {
        console.error('Canvas Error Boundary caught an error:', _error, errorInfo)

        // Log specific error details for canvas issues
        if (_error.message?.includes('Cannot access') && _error.message?.includes('before initialization')) {
            console.error('Detected module initialization error - likely circular dependency')
        }

        this.setState({
            error: _error,
            errorInfo
        })

        // Report to error tracking service if available
        if (window.gtag) {
            window.gtag('event', 'exception', {
                description: `Canvas Error: ${_error.message}`,
                fatal: false
            })
        }
    }

    handleResetError = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: null
        })
    }

    handleGoBack = () => {
        const { isAgentCanvas } = this.props
        const path = isAgentCanvas ? '/agentflows' : '/chatflows'
        window.location.href = path
    }

    handleRefreshPage = () => {
        window.location.reload()
    }

    render() {
        const { hasError, error, errorInfo } = this.state
        const { isAgentCanvas } = this.props

        if (hasError) {
            const canvasType = isAgentCanvas ? 'Agent Flow' : 'Chatflow'

            return (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        padding: 3,
                        backgroundColor: '#f5f5f5'
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            padding: 4,
                            maxWidth: 600,
                            textAlign: 'center',
                            borderRadius: 2
                        }}
                    >
                        <IconRefreshAlert size={64} color='#ff6b6b' style={{ marginBottom: 16 }} />

                        <Typography variant='h4' component='h1' gutterBottom color='error'>
                            {canvasType} Loading Error
                        </Typography>

                        <Typography variant='body1' paragraph color='textSecondary'>
                            The {canvasType.toLowerCase()} failed to load properly. This could be due to a temporary issue or a problem with
                            the workflow data.
                        </Typography>

                        <Typography variant='body2' paragraph color='textSecondary'>
                            Try refreshing the page or going back to the {canvasType.toLowerCase()} list.
                        </Typography>

                        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Button
                                variant='contained'
                                color='primary'
                                onClick={this.handleRefreshPage}
                                startIcon={<IconRefreshAlert />}
                                size='large'
                            >
                                Refresh Page
                            </Button>

                            <Button
                                variant='outlined'
                                color='primary'
                                onClick={this.handleGoBack}
                                startIcon={<IconChevronLeft />}
                                size='large'
                            >
                                Back to {canvasType}s
                            </Button>

                            <Button variant='text' color='secondary' onClick={this.handleResetError} size='large'>
                                Try Again
                            </Button>
                        </Box>

                        {/* Development error details */}
                        {process.env.NODE_ENV === 'development' && error && (
                            <Box sx={{ mt: 4, textAlign: 'left' }}>
                                <details>
                                    <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: 8 }}>
                                        Error Details (Development Mode)
                                    </summary>
                                    <Paper
                                        variant='outlined'
                                        sx={{
                                            padding: 2,
                                            backgroundColor: '#f8f8f8',
                                            borderRadius: 1,
                                            maxHeight: 200,
                                            overflow: 'auto'
                                        }}
                                    >
                                        <Typography variant='caption' component='pre' sx={{ whiteSpace: 'pre-wrap' }}>
                                            <strong>Error:</strong> {error.toString()}
                                            {errorInfo && (
                                                <>
                                                    <br />
                                                    <br />
                                                    <strong>Component Stack:</strong>
                                                    {errorInfo.componentStack}
                                                </>
                                            )}
                                        </Typography>
                                    </Paper>
                                </details>
                            </Box>
                        )}
                    </Paper>
                </Box>
            )
        }

        return this.props.children
    }
}

CanvasErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    isAgentCanvas: PropTypes.bool
}

CanvasErrorBoundary.defaultProps = {
    isAgentCanvas: false
}

// Higher-order component to wrap canvas routes with error boundary
export const withCanvasErrorBoundary = (Component, isAgentCanvas = false) => {
    const WrappedComponent = (props) => (
        <CanvasErrorBoundary isAgentCanvas={isAgentCanvas}>
            <Component {...props} />
        </CanvasErrorBoundary>
    )

    WrappedComponent.displayName = `withCanvasErrorBoundary(${Component.displayName || Component.name})`

    return WrappedComponent
}

export default CanvasErrorBoundary
