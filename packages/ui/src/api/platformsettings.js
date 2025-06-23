const getSettings = async () => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || window.location.origin
    const response = await fetch(`${baseURL}/api/v1/settings`, {
        credentials: 'include'
    })
    const data = await response.json()
    return { data }
}

export default {
    getSettings
}
