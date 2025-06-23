import { Request, Response, NextFunction, RequestHandler } from 'express'
import { ALLOWED_ORIGINS } from '../config'

const corsMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin as string | undefined
    const userAgent = req.get('User-Agent') || ''

    // Always allow health check requests from monitoring services (like Render's health checks)
    if (req.path === '/health' || req.path === '/ready' || req.path === '/') {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    }
    // Handle requests with origin header
    else if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Vary', 'Origin')
        res.setHeader('Access-Control-Allow-Credentials', 'true')
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
    }
    // Handle requests without origin (server-to-server, curl, monitoring tools)
    else if (!origin && (userAgent.includes('Go-http-client') || userAgent.includes('curl') || userAgent.includes('monitoring'))) {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Max-Age', '86400') // Cache for 24 hours
        return res.status(204).end()
    }

    next()
}

export default corsMiddleware
