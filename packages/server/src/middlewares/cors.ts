import { Request, Response, NextFunction } from 'express'
import { ALLOWED_ORIGINS } from '../config'

export default function corsMiddleware(req: Request, res: Response, next: NextFunction) {
    const origin = req.headers.origin as string | undefined
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Vary', 'Origin')
        res.setHeader('Access-Control-Allow-Credentials', 'true')
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    }

    if (req.method === 'OPTIONS') {
        res.setHeader('Content-Type', 'application/json')
        return res.status(204).end()
    }

    next()
}
