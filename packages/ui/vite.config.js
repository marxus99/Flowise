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
                '@codemirror/state',
                '@codemirror/view',
                '@codemirror/language',
                '@uiw/react-codemirror',
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
                        // Base React framework - keep completely separate
                        if (id.includes('react/') || id.includes('react\\')) {
                            return 'react-base'
                        }
                        if (id.includes('react-dom/') || id.includes('react-dom\\')) {
                            return 'react-dom-base'
                        }
                        if (id.includes('react-router')) {
                            return 'react-router-base'
                        }

                        // MUI components - separate by type
                        if (id.includes('@mui/material')) {
                            return 'mui-material'
                        }
                        if (id.includes('@mui/system')) {
                            return 'mui-system'
                        }
                        if (id.includes('@mui/icons-material')) {
                            return 'mui-icons'
                        }
                        if (id.includes('@mui/lab')) {
                            return 'mui-lab'
                        }
                        if (id.includes('@mui/x-')) {
                            return 'mui-x'
                        }

                        // Editor dependencies - completely isolated
                        if (id.includes('@codemirror/state')) {
                            return 'codemirror-state'
                        }
                        if (id.includes('@codemirror/view')) {
                            return 'codemirror-view'
                        }
                        if (id.includes('@codemirror/language')) {
                            return 'codemirror-language'
                        }
                        if (id.includes('@codemirror/lang-')) {
                            return 'codemirror-langs'
                        }
                        if (id.includes('@uiw/react-codemirror')) {
                            return 'uiw-codemirror'
                        }
                        if (id.includes('@uiw/codemirror-theme')) {
                            return 'uiw-themes'
                        }
                        if (id.includes('@lezer/')) {
                            return 'lezer'
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
                        if (name === 'react-base') return 'assets/react-base-[hash].js'
                        if (name === 'react-dom-base') return 'assets/react-dom-base-[hash].js'
                        if (name === 'react-router-base') return 'assets/react-router-base-[hash].js'
                        return 'assets/[name]-[hash].js'
                    }
                },
                // Ensure no externals in browser build
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
