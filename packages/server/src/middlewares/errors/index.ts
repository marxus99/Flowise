import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

// we need eslint because we have to pass next arg for the error middleware
// eslint-disable-next-line
async function errorHandlerMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
    const statusCode = err.statusCode || err.status || StatusCodes.INTERNAL_SERVER_ERROR
    let message = err.message || err.toString()
    if (message.includes('401 Incorrect API key provided')) message = '401 Invalid model key or Incorrect local model configuration.'

    // Enhanced error logging for production debugging
    console.error(`🚨 [Error Handler] ${statusCode}: ${message}`, {
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        clientIP: req.ip,
        headers: req.headers,
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === 'development' ? err.stack : err.stack?.split('\n')[0]
    })

    const displayedError = {
        statusCode,
        success: false,
        message,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        stack: process.env.NODE_ENV === 'development' ? err.stack : {}
    }

    // Ensure we always respond with JSON
    res.setHeader('Content-Type', 'application/json')

    if (!req.body || !req.body.streaming || req.body.streaming === 'false') {
        res.status(statusCode).json(displayedError)
    } else {
        // For streaming requests, we need to handle differently
        res.status(statusCode).end(JSON.stringify(displayedError))
    }
}

export default errorHandlerMiddleware
