import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { GeneralErrorMessage } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { User } from '../database/entities/user.entity'
import { UserErrorMessage, UserService } from '../services/user.service'

export class UserController {
    public async create(req: Request, res: Response, next: NextFunction) {
        try {
            const userService = new UserService()
            const user = await userService.createUser(req.body)
            return res.status(StatusCodes.CREATED).json(user)
        } catch (error) {
            next(error)
        }
    }

    public async read(req: Request, res: Response, next: NextFunction) {
        let queryRunner
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()
            const query = req.query as Partial<User>
            const userService = new UserService()

            let user: User | null
            if (query.id) {
                // Handle basic auth user case directly in controller to avoid validation errors
                if (query.id === 'basic-auth-user') {
                    const basicAuthUser = {
                        id: 'basic-auth-user',
                        email: process.env.FLOWISE_USERNAME || 'admin@basic-auth.local',
                        name: process.env.FLOWISE_USERNAME?.split('@')[0] || 'Admin',
                        status: 'active',
                        createdDate: new Date(),
                        updatedDate: new Date(),
                        createdBy: 'basic-auth-user',
                        updatedBy: 'basic-auth-user'
                    } as User
                    return res.status(StatusCodes.OK).json(basicAuthUser)
                }

                user = await userService.readUserById(query.id, queryRunner)
                if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            } else if (query.email) {
                user = await userService.readUserByEmail(query.email, queryRunner)
                if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            } else {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.UNHANDLED_EDGE_CASE)
            }

            if (user) {
                delete user.credential
                delete user.tempToken
                delete user.tokenExpiry
            }
            return res.status(StatusCodes.OK).json(user)
        } catch (error) {
            next(error)
        } finally {
            if (queryRunner) await queryRunner.release()
        }
    }
    public async update(req: Request, res: Response, next: NextFunction) {
        try {
            // Force redeploy confirmation log - v2
            console.log('🚀🚀 USER UPDATE LIVE CODE:', new Date().toISOString())

            const currentUser = req.user
            if (!currentUser) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, UserErrorMessage.USER_NOT_FOUND)
            }

            const { id } = req.body
            if (currentUser.id !== id) {
                throw new InternalFlowiseError(StatusCodes.FORBIDDEN, UserErrorMessage.USER_NOT_FOUND)
            }

            // Handle basic auth users separately - they cannot be updated in database
            if (currentUser.id === 'basic-auth-user') {
                // For basic auth users, validate input and return updated mock user object
                const userService = new UserService()

                // Validate allowed fields
                if (req.body.name) {
                    userService.validateUserName(req.body.name)
                }
                if (req.body.email) {
                    userService.validateUserEmail(req.body.email)
                }

                // Return updated basic auth user object
                const updatedBasicAuthUser = {
                    id: 'basic-auth-user',
                    email: req.body.email || currentUser.email,
                    name: req.body.name || currentUser.name,
                    status: 'active',
                    createdDate: new Date(),
                    updatedDate: new Date(),
                    createdBy: 'basic-auth-user',
                    updatedBy: 'basic-auth-user'
                }

                return res.status(StatusCodes.OK).json(updatedBasicAuthUser)
            }

            // Handle regular database users
            const userService = new UserService()
            const user = await userService.updateUser(req.body)
            return res.status(StatusCodes.OK).json(user)
        } catch (error) {
            next(error)
        }
    }

    public async test(req: Request, res: Response, next: NextFunction) {
        try {
            return res.status(StatusCodes.OK).json({ message: 'Hello World' })
        } catch (error) {
            next(error)
        }
    }
}
