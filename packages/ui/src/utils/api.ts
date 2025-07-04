// @ts-ignore
const baseUrl = (import.meta as any).env?.VITE_USE_PROXY === 'true' ? '/api/flowise' : 'https://flowise-ai-cqlx.onrender.com/api/v1'

export async function api<T>(endpoint: string, opts: RequestInit = {}, retries = 1) {
    const url = `${baseUrl}/${endpoint.replace(/^\/+/, '')}`
    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(opts.headers || {})
    }
    try {
        const res = await fetch(url, {
            ...opts,
            headers,
            credentials: 'include'
        })
        if (!res.ok) {
            console.error('Bad response:', res.status, res.statusText)
            if (retries > 0) {
                return api<T>(endpoint, opts, retries - 1)
            }
            throw new Error(`Request failed ${res.status}`)
        }
        const contentType = res.headers.get('content-type') || ''
        if (!contentType.includes('application/json')) {
            console.error('Expected JSON, got:', contentType)
            if (retries > 0) {
                return api<T>(endpoint, opts, retries - 1)
            }
            throw new Error('Invalid JSON response')
        }
        return (await res.json()) as T
    } catch (err) {
        if (retries > 0) {
            return api<T>(endpoint, opts, retries - 1)
        }
        throw err
    }
}
