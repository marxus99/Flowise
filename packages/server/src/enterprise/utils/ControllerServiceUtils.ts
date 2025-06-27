import { Equal, FindOptionsWhere } from 'typeorm'
import { Request } from 'express'

/**
 * Checks if a string is a valid UUID format
 */
const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
}

export const getWorkspaceSearchOptions = (workspaceId?: string): FindOptionsWhere<any> => {
    // If workspaceId is provided and it's a valid UUID, use it for filtering
    // If it's not a valid UUID (like 'basic-auth-workspace'), return empty options to get all records
    if (workspaceId && isValidUUID(workspaceId)) {
        return { workspaceId: Equal(workspaceId) }
    }
    return {}
}

export const getWorkspaceSearchOptionsFromReq = (req: Request): FindOptionsWhere<any> => {
    const workspaceId = req.user?.activeWorkspaceId
    // Use the same validation logic as getWorkspaceSearchOptions
    if (workspaceId && isValidUUID(workspaceId)) {
        return { workspaceId: Equal(workspaceId) }
    }
    return {}
}
