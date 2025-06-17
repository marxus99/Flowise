const baseUrl = process.env.NEXT_PUBLIC_USE_PROXY === 'true' ? '/api/flowise' : 'https://flowise-ai-cqlx.onrender.com/api/v1'

export async function api<T>(endpoint: string, opts: RequestInit = {}) {
    const url = `${baseUrl}/${endpoint.replace(/^\/+/, '')}`

    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(opts.headers as Record<string, string>)
    }

    const res = await fetch(url, { ...opts, headers, credentials: 'include' })

    let text = ''
    try {
        text = await res.text()
    } catch {
        text = ''
    }

    const isJson = res.headers.get('content-type')?.includes('application/json')
    const data = isJson && text ? JSON.parse(text) : text

    if (!res.ok) {
        const message = res.status >= 500 ? 'Server error' : text || res.statusText
        throw new Error(`HTTP ${res.status} – ${message}`)
    }

    return data as T
}
