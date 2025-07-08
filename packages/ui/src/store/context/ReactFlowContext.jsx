import { createContext, useState, useCallback, useRef } from 'react'
import { useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import { getUniqueNodeId, showHideInputParams } from '@/utils/genericHelper'
import { cloneDeep, isEqual } from 'lodash'
import { SET_DIRTY } from '@/store/actions'

const initialValue = {
    reactFlowInstance: null,
    setReactFlowInstance: () => {},
    duplicateNode: () => {},
    deleteNode: () => {},
    deleteEdge: () => {},
    onNodeDataChange: () => {},
    isReactFlowReady: false
}

export const flowContext = createContext(initialValue)

export const ReactFlowContext = ({ children }) => {
    const dispatch = useDispatch()
    const [reactFlowInstance, setReactFlowInstanceState] = useState(null)
    const [isReactFlowReady, setIsReactFlowReady] = useState(false)
    const initializationRef = useRef(false)

    // Enhanced setReactFlowInstance with initialization checks
    const setReactFlowInstance = useCallback((instance) => {
        try {
            if (instance && !initializationRef.current) {
                initializationRef.current = true
                setReactFlowInstanceState(instance)
                setIsReactFlowReady(true)
            } else if (!instance) {
                setReactFlowInstanceState(null)
                setIsReactFlowReady(false)
                initializationRef.current = false
            }
        } catch (error) {
            console.error('Error setting React Flow instance:', error)
            setReactFlowInstanceState(null)
            setIsReactFlowReady(false)
            initializationRef.current = false
        }
    }, [])

    const onAgentflowNodeStatusUpdate = useCallback(
        ({ nodeId, status, error }) => {
            if (!reactFlowInstance || !isReactFlowReady) {
                console.warn('React Flow instance not ready for node status update')
                return
            }

            try {
                reactFlowInstance.setNodes((nds) =>
                    nds.map((node) => {
                        if (node.id === nodeId) {
                            node.data = {
                                ...node.data,
                                status,
                                error
                            }
                        }
                        return node
                    })
                )
            } catch (err) {
                console.error('Error updating node status:', err)
            }
        },
        [reactFlowInstance, isReactFlowReady]
    )

    const clearAgentflowNodeStatus = useCallback(() => {
        if (!reactFlowInstance || !isReactFlowReady) {
            console.warn('React Flow instance not ready for clearing node status')
            return
        }

        try {
            reactFlowInstance.setNodes((nds) =>
                nds.map((node) => {
                    node.data = {
                        ...node.data,
                        status: undefined,
                        error: undefined
                    }
                    return node
                })
            )
        } catch (err) {
            console.error('Error clearing node status:', err)
        }
    }, [reactFlowInstance, isReactFlowReady])

    const onNodeDataChange = useCallback(
        ({ nodeId, inputParam, newValue }) => {
            if (!reactFlowInstance || !isReactFlowReady) {
                console.warn('React Flow instance not ready for node data change')
                return
            }

            try {
                const currentNodes = reactFlowInstance.getNodes() || []
                if (currentNodes.length === 0) {
                    console.warn('No nodes available for data change')
                    return
                }

                const updatedNodes = currentNodes.map((node) => {
                    if (node.id === nodeId) {
                        const updatedInputs = { ...node.data.inputs }
                        updatedInputs[inputParam.name] = newValue

                        const updatedInputParams = showHideInputParams({
                            ...node.data,
                            inputs: updatedInputs
                        })

                        // Remove inputs with display set to false
                        Object.keys(updatedInputs).forEach((key) => {
                            const input = updatedInputParams.find((param) => param.name === key)
                            if (input && input.display === false) {
                                delete updatedInputs[key]
                            }
                        })

                        return {
                            ...node,
                            data: {
                                ...node.data,
                                inputParams: updatedInputParams,
                                inputs: updatedInputs
                            }
                        }
                    }
                    return node
                })

                // Check if any node's inputParams have changed before updating
                const hasChanges = updatedNodes.some((node, index) => !isEqual(node.data.inputParams, currentNodes[index].data.inputParams))

                if (hasChanges) {
                    reactFlowInstance.setNodes(updatedNodes)
                }
            } catch (err) {
                console.error('Error changing node data:', err)
            }
        },
        [reactFlowInstance, isReactFlowReady]
    )

    const deleteConnectedInput = useCallback(
        (id, type) => {
            if (!reactFlowInstance || !isReactFlowReady) {
                return
            }

            try {
                const connectedEdges =
                    type === 'node'
                        ? (reactFlowInstance.getEdges() || []).filter((edge) => edge.source === id)
                        : (reactFlowInstance.getEdges() || []).filter((edge) => edge.id === id)

                for (const edge of connectedEdges) {
                    const targetNodeId = edge.target
                    const sourceNodeId = edge.source
                    const targetInput = edge.targetHandle.split('-')[2]

                    reactFlowInstance.setNodes((nds) =>
                        nds.map((node) => {
                            if (node.id === targetNodeId) {
                                let value
                                const inputAnchor = node.data.inputAnchors.find((ancr) => ancr.name === targetInput)
                                const inputParam = node.data.inputParams.find((param) => param.name === targetInput)

                                if (inputAnchor && inputAnchor.list) {
                                    const values = node.data.inputs[targetInput] || []
                                    value = values.filter((item) => !item.includes(sourceNodeId))
                                } else if (inputParam && inputParam.acceptVariable) {
                                    value = node.data.inputs[targetInput].replace(`{{${sourceNodeId}.data.instance}}`, '') || ''
                                } else {
                                    value = ''
                                }
                                node.data = {
                                    ...node.data,
                                    inputs: {
                                        ...node.data.inputs,
                                        [targetInput]: value
                                    }
                                }
                            }
                            return node
                        })
                    )
                }
            } catch (err) {
                console.error('Error deleting connected input:', err)
            }
        },
        [reactFlowInstance, isReactFlowReady]
    )

    const deleteNode = useCallback(
        (nodeid) => {
            if (!reactFlowInstance || !isReactFlowReady) {
                console.warn('React Flow instance not ready for node deletion')
                return
            }

            try {
                deleteConnectedInput(nodeid, 'node')

                // Gather all nodes to be deleted (parent and all descendants)
                const nodesToDelete = new Set()

                // Helper function to collect all descendant nodes recursively
                const collectDescendants = (parentId) => {
                    const childNodes = (reactFlowInstance.getNodes() || []).filter((node) => node.parentNode === parentId)

                    childNodes.forEach((childNode) => {
                        nodesToDelete.add(childNode.id)
                        collectDescendants(childNode.id)
                    })
                }

                // Collect all descendants first
                collectDescendants(nodeid)

                // Add the parent node itself last
                nodesToDelete.add(nodeid)

                // Clean up inputs for all nodes to be deleted
                nodesToDelete.forEach((id) => {
                    if (id !== nodeid) {
                        // Skip parent node as it's already processed at the beginning
                        deleteConnectedInput(id, 'node')
                    }
                })

                // Filter out all nodes and edges in a single operation
                reactFlowInstance.setNodes((nodes) => nodes.filter((node) => !nodesToDelete.has(node.id)))

                // Remove all edges connected to any of the deleted nodes
                reactFlowInstance.setEdges((edges) =>
                    edges.filter((edge) => !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target))
                )

                dispatch({ type: SET_DIRTY })
            } catch (err) {
                console.error('Error deleting node:', err)
            }
        },
        [reactFlowInstance, isReactFlowReady, dispatch, deleteConnectedInput]
    )

    const deleteEdge = useCallback(
        (edgeid) => {
            if (!reactFlowInstance || !isReactFlowReady) {
                console.warn('React Flow instance not ready for edge deletion')
                return
            }

            try {
                deleteConnectedInput(edgeid, 'edge')
                reactFlowInstance.setEdges((reactFlowInstance.getEdges() || []).filter((edge) => edge.id !== edgeid))
                dispatch({ type: SET_DIRTY })
            } catch (err) {
                console.error('Error deleting edge:', err)
            }
        },
        [reactFlowInstance, isReactFlowReady, dispatch, deleteConnectedInput]
    )

    const duplicateNode = useCallback(
        (id, distance = 50) => {
            if (!reactFlowInstance || !isReactFlowReady) {
                console.warn('React Flow instance not ready for node duplication')
                return
            }

            try {
                const nodes = reactFlowInstance.getNodes() || []
                const originalNode = nodes.find((n) => n.id === id)
                if (!originalNode) {
                    console.warn('Original node not found for duplication')
                    return
                }

                const newNodeId = getUniqueNodeId(originalNode.data, nodes)
                const clonedNode = cloneDeep(originalNode)

                const duplicatedNode = {
                    ...clonedNode,
                    id: newNodeId,
                    position: {
                        x: clonedNode.position.x + clonedNode.width + distance,
                        y: clonedNode.position.y
                    },
                    positionAbsolute: {
                        x: clonedNode.positionAbsolute.x + clonedNode.width + distance,
                        y: clonedNode.positionAbsolute.y
                    },
                    data: {
                        ...clonedNode.data,
                        id: newNodeId,
                        label: clonedNode.data.label + ` (${newNodeId.split('_').pop()})`
                    },
                    selected: false
                }

                const inputKeys = ['inputParams', 'inputAnchors']
                for (const key of inputKeys) {
                    const items = duplicatedNode.data[key] || []
                    for (const item of items) {
                        if (item.id) {
                            item.id = item.id.replace(id, newNodeId)
                        }
                    }
                }

                const outputKeys = ['outputAnchors']
                for (const key of outputKeys) {
                    const items = duplicatedNode.data[key] || []
                    for (const item of items) {
                        if (item.id) {
                            item.id = item.id.replace(id, newNodeId)
                        }
                        if (item.options) {
                            const options = item.options || []
                            for (const output of options) {
                                output.id = output.id.replace(id, newNodeId)
                            }
                        }
                    }
                }

                // Clear connected inputs
                const inputs = duplicatedNode.data.inputs || {}
                for (const inputName in inputs) {
                    if (typeof inputs[inputName] === 'string' && inputs[inputName].startsWith('{{') && inputs[inputName].endsWith('}}')) {
                        inputs[inputName] = ''
                    } else if (Array.isArray(inputs[inputName])) {
                        inputs[inputName] = (inputs[inputName] || []).filter(
                            (item) => !(typeof item === 'string' && item.startsWith('{{') && item.endsWith('}}'))
                        )
                    }
                }

                reactFlowInstance.setNodes([...nodes, duplicatedNode])
                dispatch({ type: SET_DIRTY })
            } catch (err) {
                console.error('Error duplicating node:', err)
            }
        },
        [reactFlowInstance, isReactFlowReady, dispatch]
    )

    return (
        <flowContext.Provider
            value={{
                reactFlowInstance,
                setReactFlowInstance,
                deleteNode,
                deleteEdge,
                duplicateNode,
                onAgentflowNodeStatusUpdate,
                clearAgentflowNodeStatus,
                onNodeDataChange,
                isReactFlowReady
            }}
        >
            {children}
        </flowContext.Provider>
    )
}

ReactFlowContext.propTypes = {
    children: PropTypes.any
}
