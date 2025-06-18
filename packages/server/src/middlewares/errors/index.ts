import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

// we need eslint because we have to pass next arg for the error middleware
// eslint-disable-next-line
async function errorHandlerMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
    const statusCode = err.statusCode || err.status || StatusCodes.INTERNAL_SERVER_ERROR
    let message = err.message || err.toString()
    if (message.includes('401 Incorrect API key provided'))
        message = '401 Invalid model key or Incorrect local model configuration.'
    const displayedError = {
        statusCode,
        success: false,
        message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : {}
    }

    if (!req.body || !req.body.streaming || req.body.streaming === 'false') {
        res.setHeader('Content-Type', 'application/json')
        res.status(statusCode).json(displayedError)
    }
}

export default errorHandlerMiddleware
