// Example: Sequential vs Parallel

const toolCalls: ToolCall[] = [
  { id: '1', toolName: 'read_file', parameters: { path: 'a.ts' } },
  { id: '2', toolName: 'read_file', parameters: { path: 'b.ts' } },
  { id: '3', toolName: 'read_file', parameters: { path: 'c.ts' } },
  { id: '4', toolName: 'read_file', parameters: { path: 'd.ts' } }
];

// Sequential: 4 * 100ms = 400ms
const sequential = await executeSequentially(toolCalls);

// Parallel: max(100ms, 100ms, 100ms, 100ms) = 100ms
const parallel = await executeInParallel(toolCalls);

// Speedup: 4x faster!