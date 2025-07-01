import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { UsageCacheManager } from '../UsageCacheManager'
import { LICENSE_QUOTAS } from './constants'
import logger from './logger'

type UsageType = 'flows' | 'users'
export const ENTERPRISE_FEATURE_FLAGS = [
    //'feat:account', // Only for Cloud
    'feat:datasets',
    'feat:evaluations',
    'feat:evaluators',
    'feat:files',
    'feat:login-activity',
    'feat:users',
    'feat:workspaces',
    'feat:logs',
    'feat:roles',
    'feat:sso-config'
]

export const getCurrentUsage = async (orgId: string, subscriptionId: string, usageCacheManager: UsageCacheManager) => {
    try {
        if (!usageCacheManager || !subscriptionId || !orgId) return

        const currentStorageUsage = (await usageCacheManager.get(`storage:${orgId}`)) || 0
        const currentPredictionsUsage = (await usageCacheManager.get(`predictions:${orgId}`)) || 0

        const quotas = await usageCacheManager.getQuotas(subscriptionId)
        const storageLimit = quotas[LICENSE_QUOTAS.STORAGE_LIMIT]
        const predLimit = quotas[LICENSE_QUOTAS.PREDICTIONS_LIMIT]

        return {
            predictions: {
                usage: currentPredictionsUsage,
                limit: predLimit
            },
            storage: {
                usage: currentStorageUsage,
                limit: storageLimit
            }
        }
    } catch (error) {
        logger.error(`[getCurrentUsage] Error getting usage: ${error}`)
        // Return unlimited quotas if there's an error (e.g., Stripe not configured)
        return {
            predictions: {
                usage: 0,
                limit: -1
            },
            storage: {
                usage: 0,
                limit: -1
            }
        }
    }
}

// For usage that doesn't renew per month, we just get the count from database and check
export const checkUsageLimit = async (
    type: UsageType,
    subscriptionId: string,
    usageCacheManager: UsageCacheManager,
    currentUsage: number
) => {
    if (!usageCacheManager || !subscriptionId) return

    try {
        const quotas = await usageCacheManager.getQuotas(subscriptionId)

        let limit = -1
        switch (type) {
            case 'flows':
                limit = quotas[LICENSE_QUOTAS.FLOWS_LIMIT]
                break
            case 'users':
                limit = quotas[LICENSE_QUOTAS.USERS_LIMIT] + (Math.max(quotas[LICENSE_QUOTAS.ADDITIONAL_SEATS_LIMIT], 0) || 0)
                break
        }

        if (limit === -1) return

        if (currentUsage > limit) {
            throw new InternalFlowiseError(StatusCodes.TOO_MANY_REQUESTS, `Limit exceeded: ${type}`)
        }
    } catch (error) {
        // If there's an error getting quotas (e.g., Stripe not configured), allow the operation
        logger.warn(`[checkUsageLimit] Could not check usage limit for ${type}: ${error}`)
        return
    }
}

// As predictions limit renew per month, we set to cache with 1 month TTL
export const updatePredictionsUsage = async (
    orgId: string,
    subscriptionId: string,
    _: string = '',
    usageCacheManager?: UsageCacheManager
) => {
    if (!usageCacheManager) return

    try {
        const quotas = await usageCacheManager.getQuotas(subscriptionId)
        const predictionsLimit = quotas[LICENSE_QUOTAS.PREDICTIONS_LIMIT]

        let currentPredictions = 0
        const existingPredictions = await usageCacheManager.get(`predictions:${orgId}`)
        if (existingPredictions) {
            currentPredictions =
                1 + (existingPredictions as number) > predictionsLimit ? predictionsLimit : 1 + (existingPredictions as number)
        } else {
            currentPredictions = 1
        }

        const currentTTL = await usageCacheManager.getTTL(`predictions:${orgId}`)
        if (currentTTL) {
            const currentTimestamp = Date.now()
            const timeLeft = currentTTL - currentTimestamp
            usageCacheManager.set(`predictions:${orgId}`, currentPredictions, timeLeft)
        } else {
            const subscriptionDetails = await usageCacheManager.getSubscriptionDetails(subscriptionId)
            if (subscriptionDetails && subscriptionDetails.created) {
                const MS_PER_DAY = 24 * 60 * 60 * 1000
                const DAYS = 30
                const approximateMonthMs = DAYS * MS_PER_DAY

                // Calculate time elapsed since subscription creation
                const createdTimestamp = subscriptionDetails.created * 1000 // Convert to milliseconds if timestamp is in seconds
                const currentTimestamp = Date.now()
                const timeElapsed = currentTimestamp - createdTimestamp

                // Calculate remaining time in the current month period
                const timeLeft = approximateMonthMs - (timeElapsed % approximateMonthMs)

                usageCacheManager.set(`predictions:${orgId}`, currentPredictions, timeLeft)
            } else {
                // Fallback to default 30 days if no creation date
                const MS_PER_DAY = 24 * 60 * 60 * 1000
                const DAYS = 30
                const approximateMonthMs = DAYS * MS_PER_DAY
                usageCacheManager.set(`predictions:${orgId}`, currentPredictions, approximateMonthMs)
            }
        }
    } catch (error) {
        logger.warn(`[updatePredictionsUsage] Could not update predictions usage: ${error}`)
        return
    }
}

export const checkPredictions = async (orgId: string, subscriptionId: string, usageCacheManager: UsageCacheManager) => {
    if (!usageCacheManager || !subscriptionId) return

    try {
        const currentPredictions: number = (await usageCacheManager.get(`predictions:${orgId}`)) || 0

        const quotas = await usageCacheManager.getQuotas(subscriptionId)
        const predictionsLimit = quotas[LICENSE_QUOTAS.PREDICTIONS_LIMIT]
        if (predictionsLimit === -1) return

        if (currentPredictions >= predictionsLimit) {
            throw new InternalFlowiseError(StatusCodes.TOO_MANY_REQUESTS, 'Predictions limit exceeded')
        }

        return {
            usage: currentPredictions,
            limit: predictionsLimit
        }
    } catch (error) {
        logger.warn(`[checkPredictions] Could not check predictions limit: ${error}`)
        return
    }
}

// Storage does not renew per month nor do we store the total size in database, so we just store the total size in cache
export const updateStorageUsage = (orgId: string, _: string = '', totalSize: number, usageCacheManager?: UsageCacheManager) => {
    if (!usageCacheManager) return
    usageCacheManager.set(`storage:${orgId}`, totalSize)
}

export const checkStorage = async (orgId: string, subscriptionId: string, usageCacheManager: UsageCacheManager) => {
    if (!usageCacheManager || !subscriptionId) return

    try {
        let currentStorageUsage = 0
        currentStorageUsage = (await usageCacheManager.get(`storage:${orgId}`)) || 0

        const quotas = await usageCacheManager.getQuotas(subscriptionId)
        const storageLimit = quotas[LICENSE_QUOTAS.STORAGE_LIMIT]
        if (storageLimit === -1) return

        if (currentStorageUsage >= storageLimit) {
            throw new InternalFlowiseError(StatusCodes.TOO_MANY_REQUESTS, 'Storage limit exceeded')
        }

        return {
            usage: currentStorageUsage,
            limit: storageLimit
        }
    } catch (error) {
        logger.warn(`[checkStorage] Could not check storage limit: ${error}`)
        return
    }
}
