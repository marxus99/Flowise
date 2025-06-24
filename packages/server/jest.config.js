module.exports = {
    // Use ts-jest preset for testing TypeScript files with Jest
    preset: 'ts-jest/presets/default',
    // Set the test environment to Node.js
    testEnvironment: 'node',

    // Define the root directory for tests and modules
    roots: ['<rootDir>/test'],

    // Use ts-jest to transform TypeScript files with proper configuration
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: false,
                tsconfig: {
                    module: 'commonjs',
                    target: 'es2020'
                }
            }
        ]
    },

    // Regular expression to find test files
    testRegex: '((\\.|/)index\\.test)\\.tsx?$',

    // File extensions to recognize in module resolution
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

    // Display individual test results with the test suite hierarchy.
    verbose: true
}
