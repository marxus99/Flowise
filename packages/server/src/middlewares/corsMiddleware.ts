import { Request, Response, NextFunction } from 'express'

const ALLOWED_ORIGIN = 'https://flowise-ui-liart.vercel.app'

export default function corsMiddleware(req: Request, res: Response, next: NextFunction) {
    const origin = req.headers.origin
    if (origin === ALLOWED_ORIGIN) {
        res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    if (req.method === 'OPTIONS') {
        return res.status(204).end()
    }

    res.type('application/json')
    next()
}
