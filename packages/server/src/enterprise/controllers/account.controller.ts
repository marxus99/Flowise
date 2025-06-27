import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { AccountService } from '../services/account.service'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { setTokenOrCookies } from '../middleware/passport'
import axios from 'axios'

export class AccountController {
    public async register(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.register(req.body)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async invite(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.invite(req.body, req.user)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async login(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.login(req.body)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async verify(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.verify(req.body)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async resendVerificationEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.resendVerificationEmail(req.body)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async forgotPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.forgotPassword(req.body)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.resetPassword(req.body)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async createStripeCustomerPortalSession(req: Request, res: Response, next: NextFunction) {
        try {
            const { url: portalSessionUrl } = await getRunningExpressApp().identityManager.createStripeCustomerPortalSession(req)
            return res.status(StatusCodes.OK).json({ url: portalSessionUrl })
        } catch (error) {
            next(error)
        }
    }

    public async cancelPreviousCloudSubscrption(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body
            if (!email) {
                return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Email is required' })
            }

            const headers = {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }

            const response = await axios.post(`${process.env.ENGINE_URL}/cancel-subscription`, { email }, { headers })

            if (response.status === 200) {
                return res.status(StatusCodes.OK).json(response.data)
            } else {
                return res.status(response.status).json(response.data)
            }
        } catch (error) {
            next(error)
        }
    }

    public async logout(req: Request, res: Response, next: NextFunction) {
        try {
            if (req.user) {
                const accountService = new AccountService()
                await accountService.logout(req.user)
                if (req.isAuthenticated()) {
                    req.logout((err) => {
                        if (err) {
                            return res.status(500).json({ message: 'Logout failed' })
                        }
                        req.session.destroy((err) => {
                            if (err) {
                                return res.status(500).json({ message: 'Failed to destroy session' })
                            }
                        })
                    })
                } else {
                    // For JWT-based users (owner, org_admin)
                    res.clearCookie('connect.sid') // Clear the session cookie
                    res.clearCookie('token') // Clear the JWT cookie
                    res.clearCookie('refreshToken') // Clear the JWT cookie
                    return res.redirect('/login') // Redirect to the login page
                }
            }
            return res.status(200).json({ message: 'logged_out', redirectTo: `/login` })
        } catch (error) {
            next(error)
        }
    }

    public async getBasicAuth(req: Request, res: Response) {
        if (process.env.FLOWISE_USERNAME && process.env.FLOWISE_PASSWORD) {
            return res.status(StatusCodes.OK).json({
                isUsernamePasswordSet: true
            })
        } else {
            return res.status(StatusCodes.OK).json({
                isUsernamePasswordSet: false
            })
        }
    }

    public async checkBasicAuth(req: Request, res: Response) {
        try {
            const { username, password } = req.body

            if (username === process.env.FLOWISE_USERNAME && password === process.env.FLOWISE_PASSWORD) {
                // Create a basic auth user object that matches the expected LoggedInUser interface
                const basicAuthUser = {
                    id: 'basic-auth-user',
                    email: username,
                    name: username.split('@')[0] || 'Admin',
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

                // Set the user in the request for context
                req.user = basicAuthUser as any

                try {
                    // Use setTokenOrCookies to set proper authentication tokens and send response
                    // Pass false for session parameter to avoid session storage
                    return setTokenOrCookies(res, basicAuthUser, true, req)
                } catch (tokenError) {
                    console.error('❌ setTokenOrCookies failed:', tokenError)
                    return res.status(500).json({ message: 'Failed to set authentication tokens' })
                }
            } else {
                return res.status(401).json({ message: 'Authentication failed' })
            }
        } catch (error) {
            console.error('💥 Exception in checkBasicAuth:', error)
            return res.status(500).json({ message: 'Internal server error' })
        }
    }
}
