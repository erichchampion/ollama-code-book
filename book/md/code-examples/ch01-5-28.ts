import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from './registry';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('should register a tool', () => {
    const tool = new MockTool();
    registry.register(tool);
    expect(registry.get('mock-tool')).toBe(tool);
  });

  it('should list all registered tools', () => {
    registry.register(new MockTool());
    registry.register(new AnotherMockTool());
    expect(registry.list()).toHaveLength(2);
  });
});