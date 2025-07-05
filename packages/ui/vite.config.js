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
                '@': resolve(__dirname, 'src')
            }
        },
        optimizeDeps: {
            include: [
                'react',
                'react-dom',
                'react-router',
                'react-router-dom',
                '@mui/material',
                '@mui/system',
                '@mui/icons-material',
                'lodash',
                'axios',
                'formik',
                'yup'
            ],
            exclude: [
                // Exclude CodeMirror dependencies to prevent bundling issues
                '@codemirror/state',
                '@codemirror/view',
                '@codemirror/language',
                '@codemirror/lang-javascript',
                '@codemirror/lang-json',
                '@codemirror/lang-markdown',
                '@uiw/react-codemirror',
                '@uiw/codemirror-theme-vscode',
                '@uiw/codemirror-theme-sublime',
                '@lezer/common',
                '@lezer/highlight'
            ]
        },
        root: resolve(__dirname),
        build: {
            outDir: './build',
            rollupOptions: {
                output: {
                    manualChunks: (id) => {
                        // Bundle ALL React-dependent packages together to prevent context issues
                        if (
                            id.includes('react/') ||
                            id.includes('react\\') ||
                            id.includes('react-dom/') ||
                            id.includes('react-dom\\') ||
                            id.includes('react-router') ||
                            id.includes('@mui/')
                        ) {
                            return 'react-vendor'
                        }

                        // Keep CodeMirror dependencies separate to avoid bundling issues
                        if (
                            id.includes('@codemirror/') ||
                            id.includes('@uiw/react-codemirror') ||
                            id.includes('@uiw/codemirror-theme') ||
                            id.includes('@lezer/')
                        ) {
                            return undefined // Don't bundle CodeMirror - let browser handle natively
                        }

                        // Large utility libraries
                        if (id.includes('lodash')) {
                            return 'lodash'
                        }
                        if (id.includes('axios')) {
                            return 'axios'
                        }
                        if (id.includes('formik')) {
                            return 'formik'
                        }
                        if (id.includes('yup')) {
                            return 'yup'
                        }

                        // ReactFlow components
                        if (id.includes('reactflow') || id.includes('@reactflow/')) {
                            return 'reactflow'
                        }

                        // Other node_modules as vendor
                        if (id.includes('node_modules')) {
                            return 'vendor'
                        }

                        // Return undefined for app code (will be in main chunk)
                        return undefined
                    },
                    // Ensure proper chunk loading order
                    chunkFileNames: (chunkInfo) => {
                        const name = chunkInfo.name
                        if (name === 'react-vendor') return 'assets/react-vendor-[hash].js'
                        return 'assets/[name]-[hash].js'
                    }
                },
                // Ensure no externals in browser build - bundle everything
                external: () => false
            },
            // Increase chunk size warning limit
            chunkSizeWarningLimit: 1000,
            // Use ES modules for better tree shaking
            target: 'es2015',
            minify: 'terser',
            sourcemap: false,
            // Ensure proper module format
            lib: undefined,
            // Add more aggressive optimization
            terserOptions: {
                compress: {
                    drop_console: true,
                    drop_debugger: true
                }
            }
        },
        server: {
            open: true,
            proxy,
            port: process.env.VITE_PORT ?? 8080,
            host: process.env.VITE_HOST
        }
    }
})
