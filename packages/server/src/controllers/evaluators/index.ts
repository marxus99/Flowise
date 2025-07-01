import { Request, Response, NextFunction } from 'express'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import evaluatorService from '../../services/evaluator'

const getAllEvaluators = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await evaluatorService.getAllEvaluators(req.user?.activeWorkspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getEvaluator = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: evaluatorService.getEvaluator - id not provided!`)
        }
        const apiResponse = await evaluatorService.getEvaluator(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const createEvaluator = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: evaluatorService.createEvaluator - body not provided!`)
        }
        const body = req.body

        // Handle special-case workspace IDs that shouldn't be stored as UUIDs
        const workspaceId = req.user?.activeWorkspaceId
        if (workspaceId && workspaceId !== 'basic-auth-workspace' && workspaceId !== 'basic-auth-org') {
            body.workspaceId = workspaceId
        } else {
            // For special cases like basic auth, don't set workspaceId
            body.workspaceId = undefined
        }
        const apiResponse = await evaluatorService.createEvaluator(body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateEvaluator = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: evaluatorService.updateEvaluator - body not provided!`)
        }
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: evaluatorService.updateEvaluator - id not provided!`)
        }
        const apiResponse = await evaluatorService.updateEvaluator(req.params.id, req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteEvaluator = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: evaluatorService.deleteEvaluator - id not provided!`)
        }
        const apiResponse = await evaluatorService.deleteEvaluator(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllEvaluators,
    getEvaluator,
    createEvaluator,
    updateEvaluator,
    deleteEvaluator
}
