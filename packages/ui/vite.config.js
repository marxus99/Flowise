import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import dotenv from 'dotenv'

export default defineConfig(async ({ mode }) => {
    let proxy = undefined
    if (mode === 'development') {
        const serverEnv = dotenv.config({ processEnv: {}, path: '../server/.env' }).parsed
        const serverHost = serverEnv?.['HOST'] ?? 'localhost'
        const serverPort = parseInt(serverEnv?.['PORT'] ?? 3000)
        if (!Number.isNaN(serverPort) && serverPort > 0 && serverPort < 65535) {
            proxy = {
                '^/api(/|$).*': {
                    target: `http://${serverHost}:${serverPort}`,
                    changeOrigin: true
                }
            }
        }
    }

    dotenv.config()
    return {
        plugins: [react()],
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
                '@codemirror/state': resolve(__dirname, '../../node_modules/@codemirror/state'),
                '@codemirror/view': resolve(__dirname, '../../node_modules/@codemirror/view'),
                '@codemirror/language': resolve(__dirname, '../../node_modules/@codemirror/language'),
                '@codemirror/lang-javascript': resolve(__dirname, '../../node_modules/@codemirror/lang-javascript'),
                '@codemirror/lang-json': resolve(__dirname, '../../node_modules/@codemirror/lang-json'),
                '@uiw/react-codemirror': resolve(__dirname, '../../node_modules/@uiw/react-codemirror'),
                '@uiw/codemirror-theme-vscode': resolve(__dirname, '../../node_modules/@uiw/codemirror-theme-vscode'),
                '@uiw/codemirror-theme-sublime': resolve(__dirname, '../../node_modules/@uiw/codemirror-theme-sublime'),
                '@lezer/common': resolve(__dirname, '../../node_modules/@lezer/common'),
                '@lezer/highlight': resolve(__dirname, '../../node_modules/@lezer/highlight')
            }
        },
        root: resolve(__dirname),
        build: {
            outDir: './build',
            rollupOptions: {
                output: {
                    manualChunks: {
                        // Split React and React-DOM into separate chunks to avoid circular deps
                        'react-core': ['react'],
                        'react-dom-core': ['react-dom'],
                        'react-router': ['react-router', 'react-router-dom'],
                        // MUI components
                        'mui-core': ['@mui/material', '@mui/system'],
                        'mui-icons': ['@mui/icons-material'],
                        'mui-lab': ['@mui/lab'],
                        'mui-x': ['@mui/x-data-grid', '@mui/x-tree-view'],
                        // Editor dependencies
                        codemirror: ['@codemirror/state', '@codemirror/view', '@codemirror/language'],
                        'codemirror-lang': ['@codemirror/lang-javascript', '@codemirror/lang-json'],
                        'uiw-codemirror': ['@uiw/react-codemirror', '@uiw/codemirror-theme-vscode', '@uiw/codemirror-theme-sublime'],
                        lezer: ['@lezer/common', '@lezer/highlight'],
                        // Other large dependencies
                        lodash: ['lodash'],
                        formik: ['formik'],
                        yup: ['yup'],
                        axios: ['axios'],
                        // Reactflow
                        reactflow: ['reactflow', '@reactflow/core', '@reactflow/node-resizer']
                    }
                },
                // Prevent circular dependencies
                external: (_id) => {
                    // Don't bundle these as external in the browser build
                    return false
                }
            },
            // Increase chunk size warning limit since we're splitting more
            chunkSizeWarningLimit: 1000,
            // Ensure proper module format
            target: 'esnext',
            minify: 'terser',
            sourcemap: false
        },
        server: {
            open: true,
            proxy,
            port: process.env.VITE_PORT ?? 8080,
            host: process.env.VITE_HOST
        }
    }
})
