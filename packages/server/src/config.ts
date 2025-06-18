export const ALLOWED_ORIGINS = (
    // include your new Vercel preview URL here:
    process.env.CORS_ORIGINS ||
        'https://flowise-772e48kex-marcus-thomas-projects-90ba4767.vercel.app,' +
        'https://flowise-ui-liart.vercel.app,' +
        'http://localhost:3000'
)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

export const isDev = process.env.NODE_ENV !== 'production'
