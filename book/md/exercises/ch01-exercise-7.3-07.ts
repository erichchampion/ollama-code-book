// calculator-tool.test.ts
import { describe, it, expect } from 'vitest';
import { CalculatorTool } from './calculator-tool';

describe('CalculatorTool', () => {
  const tool = new CalculatorTool();
  const context = { projectRoot: process.cwd(), workingDirectory: process.cwd() };

  it('should evaluate simple addition', async () => {
    const result = await tool.execute({ expression: '2 + 2' }, context);
    expect(result.success).toBe(true);
    expect(result.data.result).toBe(4);
  });

  it('should handle complex expressions', async () => {
    const result = await tool.execute({ expression: '(10 + 5) * 2' }, context);
    expect(result.success).toBe(true);
    expect(result.data.result).toBe(30);
  });

  it('should reject code injection attempts', async () => {
    const result = await tool.execute({
      expression: 'process.exit(1)'
    }, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid expression');
  });
});