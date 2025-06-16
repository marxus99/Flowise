export const ALLOWED_ORIGINS = (
    process.env.CORS_ORIGINS ||
    'https://flowise-ui-liart.vercel.app,https://flowise-m6oiaisko-marcus-thomas-projects-90ba4767.vercel.app'
)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

export const isDev = process.env.NODE_ENV !== 'production'
