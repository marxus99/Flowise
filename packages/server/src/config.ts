// cleaned up stray characters at top of file
import dotenv from 'dotenv'
dotenv.config()

export const ALLOWED_ORIGINS = (
    process.env.CORS_ORIGINS || 'https://flowise-ui-deploy.vercel.app,https://flowise-ai-cqlx.onrender.com,http://localhost:3000'
)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

export const isDev = process.env.NODE_ENV !== 'production'
