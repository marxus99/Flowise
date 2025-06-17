import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { baseURL } from '@/store/constant'

interface RetryConfig extends AxiosRequestConfig {
    _retryCount?: number
}

const api = axios.create({
    baseURL: `${baseURL}/api/v1`,
    withCredentials: true,
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-request-from': 'internal'
    }
})

const MAX_RETRIES = 2

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const { response, config } = error
        const retryConfig = config as RetryConfig
        if (response && response.status >= 500 && (retryConfig._retryCount || 0) < MAX_RETRIES) {
            retryConfig._retryCount = (retryConfig._retryCount || 0) + 1
            return api.request(retryConfig)
        }
        if (response && response.headers['content-type']?.includes('text/html')) {
            return Promise.reject(new Error(`Unexpected HTML response: ${response.status}`))
        }
        if (response?.status === 401) {
            // optional: add your auth logout logic here
            return Promise.reject(new Error('Unauthorized'))
        }
        return Promise.reject(error)
    }
)

export default api
