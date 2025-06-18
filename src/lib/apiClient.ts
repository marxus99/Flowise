export type ApiOptions = RequestInit & { retry?: number }

export async function apiFetch(url: string, options: ApiOptions = {}): Promise<any> {
    const { headers, retry = 0, ...rest } = options
    const mergedHeaders = {
        'Content-Type': 'application/json',
        ...(headers || {})
    }

    try {
        const response = await fetch(url, { headers: mergedHeaders, ...rest })
        const text = await response.text()
        const data = text ? JSON.parse(text) : undefined
        if (!response.ok) {
            const error: any = new Error(data?.message || response.statusText)
            error.status = response.status
            throw error
        }
        return data
    } catch (err) {
        if (retry > 0) {
            return apiFetch(url, { headers, retry: retry - 1, ...rest })
        }
        throw err
    }
}
