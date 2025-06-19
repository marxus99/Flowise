import { Equal, FindOptionsWhere } from 'typeorm'
import { Request } from 'express'

export const getWorkspaceSearchOptions = (workspaceId?: string): FindOptionsWhere<any> => {
    return workspaceId ? { workspaceId: Equal(workspaceId) } : {}
}

export const getWorkspaceSearchOptionsFromReq = (req: Request): FindOptionsWhere<any> => {
    const workspaceId = req.user?.activeWorkspaceId
    return workspaceId ? { workspaceId: Equal(workspaceId) } : {}
}
