import { configureStore } from '@reduxjs/toolkit'
import reducer from './reducer'

// ==============================|| REDUX - MAIN STORE ||============================== //

const store = configureStore({
    reducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            // Configure middleware to handle non-serializable values properly
            serializableCheck: {
                ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
                ignoredPaths: ['register']
            },
            // Improve performance for development
            immutableCheck: {
                ignoredPaths: ['register']
            }
        }),
    // Enable Redux DevTools in development
    devTools: process.env.NODE_ENV !== 'production',
    // Enhanced error handling
    enhancers: (defaultEnhancers) => defaultEnhancers
})

const persister = 'Free'

export { store, persister }
