import client from './client'

// auth
const resolveLogin = (body) => client.post(`/account/resolve`, body)
const login = (body) => client.post(`/account/login`, body)

// permissions
const getAllPermissions = () => client.get(`/auth/permissions`)

export default {
    resolveLogin,
    login,
    getAllPermissions
}
