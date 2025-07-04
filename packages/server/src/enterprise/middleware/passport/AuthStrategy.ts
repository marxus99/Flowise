import { JwtFromRequestFunction, Strategy as JwtStrategy, VerifiedCallback } from 'passport-jwt'
import { decryptToken } from '../../utils/tempTokenUtils'
import { Strategy } from 'passport'
import { Request } from 'express'
import { ICommonObject } from 'flowise-components'

const _cookieExtractor = (req: any) => {
    let jwt = null

    // First try to get token from cookies
    if (req && req.cookies) {
        jwt = req.cookies['token']
    }

    // Fallback to Authorization header for cross-origin scenarios or when cookies fail
    if (!jwt && req.headers?.authorization) {
        const authHeader = req.headers.authorization
        if (authHeader.startsWith('Bearer ')) {
            jwt = authHeader.substring(7)
        }
    }

    // Additional fallback: check for token in query params (use sparingly, less secure)
    if (!jwt && req.query?.token && typeof req.query.token === 'string') {
        jwt = req.query.token
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
            const meta = decryptToken(payload.meta)

            if (!meta) {
                return done(null, false, 'Unauthorized.')
            }
            const ids = meta.split(':')

            if (ids.length !== 2) {
                return done(null, false, 'Unauthorized.')
            }

            const [userId, _workspaceId] = ids

            // Handle basic auth users (who don't have session-based req.user)
            if (userId === 'basic-auth-user') {
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
                return done(null, basicAuthUser)
            }

            // Handle regular session-based users
            if (!req.user || req.user.id !== userId) {
                return done(null, false, 'Unauthorized.')
            }
            done(null, req.user)
        } catch (error) {
            done(error, false)
        }
    }
    return new JwtStrategy(jwtOptions, jwtVerify)
}
