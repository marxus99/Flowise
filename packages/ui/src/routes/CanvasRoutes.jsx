import { lazy } from 'react'

// project imports
import Loadable from '@/ui-component/loading/Loadable'
import MinimalLayout from '@/layout/MinimalLayout'
import { RequireAuth } from '@/routes/RequireAuth'
import CanvasErrorBoundary from '@/views/canvas/CanvasErrorBoundary'

// canvas routing with error boundary protection
const Canvas = Loadable(lazy(() => import('@/views/canvas')))
const MarketplaceCanvas = Loadable(lazy(() => import('@/views/marketplaces/MarketplaceCanvas')))
const CanvasV2 = Loadable(lazy(() => import('@/views/agentflowsv2/Canvas')))
const MarketplaceCanvasV2 = Loadable(lazy(() => import('@/views/agentflowsv2/MarketplaceCanvas')))

// Wrapper components with error boundaries
const CanvasWithErrorBoundary = (props) => (
    <CanvasErrorBoundary isAgentCanvas={false}>
        <Canvas {...props} />
    </CanvasErrorBoundary>
)

const AgentCanvasWithErrorBoundary = (props) => (
    <CanvasErrorBoundary isAgentCanvas={true}>
        <Canvas {...props} />
    </CanvasErrorBoundary>
)

const CanvasV2WithErrorBoundary = (props) => (
    <CanvasErrorBoundary isAgentCanvas={true}>
        <CanvasV2 {...props} />
    </CanvasErrorBoundary>
)

const MarketplaceCanvasWithErrorBoundary = (props) => (
    <CanvasErrorBoundary isAgentCanvas={false}>
        <MarketplaceCanvas {...props} />
    </CanvasErrorBoundary>
)

const MarketplaceCanvasV2WithErrorBoundary = (props) => (
    <CanvasErrorBoundary isAgentCanvas={true}>
        <MarketplaceCanvasV2 {...props} />
    </CanvasErrorBoundary>
)

// ==============================|| CANVAS ROUTING ||============================== //

const CanvasRoutes = {
    path: '/',
    element: <MinimalLayout />,
    children: [
        {
            path: '/canvas',
            element: (
                <RequireAuth permission={'chatflows:view'}>
                    <CanvasWithErrorBoundary />
                </RequireAuth>
            )
        },
        {
            path: '/canvas/:id',
            element: (
                <RequireAuth permission={'chatflows:view'}>
                    <CanvasWithErrorBoundary />
                </RequireAuth>
            )
        },
        {
            path: '/agentcanvas',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <AgentCanvasWithErrorBoundary />
                </RequireAuth>
            )
        },
        {
            path: '/agentcanvas/:id',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <AgentCanvasWithErrorBoundary />
                </RequireAuth>
            )
        },
        {
            path: '/v2/agentcanvas',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <CanvasV2WithErrorBoundary />
                </RequireAuth>
            )
        },
        {
            path: '/v2/agentcanvas/:id',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <CanvasV2WithErrorBoundary />
                </RequireAuth>
            )
        },
        {
            path: '/marketplace/:id',
            element: (
                <RequireAuth permission={'templates:marketplace,templates:custom'}>
                    <MarketplaceCanvasWithErrorBoundary />
                </RequireAuth>
            )
        },
        {
            path: '/v2/marketplace/:id',
            element: (
                <RequireAuth permission={'templates:marketplace,templates:custom'}>
                    <MarketplaceCanvasV2WithErrorBoundary />
                </RequireAuth>
            )
        }
    ]
}

export default CanvasRoutes
