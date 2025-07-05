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
            include: ['react', 'react-dom'],
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
                '@lezer/highlight',
                // Exclude large libraries that may cause circular dependencies
                'lodash',
                'axios',
                'formik',
                'yup',
                'reactflow',
                '@mui/material',
                '@mui/system',
                '@mui/icons-material',
                'react-router',
                'react-router-dom',
                'react-redux',
                '@reduxjs/toolkit'
            ]
        },
        root: resolve(__dirname),
        build: {
            outDir: './build',
            rollupOptions: {
                output: {
                    manualChunks: (id) => {
                        // Only bundle React core together - avoid large vendor bundles
                        if (id.includes('react') && !id.includes('react-router') && !id.includes('react-redux')) {
                            return 'react-core'
                        }

                        // Don't bundle anything else to avoid circular dependencies
                        return undefined
                    },
                    // Ensure proper chunk loading order
                    chunkFileNames: (chunkInfo) => {
                        const name = chunkInfo.name
                        if (name === 'react-core') return 'assets/react-core-[hash].js'
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
            },
            // Add specific options to prevent circular dependency issues
            treeshake: {
                moduleSideEffects: false
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
