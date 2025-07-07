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
        plugins: [
            react({
                // Enable fast refresh for better development experience
                fastRefresh: true,
                // Add babel plugins to handle potential import issues
                babel: {
                    plugins: [['@babel/plugin-proposal-private-property-in-object', { loose: true }]]
                }
            })
        ],
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src')
            }
        },
        define: {
            // Explicitly define globals to prevent initialization issues
            global: 'globalThis'
        },
        build: {
            outDir: './build',
            // Use more conservative chunk splitting to avoid circular dependencies
            rollupOptions: {
                output: {
                    // Simplified chunking strategy to prevent module loading issues
                    manualChunks: {
                        // Group vendor libraries together
                        vendor: ['react', 'react-dom'],
                        // Group UI libraries separately
                        ui: ['@mui/material', '@mui/icons-material', '@mui/lab'],
                        // Group flow-related libraries
                        flow: ['reactflow'],
                        // Group utility libraries
                        utils: ['lodash', 'axios', 'moment']
                    },
                    // Ensure proper chunk loading with consistent naming
                    chunkFileNames: 'assets/[name]-[hash].js',
                    entryFileNames: 'assets/[name]-[hash].js',
                    assetFileNames: 'assets/[name]-[hash].[ext]'
                },
                // Prevent external dependencies that could cause loading issues
                external: [],
                // Add treeshaking configuration to prevent unused imports
                treeshake: {
                    moduleSideEffects: true, // Keep side effects to prevent initialization issues
                    propertyReadSideEffects: false,
                    unknownGlobalSideEffects: false
                }
            },
            // Optimize chunk size
            chunkSizeWarningLimit: 1000,
            // Use reliable build target
            target: 'es2020',
            // Use esbuild for faster builds and better compatibility
            minify: 'esbuild',
            sourcemap: mode === 'development',
            // Ensure CSS is properly handled
            cssCodeSplit: false,
            // Add additional build optimizations
            assetsInlineLimit: 4096,
            // Ensure proper module format for web
            lib: undefined,
            // Configure manifest for better debugging
            manifest: true,
            // Add stability improvements
            commonjsOptions: {
                include: [/node_modules/],
                transformMixedEsModules: true
            }
        },
        // Enhanced optimizeDeps configuration to prevent loading issues
        optimizeDeps: {
            include: [
                'react',
                'react-dom',
                'react-router-dom',
                'react-redux',
                'redux',
                '@reduxjs/toolkit',
                '@mui/material',
                '@mui/icons-material',
                'reactflow',
                'lodash',
                'axios'
            ],
            // Force pre-bundling of problematic dependencies
            force: true,
            // Add esbuild options for better compatibility
            esbuildOptions: {
                target: 'es2020',
                // Handle JSX properly
                jsx: 'automatic',
                // Ensure proper module resolution
                mainFields: ['module', 'main'],
                // Add platform configuration
                platform: 'browser'
            }
        },
        server: {
            open: true,
            proxy,
            port: process.env.VITE_PORT ?? 8080,
            host: process.env.VITE_HOST,
            // Add cors configuration
            cors: true,
            // Improve HMR stability
            hmr: {
                overlay: false
            },
            // Add fs configuration to prevent access issues
            fs: {
                strict: false
            }
        },
        // Preview configuration for production builds
        preview: {
            port: process.env.VITE_PORT ?? 8080,
            host: process.env.VITE_HOST
        },
        // Add CSS configuration
        css: {
            devSourcemap: mode === 'development'
        },
        // Add proper environment variable handling
        envPrefix: 'VITE_',
        // Worker configuration
        worker: {
            format: 'es'
        }
    }
})
