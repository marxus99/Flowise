// packages/ui/src/api.ts
export const API_ROOT = import.meta.env.VITE_API_BASE_URL || ''
if (!API_ROOT && import.meta.env.DEV) {
    console.warn('⚠️ VITE_API_BASE_URL not set, using relative URLs')
}

export function buildUrl(path: string) {
    const segment = typeof path === 'string' ? (path.startsWith('/') ? path.slice(1) : path) : ''
    return API_ROOT ? `${API_ROOT}/api/${segment}` : `/api/${segment}`
}
