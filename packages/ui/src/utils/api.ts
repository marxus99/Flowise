const baseUrl = process.env.NEXT_PUBLIC_USE_PROXY === 'true' ? '/api/flowise' : 'https://flowise-ai-cqlx.onrender.com/api/v1'

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

    } catch (err) {
        if (retries > 0) {
            return api<T>(endpoint, opts, retries - 1)
        }
        throw err
    }
}
