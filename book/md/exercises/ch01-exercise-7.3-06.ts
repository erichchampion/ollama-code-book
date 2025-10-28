// calculator-tool.ts
import { BaseTool, ToolMetadata, ToolResult, ToolExecutionContext } from './tools/types';

export class CalculatorTool extends BaseTool {
  metadata: ToolMetadata = {
    name: 'calculator',
    description: 'Evaluate mathematical expressions',
    category: 'utility',
    version: '1.0.0',
    parameters: [
      {
        name: 'expression',
        type: 'string',
        description: 'Mathematical expression to evaluate (e.g., "2 + 2")',
        required: true
      }
    ],
    examples: [
      {
        input: { expression: '2 + 2' },
        output: { result: 4 }
      },
      {
        input: { expression: '(10 + 5) * 2' },
        output: { result: 30 }
      }
    ]
  };

  async execute(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    // TODO: Implement safe expression evaluation
    // Hint: Don't use eval()! Use a library like mathjs or build a parser
  }
}