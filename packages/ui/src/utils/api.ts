export async function api<T>(url: string, opts: RequestInit = {}): Promise<T> {
    try {
        const res = await fetch(url, opts)
        if (!res?.ok) {
            throw new Error(`HTTP ${res?.status ?? '??'} – ${res?.statusText ?? 'no status'}`)
        }
        return res.json() as Promise<T>
    } catch (err) {
        console.error('API error →', err)
        throw err
    }
}
