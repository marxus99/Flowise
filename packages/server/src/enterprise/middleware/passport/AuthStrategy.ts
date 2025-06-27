import { JwtFromRequestFunction, Strategy as JwtStrategy, VerifiedCallback } from 'passport-jwt'
import { decryptToken } from '../../utils/tempTokenUtils'
import { Strategy } from 'passport'
import { Request } from 'express'
import { ICommonObject } from 'flowise-components'

const _cookieExtractor = (req: any) => {
    let jwt = null

    if (req && req.cookies) {
        jwt = req.cookies['token']
    }

    return jwt
}

export const getAuthStrategy = (options: any): Strategy => {
    let jwtFromRequest: JwtFromRequestFunction
    jwtFromRequest = _cookieExtractor
    const jwtOptions = {
        jwtFromRequest: jwtFromRequest,
        passReqToCallback: true,
        ...options
    }
    const jwtVerify = async (req: Request, payload: ICommonObject, done: VerifiedCallback) => {
        try {
            console.log('🔍 JWT Strategy Debug:')
            console.log('- Payload:', payload)
            console.log('- Meta field present:', !!payload.meta)

            const meta = decryptToken(payload.meta)
            console.log('- Decrypted meta:', meta)

            if (!meta) {
                console.log('❌ No meta after decryption')
                return done(null, false, 'Unauthorized.')
            }
            const ids = meta.split(':')
            console.log('- Parsed IDs:', ids)

            if (ids.length !== 2) {
                console.log('❌ Invalid meta format - not exactly 2 parts')
                return done(null, false, 'Unauthorized.')
            }

            const [userId, workspaceId] = ids
            console.log('- User ID:', userId, 'Workspace ID:', workspaceId)

            // Handle basic auth users (who don't have session-based req.user)
            if (userId === 'basic-auth-user') {
                console.log('✅ Handling basic auth user')
                // Recreate the basic auth user object for JWT verification
                const basicAuthUser = {
                    id: 'basic-auth-user',
                    email: process.env.FLOWISE_USERNAME,
                    name: process.env.FLOWISE_USERNAME?.split('@')[0] || 'Admin',
                    roleId: 'basic-auth-role',
                    activeOrganizationId: 'basic-auth-org',
                    activeOrganizationSubscriptionId: 'basic-auth-subscription',
                    activeOrganizationCustomerId: 'basic-auth-customer',
                    activeOrganizationProductId: 'basic-auth-product',
                    isOrganizationAdmin: true,
                    activeWorkspaceId: 'basic-auth-workspace',
                    activeWorkspace: 'Basic Auth Workspace',
                    assignedWorkspaces: [],
                    isApiKeyValidated: true,
                    permissions: [],
                    features: {}
                }
                console.log('✅ Returning basic auth user:', basicAuthUser.email)
                return done(null, basicAuthUser)
            }

            // Handle regular session-based users
            console.log('🔍 Checking session-based user - req.user present:', !!req.user)
            if (req.user) {
                console.log('- req.user.id:', req.user.id)
            }

            if (!req.user || req.user.id !== userId) {
                console.log('❌ Session user mismatch or missing')
                return done(null, false, 'Unauthorized.')
            }
            console.log('✅ Session-based user validated')
            done(null, req.user)
        } catch (error) {
            console.error('💥 JWT Strategy Error:', error)
            done(error, false)
        }
    }
    return new JwtStrategy(jwtOptions, jwtVerify)
}
