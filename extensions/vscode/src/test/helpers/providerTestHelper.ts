/**
 * Provider Test Helper Utilities
 * Shared mocks, fixtures, and utilities for VS Code provider testing
 */

import * as assert from 'assert';
import * as fs from 'fs';
import { OllamaCodeClient } from '../../client/ollamaCodeClient';
import { Logger } from '../../utils/logger';

/**
 * AI Response Fixtures for Testing
 * Centralized test data to eliminate duplication across provider tests
 */
export const AI_RESPONSE_FIXTURES = {
  completion: {
    assignment: 'calculateSum(a, b);',
    functionBody: 'return a + b;',
    methodAccess: 'getName()',
    import: "{ useState, useEffect } from 'react';",
    ifStatement: 'x > 0) {\n  console.log(x);\n}',
    forLoop: 'let i = 0; i < arr.length; i++) {\n  process(arr[i]);\n}',
    default: '// AI completion'
  },
  explanation: {
    calculateSum: 'Adds two numbers together and returns the result. Takes parameters `a` and `b` (numbers) and returns their sum.',
    userService: 'A service class that manages user-related operations. Provides methods for user CRUD operations and authentication.',
    apiUrl: 'Configuration constant that stores the base URL for the API endpoint.',
    getName: "Returns the user's full name as a formatted string.",
    asyncFunction: 'Asynchronous function that fetches data from a remote source. Returns a Promise that resolves with the data.',
    default: 'Documentation for element: This is a code element.'
  },
  diagnostic: {
    analysis: 'LINE 3: [WARNING] Potential null pointer exception\nLINE 5: [INFO] Consider using const instead of let'
  },
  chat: {
    greeting: 'Hello! How can I help you today?',
    help: 'I can assist with code generation, debugging, refactoring, and more!',
    create: 'Sure! I can help you create that. What specific functionality do you need?',
    debug: 'Let me analyze the error. Can you provide the error message or stack trace?',
    explain: 'I\'d be happy to explain that. This code does the following...',
    default: 'I understand. Let me help you with that.'
  }
} as const;

/**
 * Create a mock Ollama client for testing
 * @param connected - Whether the client should report as connected
 * @param aiRequestHandler - Optional custom AI request handler
 * @returns Mock OllamaCodeClient instance
 */
export function createMockOllamaClient(
  connected: boolean = true,
  aiRequestHandler?: (request: any) => Promise<any>
): OllamaCodeClient {
  const client: any = {
    getConnectionStatus: () => ({
      connected,
      model: connected ? 'test-model' : null
    })
  };

  if (aiRequestHandler) {
    client.sendAIRequest = aiRequestHandler;
  }

  return client as OllamaCodeClient;
}

/**
 * Create a standard AI request handler for inline completion testing
 * @returns AI request handler function
 */
export function createCompletionAIHandler() {
  return async (request: any) => {
    if (request.type === 'completion') {
      const prompt = request.prompt.toLowerCase();

      if (prompt.includes('const result =')) {
        return { result: AI_RESPONSE_FIXTURES.completion.assignment };
      } else if (prompt.includes('function add')) {
        return { result: AI_RESPONSE_FIXTURES.completion.functionBody };
      } else if (prompt.includes('user.')) {
        return { result: AI_RESPONSE_FIXTURES.completion.methodAccess };
      } else if (prompt.includes('import')) {
        return { result: AI_RESPONSE_FIXTURES.completion.import };
      } else if (prompt.includes('if (')) {
        return { result: AI_RESPONSE_FIXTURES.completion.ifStatement };
      } else if (prompt.includes('for (')) {
        return { result: AI_RESPONSE_FIXTURES.completion.forLoop };
      } else {
        return { result: AI_RESPONSE_FIXTURES.completion.default };
      }
    }
    return { result: '' };
  };
}

/**
 * Create a standard AI request handler for hover provider testing
 * @returns AI request handler function
 */
export function createHoverAIHandler() {
  return async (request: any) => {
    if (request.type === 'explanation') {
      const prompt = request.prompt.toLowerCase();

      if (prompt.includes('calculatesum')) {
        return { result: AI_RESPONSE_FIXTURES.explanation.calculateSum };
      } else if (prompt.includes('userservice')) {
        return { result: AI_RESPONSE_FIXTURES.explanation.userService };
      } else if (prompt.includes('api_url')) {
        return { result: AI_RESPONSE_FIXTURES.explanation.apiUrl };
      } else if (prompt.includes('getname')) {
        return { result: AI_RESPONSE_FIXTURES.explanation.getName };
      } else if (prompt.includes('async')) {
        return { result: AI_RESPONSE_FIXTURES.explanation.asyncFunction };
      } else {
        const elementName = request.prompt.split('"')[1] || 'element';
        return { result: `${AI_RESPONSE_FIXTURES.explanation.default.replace('element', elementName)}` };
      }
    }
    return { result: '' };
  };
}

/**
 * Create a standard AI request handler for diagnostic provider testing
 * @returns AI request handler function
 */
export function createDiagnosticAIHandler() {
  return async (request: any) => {
    if (request.type === 'completion' && request.prompt.includes('Analyze')) {
      return { result: AI_RESPONSE_FIXTURES.diagnostic.analysis };
    }
    return { result: '' };
  };
}

/**
 * Create a standard AI request handler for chat panel testing
 * @returns AI request handler function
 */
export function createChatAIHandler() {
  return async (request: any) => {
    if (request.type === 'chat') {
      const prompt = request.prompt.toLowerCase();

      if (prompt.includes('hello') || prompt.includes('hi')) {
        return { result: AI_RESPONSE_FIXTURES.chat.greeting };
      } else if (prompt.includes('help')) {
        return { result: AI_RESPONSE_FIXTURES.chat.help };
      } else if (prompt.includes('create') || prompt.includes('generate')) {
        return { result: AI_RESPONSE_FIXTURES.chat.create };
      } else if (prompt.includes('bug') || prompt.includes('error')) {
        return { result: AI_RESPONSE_FIXTURES.chat.debug };
      } else if (prompt.includes('explain')) {
        return { result: AI_RESPONSE_FIXTURES.chat.explain };
      } else {
        return { result: AI_RESPONSE_FIXTURES.chat.default };
      }
    }
    return { result: '' };
  };
}

/**
 * Create a mock logger for testing
 * @returns Mock Logger instance
 */
export function createMockLogger(): Logger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    log: () => {},
    show: () => {},
    setLevel: () => {},
    outputChannel: null,
    logLevel: 'info'
  } as any as Logger;
}

/**
 * Test Data Constants
 * Magic numbers used in tests, centralized for maintainability
 */
export const TEST_DATA_CONSTANTS = {
  /** Number of functions to create for stress testing */
  STRESS_TEST_FUNCTION_COUNT: 20,

  /** Number of lines to create for long function tests (> LONG_FUNCTION_LINES threshold) */
  LONG_FUNCTION_LINE_COUNT: 35,

  /** Number of rapid messages to send for concurrency testing */
  RAPID_MESSAGE_COUNT: 50,

  /** Message count for concurrent processing tests */
  CONCURRENT_MESSAGE_COUNT: 10,

  /** Chat test message counts */
  CHAT_TEST_COUNTS: {
    /** Single exchange: 1 user message + 1 assistant response */
    SINGLE_EXCHANGE: 2,
    /** Double exchange: 2 user messages + 2 assistant responses */
    DOUBLE_EXCHANGE: 4,
    /** Triple exchange: 3 user messages + 3 assistant responses */
    TRIPLE_EXCHANGE: 6,
    /** Number of user messages in a triple exchange */
    TRIPLE_USER_MESSAGES: 3,
    /** Number of assistant messages in a triple exchange */
    TRIPLE_ASSISTANT_MESSAGES: 3
  },

  /** Test timing delays */
  DELAYS: {
    /** Milliseconds to ensure distinct timestamps in chronological tests */
    TIMESTAMP_DIFFERENTIATION: 10,
    /** Milliseconds spacing for rapid message tests */
    RAPID_MESSAGE_SPACING: 5
  },

  /** File operation test constants */
  FILE_OPERATION_CONSTANTS: {
    /** Minimum depth for deep path tests */
    MIN_DEEP_PATH_DEPTH: 4,
    /** Maximum file name length for validation */
    MAX_FILE_NAME_LENGTH: 255,
    /** Line count for large file tests (exceeds 1000 line threshold) */
    LARGE_FILE_LINE_COUNT: 1100,
    /** File permissions for testing */
    PERMISSIONS: {
      READ_ONLY: 0o444,
      READ_WRITE: 0o644
    }
  }
} as const;

/**
 * File extension to language mapping
 * Used for language detection in file operation commands
 */
export const FILE_EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  '.js': 'JavaScript',
  '.ts': 'TypeScript',
  '.jsx': 'React JSX',
  '.tsx': 'React TSX',
  '.py': 'Python',
  '.java': 'Java',
  '.go': 'Go',
  '.rs': 'Rust',
  '.md': 'Markdown',
  '.json': 'JSON',
  '.html': 'HTML',
  '.css': 'CSS',
  '.cpp': 'C++',
  '.c': 'C',
  '.rb': 'Ruby',
  '.php': 'PHP'
} as const;

/**
 * Detect programming language from file extension
 * @param extension - File extension (e.g., '.js', '.ts')
 * @returns Language name or 'text' if unknown
 */
export function detectLanguageFromExtension(extension: string): string {
  return FILE_EXTENSION_LANGUAGE_MAP[extension] || 'text';
}

/**
 * File generation templates for testing
 * Centralized templates to eliminate duplication across command tests
 */
export const FILE_GENERATION_TEMPLATES = {
  javascript: {
    fallback: (fileName: string, description: string) =>
      `// ${description}\n\nfunction ${fileName}() {\n  // TODO: Implement ${description}\n}\n\nmodule.exports = { ${fileName} };\n`,
    generated: (functionName = 'example') =>
      `// Generated JavaScript file\nfunction ${functionName}() {\n  console.log('Hello World');\n}\n\nmodule.exports = { ${functionName} };\n`
  },
  typescript: {
    fallback: (fileName: string, description: string) =>
      `// ${description}\n\nexport function ${fileName}(): void {\n  // TODO: Implement ${description}\n}\n`,
    generated: () =>
      `// Generated TypeScript file\nexport function example(): void {\n  console.log('Hello World');\n}\n`
  },
  reactTsx: {
    fallback: (componentName: string, description: string) =>
      `import React from 'react';\n\ninterface ${componentName}Props {\n  // Add props here\n}\n\nexport const ${componentName}: React.FC<${componentName}Props> = (props) => {\n  return (\n    <div>\n      {/* ${description} */}\n    </div>\n  );\n};\n`,
    generated: (componentName = 'Example') =>
      `import React from 'react';\n\ninterface ${componentName}Props {\n  title: string;\n}\n\nexport const ${componentName}: React.FC<${componentName}Props> = ({ title }) => {\n  return <div>{title}</div>;\n};\n`
  },
  python: {
    fallback: (fileName: string, description: string) =>
      `"""${description}"""\n\ndef ${fileName}():\n    """TODO: Implement ${description}"""\n    pass\n`,
    generated: () =>
      `"""Generated Python file"""\n\ndef example():\n    print("Hello World")\n`
  },
  test: {
    generated: () =>
      `import { describe, it, expect } from '@jest/globals';\n\ndescribe('Example Test', () => {\n  it('should pass', () => {\n    expect(true).toBe(true);\n  });\n});\n`
  },
  generic: {
    fallback: (description: string) => `# ${description}\n`,
    generated: (prompt: string) => `// ${prompt}\n`
  }
} as const;

/**
 * Create a file generation AI handler for testing
 * @returns AI request handler function
 */
export function createFileGenerationHandler() {
  return async (request: any) => {
    if (request.type === 'generate') {
      const { context } = request;

      if (context.language === 'JavaScript') {
        return { result: FILE_GENERATION_TEMPLATES.javascript.generated() };
      } else if (context.language === 'TypeScript') {
        return { result: FILE_GENERATION_TEMPLATES.typescript.generated() };
      } else if (context.language === 'React TSX') {
        return { result: FILE_GENERATION_TEMPLATES.reactTsx.generated() };
      } else if (context.template === 'test') {
        return { result: FILE_GENERATION_TEMPLATES.test.generated() };
      } else {
        return { result: FILE_GENERATION_TEMPLATES.generic.generated(request.prompt) };
      }
    }
    return { result: '' };
  };
}

/**
 * Code transformation templates for edit operations
 * Centralized edit transformations to eliminate duplication
 */
export const CODE_EDIT_TEMPLATES = {
  addFunction: {
    calculateSum: '\n\n/**\n * Calculate sum of two numbers\n */\nfunction calculateSum(a, b) {\n  return a + b;\n}\n\nmodule.exports = { calculateSum };\n'
  },
  jsdoc: {
    regex: /function (\w+)\(/g,
    replacement: '/**\n * Description for $1\n */\nfunction $1('
  },
  typescript: {
    functionAnnotation: /function (\w+)\(([^)]*)\)/g,
    functionReplacement: 'function $1($2): void',
    exportsRegex: /module\.exports/g,
    exportsReplacement: 'export'
  },
  refactor: {
    consoleToLogger: {
      regex: /console\.log/g,
      replacement: 'logger.info'
    }
  },
  comments: {
    addTop: (content: string) => '// Added comment\n' + content,
    addAI: (content: string) => '// Edited by AI\n' + content
  }
} as const;

/**
 * Create edit handler for file editing tests
 * @returns AI request handler for edit operations
 */
export function createEditHandler() {
  return async (request: any) => {
    if (request.type === 'edit') {
      const { prompt, context } = request;
      const { originalContent } = context;
      const lowerPrompt = prompt.toLowerCase();

      // Add function
      if (lowerPrompt.includes('add function calculatesum')) {
        return { result: originalContent + CODE_EDIT_TEMPLATES.addFunction.calculateSum };
      }

      // Add JSDoc
      if (lowerPrompt.includes('add jsdoc')) {
        return {
          result: originalContent.replace(
            CODE_EDIT_TEMPLATES.jsdoc.regex,
            CODE_EDIT_TEMPLATES.jsdoc.replacement
          )
        };
      }

      // Convert to TypeScript
      if (lowerPrompt.includes('convert to typescript')) {
        return {
          result: originalContent
            .replace(
              CODE_EDIT_TEMPLATES.typescript.functionAnnotation,
              CODE_EDIT_TEMPLATES.typescript.functionReplacement
            )
            .replace(
              CODE_EDIT_TEMPLATES.typescript.exportsRegex,
              CODE_EDIT_TEMPLATES.typescript.exportsReplacement
            )
        };
      }

      // Refactor
      if (lowerPrompt.includes('refactor')) {
        return {
          result: originalContent.replace(
            CODE_EDIT_TEMPLATES.refactor.consoleToLogger.regex,
            CODE_EDIT_TEMPLATES.refactor.consoleToLogger.replacement
          )
        };
      }

      // Add comment
      if (lowerPrompt.includes('add comment')) {
        return { result: CODE_EDIT_TEMPLATES.comments.addTop(originalContent) };
      }

      // Default
      return { result: CODE_EDIT_TEMPLATES.comments.addAI(originalContent) };
    }
    return { result: '' };
  };
}

/**
 * Command Test Assertion Helpers
 * Shared assertion functions for file operation command tests
 */

export function assertCommandSuccess(result: any, filePath: string): void {
  assert.strictEqual(result.success, true, 'Command should succeed');
  assert.strictEqual(result.filePath, filePath, 'Should return correct file path');
}

export function assertFileExists(filePath: string): void {
  assert.ok(fs.existsSync(filePath), 'File should exist');
}

export function assertFileContains(
  filePath: string,
  patterns: string | string[],
  description?: string
): void {
  const content = fs.readFileSync(filePath, 'utf8');
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];

  patternArray.forEach(pattern => {
    assert.ok(
      content.includes(pattern),
      description || `File should contain: ${pattern}`
    );
  });
}

export function assertFileDoesNotContain(
  filePath: string,
  pattern: string,
  description?: string
): void {
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(
    !content.includes(pattern),
    description || `File should not contain: ${pattern}`
  );
}

/**
 * Assert that in-memory code contains specified patterns
 * Used for checking generated code before it's written to a file
 */
export function assertCodeContains(
  code: string,
  patterns: string | string[],
  description?: string
): void {
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];

  patternArray.forEach(pattern => {
    assert.ok(
      code.includes(pattern),
      description || `Code should contain: ${pattern}`
    );
  });
}

/**
 * Code generation templates for testing
 * Centralized templates for multi-framework code generation
 */
export const CODE_GENERATION_TEMPLATES = {
  express: {
    api: `const express = require('express');
const router = express.Router();

/**
 * GET endpoint - Retrieve data
 */
router.get('/data', async (req, res) => {
  try {
    // TODO: Implement data retrieval
    const data = { message: 'Success' };
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST endpoint - Create data
 */
router.post('/data', async (req, res) => {
  try {
    // TODO: Implement data creation
    const result = req.body;
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
`,
    simple: `const express = require('express');
const app = express();

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000);`
  },
  react: {
    component: (componentName: string, description: string) => `import React from 'react';

interface ${componentName}Props {
  title: string;
  onAction?: () => void;
}

/**
 * ${componentName} component
 * ${description}
 */
export const ${componentName}: React.FC<${componentName}Props> = ({ title, onAction }) => {
  const handleClick = () => {
    if (onAction) {
      onAction();
    }
  };

  return (
    <div className="${componentName.toLowerCase()}">
      <h2>{title}</h2>
      <button onClick={handleClick}>Click Me</button>
    </div>
  );
};
`,
    simple: `import React from 'react';

export const Component: React.FC = () => {
  return <div>Hello World</div>;
};`
  },
  python: {
    class: (description: string) => `"""
${description}
"""

from typing import Optional, List

class DataProcessor:
    """Process and manage data operations"""

    def __init__(self, name: str):
        """
        Initialize DataProcessor

        Args:
            name: Processor name
        """
        self.name = name
        self.data: List[dict] = []

    def process(self, item: dict) -> dict:
        """
        Process a single item

        Args:
            item: Data item to process

        Returns:
            Processed item
        """
        # TODO: Implement processing logic
        return item

    def get_data(self) -> List[dict]:
        """
        Retrieve all data

        Returns:
            List of data items
        """
        return self.data
`,
    simple: `class Calculator:
    def add(self, a: int, b: int) -> int:
        return a + b`
  },
  vue: {
    component: `<template>
  <div>{{ message }}</div>
</template>

<script>
export default {
  data() {
    return {
      message: 'Hello Vue'
    };
  }
};
</script>`
  },
  generic: {
    function: `// Generated code\nfunction example() {\n  console.log('Hello');\n}\n`,
    fallback: (description: string) => `// Generated code for: ${description}\n// TODO: Implement functionality\n`
  }
} as const;

/**
 * Code generation constants
 */
export const CODE_GENERATION_CONSTANTS = {
  DEFAULT_LANGUAGE: 'javascript',
  DEFAULT_COMPONENT_NAME: 'GeneratedComponent'
} as const;

/**
 * Extract name from description (e.g., "Button component" -> "Button")
 */
export function extractNameFromDescription(
  description: string,
  suffix: string = 'component',
  defaultName: string = 'Generated'
): string {
  const regex = new RegExp(`(\\w+)\\s+${suffix}`, 'i');
  const match = description.match(regex);

  if (match) {
    return match[1].charAt(0).toUpperCase() + match[1].slice(1);
  }

  return defaultName + suffix.charAt(0).toUpperCase() + suffix.slice(1);
}

/**
 * Create code generation handler for testing
 */
export function createCodeGenerationHandler() {
  return async (request: any) => {
    if (request.type === 'generate-code') {
      const { prompt, context } = request;
      const lowerPrompt = prompt.toLowerCase();

      // Express API
      if (lowerPrompt.includes('rest api') || lowerPrompt.includes('express')) {
        return { result: CODE_GENERATION_TEMPLATES.express.simple };
      }

      // React component
      if (context.framework?.toLowerCase() === 'react' || lowerPrompt.includes('react')) {
        return { result: CODE_GENERATION_TEMPLATES.react.simple };
      }

      // Python
      if (context.language?.toLowerCase() === 'python' || lowerPrompt.includes('python')) {
        return { result: CODE_GENERATION_TEMPLATES.python.simple };
      }

      // Vue component
      if (context.framework?.toLowerCase() === 'vue') {
        return { result: CODE_GENERATION_TEMPLATES.vue.component };
      }

      // Default
      return { result: CODE_GENERATION_TEMPLATES.generic.function };
    }
    return { result: '' };
  };
}

/**
 * Test generation constants
 */
export const TEST_GENERATION_CONSTANTS = {
  DEFAULT_FRAMEWORK: 'jest',
  DEFAULT_COVERAGE: 'basic',
  DEFAULT_FUNCTION_NAME: 'example',
  DEFAULT_COMPONENT_NAME: 'Component',
  FALLBACK_TEST_TEMPLATE: '// Generated test file\n// TODO: Implement tests\n',

  FRAMEWORK_EXTENSIONS: {
    REACT: ['.jsx', '.tsx'],
    JAVASCRIPT: ['.js', '.ts'],
    TYPESCRIPT: ['.ts', '.tsx']
  },

  FRAMEWORK_KEYWORDS: {
    REACT: ['component', 'Component'],
    TEST_DIRECTORY: ['/test/', '/tests/', '/__tests__/']
  },

  TEST_NAMING: {
    JEST: '.test',
    MOCHA: '.spec'
  }
} as const;

/**
 * Extract function names from source code
 */
export function extractFunctionNames(sourceCode: string, defaultName: string = TEST_GENERATION_CONSTANTS.DEFAULT_FUNCTION_NAME): string[] {
  const functionRegex = /(?:function|const|let|var)\s+(\w+)\s*(?:=\s*(?:async\s*)?\([^)]*\)\s*=>|=\s*function|\([^)]*\)\s*{)/g;
  const matches: string[] = [];
  let match;

  while ((match = functionRegex.exec(sourceCode)) !== null) {
    if (match[1] && !matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }

  return matches.length > 0 ? matches : [defaultName];
}

/**
 * Extract component name from React source code
 */
export function extractComponentName(sourceCode: string, defaultName: string = TEST_GENERATION_CONSTANTS.DEFAULT_COMPONENT_NAME): string {
  // Try to find export const ComponentName or export function ComponentName
  const exportMatch = sourceCode.match(/export\s+(?:const|function)\s+(\w+)/);
  if (exportMatch) {
    return exportMatch[1];
  }

  // Try to find Component declaration
  const componentMatch = sourceCode.match(/(?:const|function)\s+([A-Z]\w+)/);
  if (componentMatch) {
    return componentMatch[1];
  }

  return defaultName;
}

/**
 * Test generation templates for testing
 * Centralized templates for multi-framework test generation
 */
export const TEST_GENERATION_TEMPLATES = {
  jest: {
    basic: (functions: string[]) => `import { ${functions.join(', ')} } from './source';

describe('Function Tests', () => {
${functions.map(fn => `  describe('${fn}', () => {
    it('should work correctly', () => {
      const result = ${fn}();
      expect(result).toBeDefined();
    });
  });`).join('\n\n')}
});
`,

    withMocks: (functions: string[], mockPath: string = './dependency') =>
      `import { ${functions.join(', ')} } from './source';\n\n` +
      `// Mock dependencies\njest.mock('${mockPath}');\n\n` +
      `describe('Function Tests', () => {
${functions.map(fn => `  describe('${fn}', () => {
    it('should work correctly', () => {
      const result = ${fn}();
      expect(result).toBeDefined();
    });
  });`).join('\n\n')}
});
`,

    comprehensive: (functions: string[]) => `import { ${functions.join(', ')} } from './source';

describe('Function Tests', () => {
${functions.map(fn => `  describe('${fn}', () => {
    it('should work correctly', () => {
      const result = ${fn}();
      expect(result).toBeDefined();
    });

    it('should handle edge cases', () => {
      expect(() => ${fn}(null)).not.toThrow();
    });
  });`).join('\n\n')}
});
`,

    sample: `import { add, subtract } from './math';

describe('Math Functions', () => {
  describe('add', () => {
    it('should add two numbers correctly', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('should handle negative numbers', () => {
      expect(add(-1, 1)).toBe(0);
    });
  });

  describe('subtract', () => {
    it('should subtract two numbers correctly', () => {
      expect(subtract(5, 3)).toBe(2);
    });
  });
});
`
  },

  react: {
    basic: (componentName: string) => `import React from 'react';
import { render, screen } from '@testing-library/react';
import { ${componentName} } from './${componentName}';

describe('${componentName}', () => {
  it('should render without crashing', () => {
    render(<${componentName} />);
  });

  it('should display content', () => {
    render(<${componentName} />);
    expect(screen.getByText(/./i)).toBeInTheDocument();
  });
});
`,

    comprehensive: (componentName: string) => `import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ${componentName} } from './${componentName}';

describe('${componentName}', () => {
  it('should render without crashing', () => {
    render(<${componentName} />);
  });

  it('should display content', () => {
    render(<${componentName} />);
    expect(screen.getByText(/./i)).toBeInTheDocument();
  });

  it('should handle user interactions', () => {
    render(<${componentName} />);
    const button = screen.queryByRole('button');
    if (button) fireEvent.click(button);
  });

  it('should handle props correctly', () => {
    const props = { title: 'Test' };
    render(<${componentName} {...props} />);
    expect(screen.getByText(/test/i)).toBeInTheDocument();
  });
});
`,

    sample: `import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render without crashing', () => {
    render(<Button />);
  });

  it('should display button text', () => {
    render(<Button label="Click Me" />);
    expect(screen.getByText(/click me/i)).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
`
  },

  mocha: {
    basic: (functions: string[]) => `const { expect } = require('chai');
const { ${functions.join(', ')} } = require('./source');

describe('Function Tests', () => {
${functions.map(fn => `  describe('${fn}', () => {
    it('should work correctly', () => {
      const result = ${fn}();
      expect(result).to.exist;
    });
  });`).join('\n\n')}
});
`,

    comprehensive: (functions: string[]) => `const { expect } = require('chai');
const { ${functions.join(', ')} } = require('./source');

describe('Function Tests', () => {
${functions.map(fn => `  describe('${fn}', () => {
    it('should work correctly', () => {
      const result = ${fn}();
      expect(result).to.exist;
    });

    it('should handle edge cases', () => {
      expect(() => ${fn}(null)).to.not.throw();
    });
  });`).join('\n\n')}
});
`,

    sample: `const { expect } = require('chai');
const { calculateSum } = require('./calculator');

describe('Calculator', () => {
  describe('calculateSum', () => {
    it('should calculate sum correctly', () => {
      expect(calculateSum(2, 3)).to.equal(5);
    });

    it('should handle zero', () => {
      expect(calculateSum(0, 0)).to.equal(0);
    });
  });
});
`
  },

  generic: {
    fallback: TEST_GENERATION_CONSTANTS.FALLBACK_TEST_TEMPLATE,
    default: `// Generated test file\ndescribe('Tests', () => {\n  it('should pass', () => {\n    expect(true).toBe(true);\n  });\n});\n`
  }
} as const;

/**
 * Create test generation handler for testing
 */
export function createTestGenerationHandler() {
  return async (request: any) => {
    if (request.type === 'generate-tests') {
      const { framework } = request;

      // Jest tests
      if (framework === 'jest') {
        return { result: TEST_GENERATION_TEMPLATES.jest.sample };
      }

      // React tests
      if (framework === 'jest-react') {
        return { result: TEST_GENERATION_TEMPLATES.react.sample };
      }

      // Mocha tests
      if (framework === 'mocha') {
        return { result: TEST_GENERATION_TEMPLATES.mocha.sample };
      }

      // Default
      return { result: TEST_GENERATION_TEMPLATES.generic.default };
    }
    return { result: '' };
  };
}
