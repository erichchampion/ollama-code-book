/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  globalTeardown: '<rootDir>/tests/global-teardown.js',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts',
    '**/tests/**/*.test.cjs',
    '**/tests/**/*.spec.cjs',
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.js'
  ],
  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '**/tests/*.test.js',
        '**/tests/unit/**/*.test.js',
        '**/tests/unit/**/*.test.ts',
        '**/tests/unit/**/*.test.cjs',
        '**/__tests__/**/*.test.ts',
        '**/__tests__/**/*.test.js'
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        'startup-optimizer.test.cjs', // Excluded - performance-sensitive test
        'predictive-ai-cache.test.cjs', // Excluded - memory-intensive test
        'optimization-components.test.cjs', // Excluded - flaky under load
        'code-knowledge-graph.test.cjs' // Excluded - cache timing-sensitive test
      ],
      testEnvironment: 'node',
      testTimeout: 30000, // 30 seconds for unit tests
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts'],
      transform: {
        '^.+\\.js$': 'babel-jest',
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            module: 'ESNext',
            moduleResolution: 'node',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true
          }
        }]
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      transformIgnorePatterns: [
        'node_modules/(?!(.*\\.mjs$))'
      ]
    },
    // Separate integration test projects for better isolation
    {
      displayName: 'integration:optimization-migration',
      testMatch: ['**/tests/integration/optimization-migration.test.js'],
      testEnvironment: 'node',
      testTimeout: 120000,
      maxWorkers: 1,
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts'],
      transform: {
        '^.+\\.js$': 'babel-jest',
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            module: 'ESNext',
            moduleResolution: 'node',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true
          }
        }]
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))']
    },
    {
      displayName: 'integration:performance',
      testMatch: ['**/tests/integration/performance-integration.test.cjs'],
      testEnvironment: 'node',
      testTimeout: 120000,
      maxWorkers: 1,
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts'],
      transform: {
        '^.+\\.js$': 'babel-jest',
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            module: 'ESNext',
            moduleResolution: 'node',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true
          }
        }]
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))']
    },
    {
      displayName: 'integration:other',
      testMatch: [
        '**/tests/integration/**/*.test.js',
        '**/tests/integration/**/*.test.cjs'
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        'optimization-migration.test.js',
        'performance-integration.test.cjs',
        'streaming-tools.test.js',
        'enhanced-component-factory.test.cjs' // Excluded - timing-sensitive test
      ],
      testEnvironment: 'node',
      testTimeout: 120000,
      maxWorkers: 1,
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts'],
      transform: {
        '^.+\\.js$': 'babel-jest',
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            module: 'ESNext',
            moduleResolution: 'node',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true
          }
        }]
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))']
    },
    {
      displayName: 'performance:unit',
      testMatch: [
        '**/tests/unit/startup-optimizer.test.cjs',
        '**/tests/unit/predictive-ai-cache.test.cjs',
        '**/tests/unit/optimization-components.test.cjs',
        '**/tests/unit/code-knowledge-graph.test.cjs',
        '**/tests/integration/enhanced-component-factory.test.cjs'
      ],
      testEnvironment: 'node',
      testTimeout: 60000, // 60 seconds for resource-intensive tests
      maxWorkers: 1 // Run serially to avoid resource contention
    },
    {
      displayName: 'docs',
      testMatch: ['**/tests/docs/*.test.cjs'],
      testEnvironment: 'node'
    },
    {
      displayName: 'security',
      testMatch: ['**/tests/security/*.test.js'],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        'basic-security.test.js' // Excluded - flaky under load, moved to performance:unit
      ],
      testEnvironment: 'node',
      testTimeout: 60000,
      maxWorkers: 1,
      transform: {
        '^.+\\.js$': 'babel-jest'
      }
    },
    {
      displayName: 'security:flaky',
      testMatch: ['**/tests/security/basic-security.test.js'],
      testEnvironment: 'node',
      testTimeout: 90000, // Extra time for flaky tests
      maxWorkers: 1,
      transform: {
        '^.+\\.js$': 'babel-jest'
      }
    }
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: false,
  silent: false,
  testTimeout: 30000,
  maxWorkers: 1,
  detectOpenHandles: true,
  forceExit: true,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  setupFiles: ['<rootDir>/tests/setup.js']
};
