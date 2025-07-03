import { useEffect, useRef, useState, useCallback, useContext } from 'react'
import ReactFlow, { addEdge, Controls, MiniMap, Background, useNodesState, useEdgesState } from 'reactflow'
import 'reactflow/dist/style.css'
import './index.css'
import { useReward } from 'react-rewards'

import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import {
    REMOVE_DIRTY,
    SET_DIRTY,
    SET_CHATFLOW,
    enqueueSnackbar as enqueueSnackbarAction,
    closeSnackbar as closeSnackbarAction
} from '@/store/actions'
import { omit, cloneDeep } from 'lodash'

// material-ui
import { Toolbar, Box, AppBar, Button, Fab } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import CanvasNode from './AgentFlowNode'
import IterationNode from './IterationNode'
import AgentFlowEdge from './AgentFlowEdge'
import ConnectionLine from './ConnectionLine'
import StickyNote from './StickyNote'
import CanvasHeader from '@/views/canvas/CanvasHeader'
import AddNodes from '@/views/canvas/AddNodes'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import EditNodeDialog from '@/views/agentflowsv2/EditNodeDialog'
import ChatPopUp from '@/views/chatmessage/ChatPopUp'
import ValidationPopUp from '@/views/chatmessage/ValidationPopUp'
import { flowContext } from '@/store/context/ReactFlowContext'

// API
import nodesApi from '@/api/nodes'
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

// icons
import { IconX, IconRefreshAlert, IconMagnetFilled, IconMagnetOff } from '@tabler/icons-react'

// utils
import {
    getUniqueNodeLabel,
    getUniqueNodeId,
    initNode,
    updateOutdatedNodeData,
    updateOutdatedNodeEdge,
    isValidConnectionAgentflowV2
} from '@/utils/genericHelper'
import useNotifier from '@/utils/useNotifier'
import { usePrompt } from '@/utils/usePrompt'

// const
import { FLOWISE_CREDENTIAL_ID, AGENTFLOW_ICONS } from '@/store/constant'

const nodeTypes = { agentFlow: CanvasNode, stickyNote: StickyNote, iteration: IterationNode }
const edgeTypes = { agentFlow: AgentFlowEdge }

// ==============================|| CANVAS ||============================== //

const AgentflowCanvas = () => {
    const theme = useTheme()
    const navigate = useNavigate()
    const customization = useSelector((state) => state.customization)

    const { state } = useLocation()
    const templateFlowData = state ? state.templateFlowData : ''

    const URLpath = document.location.pathname.toString().split('/')
    const chatflowId =
        URLpath[URLpath.length - 1] === 'canvas' || URLpath[URLpath.length - 1] === 'agentcanvas' ? '' : URLpath[URLpath.length - 1]
    const canvasTitle = URLpath.includes('agentcanvas') ? 'Agent' : 'Chatflow'

    const { confirm } = useConfirm()

    const dispatch = useDispatch()
    const canvas = useSelector((state) => state.canvas)
    const [canvasDataStore, setCanvasDataStore] = useState(canvas)
    const [chatflow, setChatflow] = useState(null)
    const { reactFlowInstance, setReactFlowInstance } = useContext(flowContext)

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const enqueueSnackbar = useCallback((...args) => dispatch(enqueueSnackbarAction(...args)), [dispatch])
    const closeSnackbar = useCallback((...args) => dispatch(closeSnackbarAction(...args)), [dispatch])

    // ==============================|| ReactFlow ||============================== //

    const [nodes, setNodes, _onNodesChange] = useNodesState()
    const [edges, setEdges, _onEdgesChange] = useEdgesState()

    const [selectedNode, setSelectedNode] = useState(null)
    const [isSyncNodesButtonEnabled, setIsSyncNodesButtonEnabled] = useState(false)
    const [editNodeDialogOpen, setEditNodeDialogOpen] = useState(false)
    const [editNodeDialogProps, setEditNodeDialogProps] = useState({})
    const [isSnappingEnabled, setIsSnappingEnabled] = useState(false)

    const reactFlowWrapper = useRef(null)

    // ==============================|| Chatflow API ||============================== //

    const getNodesApi = useApi(nodesApi.getAllNodes)
    const createNewChatflowApi = useApi(chatflowsApi.createNewChatflow)
    const updateChatflowApi = useApi(chatflowsApi.updateChatflow)
    const getSpecificChatflowApi = useApi(chatflowsApi.getSpecificChatflow)

    // ==============================|| Events & Actions ||============================== //

    const onConnect = (params) => {
        if (!isValidConnectionAgentflowV2(params, reactFlowInstance)) {
            return
        }

        const nodeName = params.sourceHandle.split('_')[0]
        const targetNodeName = params.targetHandle.split('_')[0]

        const targetColor = AGENTFLOW_ICONS.find((icon) => icon.name === targetNodeName)?.color ?? theme.palette.primary.main
        const sourceColor = AGENTFLOW_ICONS.find((icon) => icon.name === nodeName)?.color ?? theme.palette.primary.main

        let edgeLabel = undefined
        if (nodeName === 'conditionAgentflow' || nodeName === 'conditionAgentAgentflow') {
            const _edgeLabel = params.sourceHandle.split('-').pop()
            edgeLabel = (isNaN(_edgeLabel) ? 0 : _edgeLabel).toString()
        }

        if (nodeName === 'humanInputAgentflow') {
            edgeLabel = params.sourceHandle.split('-').pop()
            edgeLabel = edgeLabel === '0' ? 'proceed' : 'reject'
        }

        // Check if both source and target nodes are within the same iteration node
        const sourceNode = reactFlowInstance.getNodes().find((node) => node.id === params.source)
        const targetNode = reactFlowInstance.getNodes().find((node) => node.id === params.target)
        const isWithinIterationNode = sourceNode?.parentNode && targetNode?.parentNode && sourceNode.parentNode === targetNode.parentNode

        const newEdge = {
            ...params,
            data: {
                ...params.data,
                sourceColor,
                targetColor,
                edgeLabel,
                isHumanInput: nodeName === 'humanInputAgentflow'
            },
            ...(isWithinIterationNode && { zIndex: 9999 }),
            type: 'agentFlow',
            id: `${params.source}-${params.sourceHandle}-${params.target}-${params.targetHandle}`
        }
        setEdges((eds) => addEdge(newEdge, eds))
    }

    const handleLoadFlow = (file) => {
        try {
            const flowData = JSON.parse(file)
            if (!flowData || typeof flowData !== 'object') {
                throw new Error('Invalid flow data format')
            }

            const nodes = flowData.nodes || []
            const edges = flowData.edges || []

            if (process.env.NODE_ENV === 'development') {
                if (process.env.NODE_ENV === 'development') {
                    console.info(`Loading flow with ${nodes.length} nodes and ${edges.length} edges`)
                }
            }

            // EXPERT LEVEL: Advanced node initialization with comprehensive validation
            if (getNodesApi.data && getNodesApi.data.length > 0 && nodes.length > 0) {
                const initializedNodes = nodes.map((node, index) => {
                    // Validate node structure
                    if (!node || !node.data || !node.data.name) {
                        console.warn(`Invalid node at index ${index}:`, node)
                        return node
                    }

                    // Find component template
                    const componentNode = getNodesApi.data.find((cn) => cn.name === node.data.name)
                    if (!componentNode) {
                        console.warn(`Component template not found for: ${node.data.name}`)
                        return node
                    }

                    // Preserve comprehensive saved data
                    const savedData = {
                        inputs: { ...node.data.inputs } || {},
                        outputs: { ...node.data.outputs } || {},
                        credential: node.data.credential || '',
                        label: node.data.label || componentNode.label,
                        selected: false, // Reset selection state
                        // Preserve additional properties
                        ...(node.data.status && { status: node.data.status }),
                        ...(node.data.category && { category: node.data.category }),
                        ...(node.data.description && { description: node.data.description }),
                        ...(node.data.documentation && { documentation: node.data.documentation })
                    }

                    try {
                        // Initialize with fresh component template
                        const initializedNodeData = initNode(cloneDeep(componentNode), node.id, true)

                        // Intelligently restore inputs with validation
                        if (savedData.inputs && typeof savedData.inputs === 'object') {
                            Object.keys(savedData.inputs).forEach((inputKey) => {
                                if (
                                    initializedNodeData.inputs &&
                                    inputKey in initializedNodeData.inputs &&
                                    savedData.inputs[inputKey] !== undefined
                                ) {
                                    initializedNodeData.inputs[inputKey] = savedData.inputs[inputKey]
                                }
                            })
                        }

                        // Restore outputs with validation
                        if (savedData.outputs && typeof savedData.outputs === 'object') {
                            Object.keys(savedData.outputs).forEach((outputKey) => {
                                if (
                                    initializedNodeData.outputs &&
                                    outputKey in initializedNodeData.outputs &&
                                    savedData.outputs[outputKey] !== undefined
                                ) {
                                    initializedNodeData.outputs[outputKey] = savedData.outputs[outputKey]
                                }
                            })
                        }

                        // Restore all other properties
                        Object.assign(initializedNodeData, {
                            credential: savedData.credential,
                            label: savedData.label,
                            selected: savedData.selected,
                            ...(savedData.status && { status: savedData.status }),
                            ...(savedData.category && { category: savedData.category }),
                            ...(savedData.description && { description: savedData.description }),
                            ...(savedData.documentation && { documentation: savedData.documentation })
                        })

                        return {
                            ...node,
                            data: initializedNodeData
                        }
                    } catch (error) {
                        console.error(`Failed to initialize node ${node.data.name}:`, error)
                        return node // Fallback to prevent data loss
                    }
                })

                setNodes(initializedNodes)
                if (process.env.NODE_ENV === 'development') {
                    if (process.env.NODE_ENV === 'development') {
                        console.info(`Successfully loaded and initialized ${initializedNodes.length} nodes`)
                    }
                }
            } else {
                // Store raw nodes for later initialization
                if (process.env.NODE_ENV === 'development') {
                    if (process.env.NODE_ENV === 'development') {
                        console.info('Component templates not ready or no nodes to load, storing for later...')
                    }
                }
                setNodes(nodes)
            }

            setEdges(edges)

            // Set dirty state after successful load for imported/duplicated flows
            setTimeout(() => {
                setDirty()
            }, 100)
        } catch (error) {
            console.error('Error loading flow:', error)
            enqueueSnackbar({
                message: `Failed to load workflow: ${error.message}`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    const handleDeleteFlow = async () => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete ${canvasTitle} ${chatflow.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                await chatflowsApi.deleteChatflow(chatflow.id)
                localStorage.removeItem(`${chatflow.id}_INTERNAL`)
                navigate('/agentflows')
            } catch (error) {
                enqueueSnackbar({
                    message: typeof error.response.data === 'object' ? error.response.data.message : error.response.data,
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        persist: true,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
            }
        }
    }

    const handleSaveFlow = useCallback(
        (chatflowName) => {
            if (reactFlowInstance) {
                const nodes = reactFlowInstance.getNodes().map((node) => {
                    const nodeData = cloneDeep(node.data)
                    if (Object.prototype.hasOwnProperty.call(nodeData.inputs, FLOWISE_CREDENTIAL_ID)) {
                        nodeData.credential = nodeData.inputs[FLOWISE_CREDENTIAL_ID]
                        nodeData.inputs = omit(nodeData.inputs, [FLOWISE_CREDENTIAL_ID])
                    }
                    node.data = {
                        ...nodeData,
                        selected: false,
                        status: undefined
                    }
                    return node
                })

                const rfInstanceObject = reactFlowInstance.toObject()
                rfInstanceObject.nodes = nodes
                const flowData = JSON.stringify(rfInstanceObject)

                if (process.env.NODE_ENV === 'development') {
                    console.info('Saving flow with nodes:', nodes.length, 'nodes')
                    console.info(
                        'Sample node data structure:',
                        nodes[0]
                            ? {
                                  id: nodes[0].id,
                                  type: nodes[0].type,
                                  hasInputAnchors: Array.isArray(nodes[0].data?.inputAnchors),
                                  hasOutputAnchors: Array.isArray(nodes[0].data?.outputAnchors),
                                  hasInputParams: Array.isArray(nodes[0].data?.inputParams),
                                  nodeName: nodes[0].data?.name
                              }
                            : 'No nodes to save'
                    )
                }

                // Check if this is an existing chatflow (has ID) or a new one
                if (!chatflow || !chatflow.id) {
                    const newChatflowBody = {
                        name: chatflowName,
                        deployed: false,
                        isPublic: false,
                        flowData,
                        type: 'AGENTFLOW'
                    }
                    createNewChatflowApi.request(newChatflowBody)
                } else {
                    const updateBody = {
                        name: chatflowName,
                        flowData
                    }
                    updateChatflowApi.request(chatflow.id, updateBody)
                }
            }
        },
        [reactFlowInstance, chatflow, createNewChatflowApi, updateChatflowApi]
    )

    // eslint-disable-next-line
    const onNodeClick = useCallback((event, clickedNode) => {
        setSelectedNode(clickedNode)
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === clickedNode.id) {
                    node.data = {
                        ...node.data,
                        selected: true
                    }
                } else {
                    node.data = {
                        ...node.data,
                        selected: false
                    }
                }

                return node
            })
        )
    })

    // eslint-disable-next-line
    const onNodeDoubleClick = useCallback((event, node) => {
        if (!node || !node.data) return
        if (node.data.name === 'stickyNoteAgentflow') {
            // dont show dialog
        } else {
            const dialogProps = {
                data: node.data,
                inputParams: node.data.inputParams.filter((inputParam) => !inputParam.hidden)
            }

            setEditNodeDialogProps(dialogProps)
            setEditNodeDialogOpen(true)
        }
    })

    // EXPERT LEVEL: Enhanced drag over handler with validation
    const onDragOver = useCallback(
        (event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'

            // Validate drop target
            const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
            if (!reactFlowBounds) return

            const position = reactFlowInstance?.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top
            })

            // Ensure position is within valid bounds
            if (position && (position.x < 0 || position.y < 0)) {
                event.dataTransfer.dropEffect = 'none'
            }
        },
        [reactFlowInstance, reactFlowWrapper]
    )

    const onDrop = useCallback(
        (event) => {
            event.preventDefault()
            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
            let nodeData = event.dataTransfer.getData('application/reactflow')

            // check if the dropped element is valid
            if (typeof nodeData === 'undefined' || !nodeData) {
                return
            }

            nodeData = JSON.parse(nodeData)

            const position = reactFlowInstance.project({
                x: event.clientX - reactFlowBounds.left - 100,
                y: event.clientY - reactFlowBounds.top - 50
            })
            const nodes = reactFlowInstance.getNodes()

            if (nodeData.name === 'startAgentflow' && nodes.find((node) => node.data.name === 'startAgentflow')) {
                enqueueSnackbar({
                    message: 'Only one start node is allowed',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        persist: true,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                return
            }

            const newNodeId = getUniqueNodeId(nodeData, reactFlowInstance.getNodes())
            const newNodeLabel = getUniqueNodeLabel(nodeData, nodes)

            const newNode = {
                id: newNodeId,
                position,
                data: { ...initNode(nodeData, newNodeId, true), label: newNodeLabel }
            }

            if (nodeData.type === 'Iteration') {
                newNode.type = 'iteration'
            } else if (nodeData.type === 'StickyNote') {
                newNode.type = 'stickyNote'
            } else {
                newNode.type = 'agentFlow'
            }

            // Check if the dropped node is within any Iteration node's flowContainerSize
            const iterationNodes = nodes.filter((node) => node.type === 'iteration')
            let parentNode = null

            for (const iterationNode of iterationNodes) {
                // Get the iteration node's position and dimensions
                const nodeWidth = iterationNode.width || 300
                const nodeHeight = iterationNode.height || 250

                // Calculate the boundaries of the iteration node
                const nodeLeft = iterationNode.position.x
                const nodeRight = nodeLeft + nodeWidth
                const nodeTop = iterationNode.position.y
                const nodeBottom = nodeTop + nodeHeight

                // Check if the dropped position is within these boundaries
                if (position.x >= nodeLeft && position.x <= nodeRight && position.y >= nodeTop && position.y <= nodeBottom) {
                    parentNode = iterationNode

                    // We can't have nested iteration nodes
                    if (nodeData.name === 'iterationAgentflow') {
                        enqueueSnackbar({
                            message: 'Nested iteration node is not supported yet',
                            options: {
                                key: new Date().getTime() + Math.random(),
                                variant: 'error',
                                persist: true,
                                action: (key) => (
                                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                        <IconX />
                                    </Button>
                                )
                            }
                        })
                        return
                    }

                    // We can't have human input node inside iteration node
                    if (nodeData.name === 'humanInputAgentflow') {
                        enqueueSnackbar({
                            message: 'Human input node is not supported inside Iteration node',
                            options: {
                                key: new Date().getTime() + Math.random(),
                                variant: 'error',
                                persist: true,
                                action: (key) => (
                                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                        <IconX />
                                    </Button>
                                )
                            }
                        })
                        return
                    }
                    break
                }
            }

            // If the node is dropped inside an iteration node, set its parent
            if (parentNode) {
                newNode.parentNode = parentNode.id
                newNode.extent = 'parent'
                // Adjust position to be relative to the parent
                newNode.position = {
                    x: position.x - parentNode.position.x,
                    y: position.y - parentNode.position.y
                }
            }

            setSelectedNode(newNode)
            setNodes((nds) => {
                return (nds ?? []).concat(newNode).map((node) => {
                    if (node.id === newNode.id) {
                        node.data = {
                            ...node.data,
                            selected: true
                        }
                    } else {
                        node.data = {
                            ...node.data,
                            selected: false
                        }
                    }

                    return node
                })
            })
            setTimeout(() => setDirty(), 0)
        },

        // eslint-disable-next-line
        [reactFlowInstance]
    )

    const syncNodes = () => {
        const componentNodes = canvas.componentNodes

        const cloneNodes = cloneDeep(nodes)
        const cloneEdges = cloneDeep(edges)
        let toBeRemovedEdges = []

        for (let i = 0; i < cloneNodes.length; i++) {
            const node = cloneNodes[i]
            const componentNode = componentNodes.find((cn) => cn.name === node.data.name)
            if (componentNode && componentNode.version > node.data.version) {
                const clonedComponentNode = cloneDeep(componentNode)
                cloneNodes[i].data = updateOutdatedNodeData(clonedComponentNode, node.data, true)
                toBeRemovedEdges.push(...updateOutdatedNodeEdge(cloneNodes[i].data, cloneEdges))
            }
        }

        setNodes(cloneNodes)
        setEdges(cloneEdges.filter((edge) => !toBeRemovedEdges.includes(edge)))
        setDirty()
        setIsSyncNodesButtonEnabled(false)
    }

    const { reward: confettiReward } = useReward('canvasConfetti', 'confetti', {
        elementCount: 150,
        spread: 80,
        lifetime: 300,
        startVelocity: 40,
        zIndex: 10000,
        decay: 0.92,
        position: 'fixed'
    })

    const triggerConfetti = () => {
        setTimeout(() => {
            confettiReward()
        }, 50)
    }

    const saveChatflowSuccess = () => {
        dispatch({ type: REMOVE_DIRTY })
        enqueueSnackbar({
            message: `${canvasTitle} saved`,
            options: {
                key: new Date().getTime() + Math.random(),
                variant: 'success',
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                )
            }
        })
    }

    const errorFailed = (message) => {
        enqueueSnackbar({
            message,
            options: {
                key: new Date().getTime() + Math.random(),
                variant: 'error',
                persist: true,
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                )
            }
        })
    }

    const setDirty = useCallback(() => {
        dispatch({ type: SET_DIRTY })
    }, [dispatch])

    const checkIfSyncNodesAvailable = (nodes) => {
        const componentNodes = canvas.componentNodes

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i]
            const componentNode = componentNodes.find((cn) => cn.name === node.data.name)
            if (componentNode && componentNode.version > node.data.version) {
                setIsSyncNodesButtonEnabled(true)
                return
            }
        }

        setIsSyncNodesButtonEnabled(false)
    }

    // ==============================|| useEffect ||============================== //

    // EXPERT LEVEL FIX: Advanced race condition handling for chatflow loading
    useEffect(() => {
        if (getSpecificChatflowApi.data) {
            const chatflow = getSpecificChatflowApi.data
            const initialFlow = chatflow.flowData ? JSON.parse(chatflow.flowData) : { nodes: [], edges: [] }

            // Loading chatflow with flow data - validation check
            const flowDataInfo = {
                hasFlowData: !!chatflow.flowData,
                nodesCount: initialFlow.nodes?.length || 0,
                edgesCount: initialFlow.edges?.length || 0,
                componentTemplatesReady: !!getNodesApi.data?.length
            }
            if (process.env.NODE_ENV === 'development') {
                console.info('Loading chatflow with flow data:', flowDataInfo)
            }

            // CRITICAL: Bulletproof node initialization with comprehensive error handling
            if (getNodesApi.data && getNodesApi.data.length > 0 && initialFlow.nodes && initialFlow.nodes.length > 0) {
                if (process.env.NODE_ENV === 'development') {
                    if (process.env.NODE_ENV === 'development') {
                        console.info('Initializing saved workflow nodes with component templates...')
                    }
                }

                const initializedNodes = initialFlow.nodes.map((node, index) => {
                    // Validate node structure
                    if (!node || !node.data || !node.data.name) {
                        console.warn(`Invalid node structure at index ${index}:`, node)
                        return node
                    }

                    // Find the component node template for this node
                    const componentNode = getNodesApi.data.find((cn) => cn.name === node.data.name)
                    if (!componentNode) {
                        console.warn(`Component template not found for node: ${node.data.name}`)
                        return node
                    }

                    // Preserve all saved data before re-initialization
                    const savedData = {
                        inputs: { ...node.data.inputs } || {},
                        outputs: { ...node.data.outputs } || {},
                        credential: node.data.credential || '',
                        label: node.data.label || componentNode.label,
                        selected: node.data.selected || false,
                        // Preserve any additional custom properties
                        ...(node.data.status && { status: node.data.status }),
                        ...(node.data.category && { category: node.data.category }),
                        ...(node.data.description && { description: node.data.description }),
                        ...(node.data.documentation && { documentation: node.data.documentation })
                    }

                    try {
                        // Re-initialize node with fresh component template
                        const initializedNodeData = initNode(cloneDeep(componentNode), node.id, true)

                        // Intelligently restore saved inputs (only valid ones)
                        if (savedData.inputs && typeof savedData.inputs === 'object') {
                            Object.keys(savedData.inputs).forEach((inputKey) => {
                                if (initializedNodeData.inputs && inputKey in initializedNodeData.inputs) {
                                    initializedNodeData.inputs[inputKey] = savedData.inputs[inputKey]
                                }
                            })
                        }

                        // Restore saved outputs (only valid ones)
                        if (savedData.outputs && typeof savedData.outputs === 'object') {
                            Object.keys(savedData.outputs).forEach((outputKey) => {
                                if (initializedNodeData.outputs && outputKey in initializedNodeData.outputs) {
                                    initializedNodeData.outputs[outputKey] = savedData.outputs[outputKey]
                                }
                            })
                        }

                        // Restore other saved properties
                        Object.assign(initializedNodeData, {
                            credential: savedData.credential,
                            label: savedData.label,
                            selected: savedData.selected,
                            ...(savedData.status && { status: savedData.status }),
                            ...(savedData.category && { category: savedData.category }),
                            ...(savedData.description && { description: savedData.description }),
                            ...(savedData.documentation && { documentation: savedData.documentation })
                        })

                        if (process.env.NODE_ENV === 'development') {
                            console.info(`Node ${node.data.name} initialized successfully with preserved data`)
                        }
                        return {
                            ...node,
                            data: initializedNodeData
                        }
                    } catch (error) {
                        console.error(`Failed to initialize node ${node.data.name}:`, error)
                        // Fallback: return original node to prevent data loss
                        return node
                    }
                })

                setNodes(initializedNodes)
                setEdges(initialFlow.edges || [])
                if (process.env.NODE_ENV === 'development') {
                    console.info(`Successfully initialized ${initializedNodes.length} nodes and ${initialFlow.edges?.length || 0} edges`)
                }

                // Set the flow as clean after successful load
                setTimeout(() => {
                    dispatch({ type: REMOVE_DIRTY })
                }, 100)
            } else if (initialFlow.nodes && initialFlow.nodes.length > 0) {
                // Component nodes not yet loaded - store raw nodes for later initialization
                if (process.env.NODE_ENV === 'development') {
                    console.info('Component templates not ready, storing nodes for later initialization...')
                }
                setNodes(initialFlow.nodes)
                setEdges(initialFlow.edges || [])
            } else {
                // Empty workflow
                if (process.env.NODE_ENV === 'development') {
                    console.info('Empty workflow loaded')
                }
                setNodes([])
                setEdges([])
            }

            dispatch({ type: SET_CHATFLOW, chatflow })
        } else if (getSpecificChatflowApi.error) {
            console.error('Failed to load chatflow:', getSpecificChatflowApi.error)
            errorFailed(`Failed to retrieve ${canvasTitle}: ${getSpecificChatflowApi.error.response.data.message}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificChatflowApi.data, getSpecificChatflowApi.error, getNodesApi.data])

    // Create new chatflow successful
    useEffect(() => {
        if (createNewChatflowApi.data) {
            const chatflow = createNewChatflowApi.data
            dispatch({ type: SET_CHATFLOW, chatflow })
            saveChatflowSuccess()
            window.history.replaceState(state, null, `/v2/agentcanvas/${chatflow.id}`)
        } else if (createNewChatflowApi.error) {
            errorFailed(`Failed to save ${canvasTitle}: ${createNewChatflowApi.error.response.data.message}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [createNewChatflowApi.data, createNewChatflowApi.error])

    // Update chatflow successful
    useEffect(() => {
        if (updateChatflowApi.data) {
            dispatch({ type: SET_CHATFLOW, chatflow: updateChatflowApi.data })
            saveChatflowSuccess()
        } else if (updateChatflowApi.error) {
            errorFailed(`Failed to save ${canvasTitle}: ${updateChatflowApi.error.response.data.message}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateChatflowApi.data, updateChatflowApi.error])

    useEffect(() => {
        setChatflow(canvasDataStore.chatflow)
        if (canvasDataStore.chatflow) {
            const flowData = canvasDataStore.chatflow.flowData ? JSON.parse(canvasDataStore.chatflow.flowData) : []
            checkIfSyncNodesAvailable(flowData.nodes || [])
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasDataStore.chatflow])

    // Initialization
    useEffect(() => {
        setIsSyncNodesButtonEnabled(false)
        if (chatflowId) {
            getSpecificChatflowApi.request(chatflowId)
        } else {
            if (localStorage.getItem('duplicatedFlowData')) {
                handleLoadFlow(localStorage.getItem('duplicatedFlowData'))
                setTimeout(() => localStorage.removeItem('duplicatedFlowData'), 0)
            } else {
                setNodes([])
                setEdges([])
            }
            dispatch({
                type: SET_CHATFLOW,
                chatflow: {
                    name: `Untitled ${canvasTitle}`
                }
            })
        }

        getNodesApi.request()

        // Clear dirty state before leaving and remove any ongoing test triggers and webhooks
        return () => {
            setTimeout(() => dispatch({ type: REMOVE_DIRTY }), 0)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setCanvasDataStore(canvas)
    }, [canvas])

    useEffect(() => {
        function handlePaste(e) {
            const pasteData = e.clipboardData.getData('text')
            //TODO: prevent paste event when input focused, temporary fix: catch chatflow syntax
            if (pasteData.includes('{"nodes":[') && pasteData.includes('],"edges":[')) {
                handleLoadFlow(pasteData)
            }
        }

        window.addEventListener('paste', handlePaste)

        return () => {
            window.removeEventListener('paste', handlePaste)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handlePaste])

    useEffect(() => {
        if (templateFlowData && templateFlowData.includes('"nodes":[') && templateFlowData.includes('],"edges":[')) {
            handleTemplateFlowSafely(templateFlowData)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateFlowData, handleTemplateFlowSafely])

    usePrompt('You have unsaved changes! Do you want to navigate away?', canvasDataStore.isDirty)

    const [chatPopupOpen, setChatPopupOpen] = useState(false)

    useEffect(() => {
        // Only create start node if we're creating a new flow (no chatflowId) and no duplicated flow data
        // Also check that we haven't already loaded a specific chatflow
        // EXPERT LEVEL: Intelligent start node creation with comprehensive safeguards
        const shouldCreateStartNode =
            !chatflowId && // New workflow (no ID)
            !localStorage.getItem('duplicatedFlowData') && // Not a duplicate
            getNodesApi.data?.length > 0 && // Component templates available
            nodes.length === 0 && // No existing nodes
            !getSpecificChatflowApi.data && // Not loading existing chatflow
            !getSpecificChatflowApi.loading // Not currently loading

        if (shouldCreateStartNode) {
            const startNodeTemplate = getNodesApi.data.find((node) => node.name === 'startAgentflow')
            if (startNodeTemplate) {
                if (process.env.NODE_ENV === 'development') {
                    console.info('Creating initial start node for new workflow...')
                }

                try {
                    const clonedTemplate = cloneDeep(startNodeTemplate)
                    const startNode = {
                        id: 'startAgentflow_0',
                        type: 'agentFlow',
                        position: { x: 100, y: 100 },
                        data: {
                            ...initNode(clonedTemplate, 'startAgentflow_0', true),
                            label: 'Start',
                            selected: false
                        }
                    }

                    setNodes([startNode])
                    setEdges([])
                    if (process.env.NODE_ENV === 'development') {
                        console.info('Start node created successfully')
                    }
                } catch (error) {
                    console.error('Failed to create start node:', error)
                }
            } else {
                console.warn('Start node template not found in component data')
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getNodesApi.data, chatflowId, nodes.length, getSpecificChatflowApi.data, getSpecificChatflowApi.loading])

    // EXPERT LEVEL: Advanced race condition handler with intelligent node detection
    useEffect(() => {
        // Only run if we have nodes and component templates are available
        if (!nodes.length || !getNodesApi.data?.length) return

        // Don't run if we're currently loading a specific chatflow (prevents race conditions)
        if (getSpecificChatflowApi.loading) return

        // Detect nodes that need re-initialization
        const uninitialized = nodes.filter((node) => {
            if (!node.data?.name) return false

            // Check if node lacks essential structure (indicates incomplete initialization)
            const lacksCriticalData =
                !node.data.inputAnchors ||
                !node.data.outputAnchors ||
                !node.data.inputParams ||
                !Array.isArray(node.data.inputAnchors) ||
                !Array.isArray(node.data.outputAnchors) ||
                !Array.isArray(node.data.inputParams)

            return lacksCriticalData
        })

        if (uninitialized.length === 0) return

        if (process.env.NODE_ENV === 'development') {
            if (process.env.NODE_ENV === 'development') {
                console.info(`Re-initializing ${uninitialized.length} incomplete nodes...`)
            }
        }

        const reinitializedNodes = nodes.map((node) => {
            // Skip nodes that are already properly initialized (check for arrays, not length)
            if (
                Array.isArray(node.data?.inputAnchors) &&
                Array.isArray(node.data?.outputAnchors) &&
                Array.isArray(node.data?.inputParams)
            ) {
                return node
            }

            // Skip nodes without valid data
            if (!node.data?.name) return node

            // Find component template
            const componentNode = getNodesApi.data.find((cn) => cn.name === node.data.name)
            if (!componentNode) {
                console.warn(`Component template missing for: ${node.data.name}`)
                return node
            }

            // Preserve all existing data
            const preservedData = {
                inputs: { ...node.data.inputs } || {},
                outputs: { ...node.data.outputs } || {},
                credential: node.data.credential || '',
                label: node.data.label || componentNode.label,
                selected: node.data.selected || false,
                // Preserve any additional properties
                ...(node.data.status && { status: node.data.status }),
                ...(node.data.category && { category: node.data.category }),
                ...(node.data.description && { description: node.data.description }),
                ...(node.data.documentation && { documentation: node.data.documentation })
            }

            try {
                // Create fresh initialized node
                const freshNodeData = initNode(cloneDeep(componentNode), node.id, true)

                // Carefully restore preserved data
                if (preservedData.inputs && typeof preservedData.inputs === 'object') {
                    Object.keys(preservedData.inputs).forEach((key) => {
                        if (freshNodeData.inputs && key in freshNodeData.inputs) {
                            freshNodeData.inputs[key] = preservedData.inputs[key]
                        }
                    })
                }

                if (preservedData.outputs && typeof preservedData.outputs === 'object') {
                    Object.keys(preservedData.outputs).forEach((key) => {
                        if (freshNodeData.outputs && key in freshNodeData.outputs) {
                            freshNodeData.outputs[key] = preservedData.outputs[key]
                        }
                    })
                }

                // Restore all other properties
                Object.assign(freshNodeData, {
                    credential: preservedData.credential,
                    label: preservedData.label,
                    selected: preservedData.selected,
                    ...(preservedData.status && { status: preservedData.status }),
                    ...(preservedData.category && { category: preservedData.category }),
                    ...(preservedData.description && { description: preservedData.description }),
                    ...(preservedData.documentation && { documentation: preservedData.documentation })
                })

                return {
                    ...node,
                    data: freshNodeData
                }
            } catch (error) {
                console.error(`Re-initialization failed for ${node.data.name}:`, error)
                return node
            }
        })

        setNodes(reinitializedNodes)
        if (process.env.NODE_ENV === 'development') {
            if (process.env.NODE_ENV === 'development') {
                console.info('Node re-initialization completed successfully')
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getNodesApi.data, nodes.length, getSpecificChatflowApi.loading])

    // ==============================|| Advanced Node Recovery System ||============================== //

    // EXPERT LEVEL: Comprehensive node recovery with automatic backup
    const nodeRecoverySystem = useCallback(() => {
        const currentNodes = reactFlowInstance?.getNodes() || []
        const currentEdges = reactFlowInstance?.getEdges() || []

        // Create backup of current state
        const backupData = {
            nodes: cloneDeep(currentNodes),
            edges: cloneDeep(currentEdges),
            timestamp: Date.now()
        }

        // Store backup in localStorage with expiration
        const backupKey = `flowise_node_backup_${chatflowId || 'new'}`
        localStorage.setItem(backupKey, JSON.stringify(backupData))

        // Clean old backups (keep only last 5)
        const allBackups = Object.keys(localStorage).filter((key) => key.startsWith('flowise_node_backup_'))
        if (allBackups.length > 5) {
            allBackups.sort()
            localStorage.removeItem(allBackups[0])
        }

        return backupData
    }, [reactFlowInstance, chatflowId])

    // EXPERT LEVEL: Smart node recovery from backup
    const recoverNodesFromBackup = useCallback(() => {
        try {
            const backupKey = `flowise_node_backup_${chatflowId || 'new'}`
            const backupData = localStorage.getItem(backupKey)

            if (!backupData) {
                console.warn('No backup data found for node recovery')
                return false
            }

            const parsed = JSON.parse(backupData)
            const { nodes: backupNodes, edges: backupEdges, timestamp } = parsed

            // Check if backup is recent (within last 5 minutes)
            const isRecentBackup = Date.now() - timestamp < 300000 // 5 minutes

            if (!isRecentBackup) {
                console.warn('Backup data is too old, skipping recovery')
                return false
            }

            if (backupNodes && backupNodes.length > 0) {
                if (process.env.NODE_ENV === 'development') {
                    console.info(`Recovering ${backupNodes.length} nodes from backup...`)
                }
                setNodes(backupNodes)
                setEdges(backupEdges || [])

                enqueueSnackbar({
                    message: `Recovered ${backupNodes.length} nodes from backup`,
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })

                return true
            }
        } catch (error) {
            console.error('Failed to recover nodes from backup:', error)
        }

        return false
    }, [chatflowId, setNodes, setEdges, enqueueSnackbar, closeSnackbar])

    // EXPERT LEVEL: Intelligent node disappearance detection
    const detectNodeDisappearance = useCallback(() => {
        const currentNodes = reactFlowInstance?.getNodes() || []
        const expectedNodeCount = nodes.length

        // If we suddenly lose more than 50% of nodes, trigger recovery
        if (expectedNodeCount > 0 && currentNodes.length < expectedNodeCount * 0.5) {
            console.warn(`Node disappearance detected! Expected: ${expectedNodeCount}, Current: ${currentNodes.length}`)

            // Attempt recovery
            const recovered = recoverNodesFromBackup()

            if (!recovered) {
                // If recovery fails, show warning to user
                enqueueSnackbar({
                    message: `Warning: ${expectedNodeCount - currentNodes.length} nodes may have been lost. Please check your workflow.`,
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'warning',
                        persist: true,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
            }
        }
    }, [reactFlowInstance, nodes.length, recoverNodesFromBackup, enqueueSnackbar, closeSnackbar])

    // EXPERT LEVEL: Enhanced save function with validation
    const handleSaveFlowWithValidation = useCallback(
        (chatflowName) => {
            if (!reactFlowInstance) {
                console.error('ReactFlow instance not available')
                return
            }

            const currentNodes = reactFlowInstance.getNodes()
            const currentEdges = reactFlowInstance.getEdges()

            // Validate nodes before saving
            const validationIssues = validateNodeIntegrity(currentNodes, 'pre-save')

            if (validationIssues.length > 0) {
                console.warn('Node validation issues detected before save:', validationIssues)
            }

            // Validate edges integrity
            if (currentEdges.length > 0) {
                const nodeIds = new Set(currentNodes.map((node) => node.id))
                const orphanedEdges = currentEdges.filter((edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target))

                if (orphanedEdges.length > 0) {
                    console.warn(`Found ${orphanedEdges.length} orphaned edges before save`)
                }
            }

            // Create backup before save
            nodeRecoverySystem()

            // Proceed with original save logic
            handleSaveFlow(chatflowName)
        },
        [reactFlowInstance, nodeRecoverySystem, handleSaveFlow]
    )

    // EXPERT LEVEL: Auto-save with node validation
    const autoSaveWithValidation = useCallback(() => {
        if (!chatflow?.id || !reactFlowInstance) return

        const currentNodes = reactFlowInstance.getNodes()

        // Only auto-save if we have valid nodes
        if (currentNodes.length > 0) {
            const validationIssues = validateNodeIntegrity(currentNodes, 'auto-save')

            if (validationIssues.length === 0) {
                // Create backup
                nodeRecoverySystem()

                // Perform auto-save
                const flowData = JSON.stringify(reactFlowInstance.toObject())
                const autoSaveData = {
                    flowData,
                    timestamp: Date.now(),
                    nodeCount: currentNodes.length
                }

                localStorage.setItem(`flowise_autosave_${chatflow.id}`, JSON.stringify(autoSaveData))
                if (process.env.NODE_ENV === 'development') {
                    console.info(`Auto-saved workflow with ${currentNodes.length} nodes`)
                }
            } else {
                console.warn('Skipping auto-save due to node validation issues')
            }
        }
    }, [chatflow?.id, reactFlowInstance, nodeRecoverySystem])

    // ==============================|| render ||============================== //

    // EXPERT LEVEL: React Error Boundary for Canvas
    const [hasError, setHasError] = useState(false)
    const [errorInfo, setErrorInfo] = useState(null)

    // EXPERT LEVEL: Error recovery handler
    const handleErrorRecovery = useCallback(() => {
        try {
            // Attempt to recover from backup
            const recovered = recoverNodesFromBackup()

            if (recovered) {
                setHasError(false)
                setErrorInfo(null)

                enqueueSnackbar({
                    message: 'Workflow recovered successfully from backup',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
            } else {
                // Reset to empty state
                setNodes([])
                setEdges([])
                setHasError(false)
                setErrorInfo(null)

                enqueueSnackbar({
                    message: 'Workflow reset to empty state. Please reload your saved workflow.',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'warning',
                        persist: true,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
            }
        } catch (error) {
            console.error('Error recovery failed:', error)
            // Force refresh as last resort
            window.location.reload()
        }
    }, [recoverNodesFromBackup, setNodes, setEdges, enqueueSnackbar, closeSnackbar])

    // EXPERT LEVEL: Global error handler for the canvas
    useEffect(() => {
        const handleError = (error) => {
            console.error('Canvas error detected:', error)
            setHasError(true)
            setErrorInfo(error.message || 'Unknown error occurred')

            // Create emergency backup
            nodeRecoverySystem()
        }

        const handleUnhandledRejection = (event) => {
            console.error('Unhandled promise rejection in canvas:', event.reason)
            handleError(event.reason)
        }

        window.addEventListener('error', handleError)
        window.addEventListener('unhandledrejection', handleUnhandledRejection)

        return () => {
            window.removeEventListener('error', handleError)
            window.removeEventListener('unhandledrejection', handleUnhandledRejection)
        }
    }, [nodeRecoverySystem])

    // EXPERT LEVEL: Enhanced onNodesChange with validation
    const onNodesChangeWithValidation = useCallback(
        (changes) => {
            // Create backup before major changes
            if (changes.some((change) => change.type === 'remove')) {
                nodeRecoverySystem()
            }

            // Apply changes
            _onNodesChange(changes)

            // Validate integrity after changes
            setTimeout(() => {
                const currentNodes = reactFlowInstance?.getNodes() || []
                if (currentNodes.length > 0) {
                    validateNodeIntegrity(currentNodes, 'post-change')
                }
            }, 100)

            // Mark as dirty
            setDirty()
        },
        [_onNodesChange, nodeRecoverySystem, reactFlowInstance, setDirty]
    )

    // EXPERT LEVEL: Enhanced onEdgesChange with validation
    const onEdgesChangeWithValidation = useCallback(
        (changes) => {
            // Create backup before major changes
            if (changes.some((change) => change.type === 'remove')) {
                nodeRecoverySystem()
            }

            // Apply changes
            _onEdgesChange(changes)

            // Mark as dirty
            setDirty()
        },
        [_onEdgesChange, nodeRecoverySystem, setDirty]
    )

    // EXPERT LEVEL: Node integrity monitoring with auto-recovery
    useEffect(() => {
        if (!reactFlowInstance) return

        const integrityCheckInterval = setInterval(() => {
            try {
                detectNodeDisappearance()
            } catch (error) {
                console.error('Node integrity check failed:', error)
            }
        }, 5000) // Check every 5 seconds

        return () => {
            clearInterval(integrityCheckInterval)
        }
    }, [reactFlowInstance, detectNodeDisappearance])

    // EXPERT LEVEL: Auto-save with validation every 30 seconds
    useEffect(() => {
        if (!chatflow?.id) return

        const autoSaveInterval = setInterval(() => {
            try {
                autoSaveWithValidation()
            } catch (error) {
                console.error('Auto-save failed:', error)
            }
        }, 30000) // Auto-save every 30 seconds

        return () => {
            clearInterval(autoSaveInterval)
        }
    }, [chatflow?.id, autoSaveWithValidation])

    // EXPERT LEVEL: Render error boundary UI
    const renderErrorBoundary = () => (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                padding: 3,
                textAlign: 'center'
            }}
        >
            <IconRefreshAlert size={48} color='error' />
            <h2>Workflow Error Detected</h2>
            <p>An error occurred while rendering the workflow canvas.</p>
            {errorInfo && (
                <pre
                    style={{
                        background: '#f5f5f5',
                        padding: '10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        maxWidth: '600px',
                        overflow: 'auto'
                    }}
                >
                    {errorInfo}
                </pre>
            )}
            <Button variant='contained' onClick={handleErrorRecovery} sx={{ mt: 2 }}>
                Recover Workflow
            </Button>
            <Button variant='outlined' onClick={() => window.location.reload()} sx={{ mt: 1 }}>
                Reload Page
            </Button>
        </Box>
    )

    if (hasError) {
        return renderErrorBoundary()
    }

    return (
        <>
            <span
                id='canvasConfetti'
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '0',
                    height: '0',
                    zIndex: 9999,
                    pointerEvents: 'none',
                    background: 'transparent'
                }}
            />

            <Box>
                <AppBar
                    enableColorOnDark
                    position='fixed'
                    color='inherit'
                    elevation={1}
                    sx={{
                        bgcolor: theme.palette.background.default
                    }}
                >
                    <Toolbar>
                        <CanvasHeader
                            chatflow={chatflow}
                            handleSaveFlow={handleSaveFlowWithValidation}
                            handleDeleteFlow={handleDeleteFlow}
                            handleLoadFlow={handleLoadFlow}
                            isAgentCanvas={true}
                            isAgentflowV2={true}
                        />
                    </Toolbar>
                </AppBar>
                <Box sx={{ pt: '70px', height: '100vh', width: '100%' }}>
                    <div className='reactflow-parent-wrapper'>
                        <div className='reactflow-wrapper' ref={reactFlowWrapper}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChangeWithValidation}
                                onNodeClick={onNodeClick}
                                onNodeDoubleClick={onNodeDoubleClick}
                                onEdgesChange={onEdgesChangeWithValidation}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                onNodeDragStop={setDirty}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                                onConnect={onConnect}
                                onInit={setReactFlowInstance}
                                fitView
                                deleteKeyCode={canvas.canvasDialogShow ? null : ['Delete']}
                                minZoom={0.5}
                                snapGrid={[25, 25]}
                                snapToGrid={isSnappingEnabled}
                                connectionLineComponent={ConnectionLine}
                            >
                                <Controls
                                    className={customization.isDarkMode ? 'dark-mode-controls' : ''}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                >
                                    <button
                                        className='react-flow__controls-button react-flow__controls-interactive'
                                        onClick={() => {
                                            setIsSnappingEnabled(!isSnappingEnabled)
                                        }}
                                        title='toggle snapping'
                                        aria-label='toggle snapping'
                                    >
                                        {isSnappingEnabled ? <IconMagnetFilled /> : <IconMagnetOff />}
                                    </button>
                                </Controls>
                                <MiniMap
                                    nodeStrokeWidth={3}
                                    nodeColor={customization.isDarkMode ? '#2d2d2d' : '#e2e2e2'}
                                    nodeStrokeColor={customization.isDarkMode ? '#525252' : '#fff'}
                                    maskColor={customization.isDarkMode ? 'rgb(45, 45, 45, 0.6)' : 'rgb(240, 240, 240, 0.6)'}
                                    style={{
                                        backgroundColor: customization.isDarkMode ? theme.palette.background.default : '#fff'
                                    }}
                                />
                                <Background color='#aaa' gap={16} />
                                <AddNodes
                                    isAgentCanvas={true}
                                    isAgentflowv2={true}
                                    nodesData={getNodesApi.data}
                                    node={selectedNode}
                                    onFlowGenerated={triggerConfetti}
                                />
                                <EditNodeDialog
                                    show={editNodeDialogOpen}
                                    dialogProps={editNodeDialogProps}
                                    onCancel={() => setEditNodeDialogOpen(false)}
                                />
                                {isSyncNodesButtonEnabled && (
                                    <Fab
                                        sx={{
                                            left: 60,
                                            top: 20,
                                            color: 'white',
                                            background: 'orange',
                                            '&:hover': {
                                                background: 'orange',
                                                backgroundImage: `linear-gradient(rgb(0 0 0/10%) 0 0)`
                                            }
                                        }}
                                        size='small'
                                        aria-label='sync'
                                        title='Sync Nodes'
                                        onClick={() => syncNodes()}
                                    >
                                        <IconRefreshAlert />
                                    </Fab>
                                )}
                                <ChatPopUp isAgentCanvas={true} chatflowid={chatflowId} onOpenChange={setChatPopupOpen} />
                                {!chatPopupOpen && <ValidationPopUp isAgentCanvas={true} chatflowid={chatflowId} />}
                            </ReactFlow>
                        </div>
                    </div>
                </Box>
                <ConfirmDialog />
            </Box>
        </>
    )
}

export default AgentflowCanvas
