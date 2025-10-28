const toolCalls: ToolCall[] = [
  {
    id: 'call_1',
    toolName: 'list_files',
    parameters: { path: 'src/' }
  },
  {
    id: 'call_2',
    toolName: 'read_file',
    parameters: { path: 'src/index.ts' },
    dependsOn: ['call_1'] // Depends on listing files first
  },
  {
    id: 'call_3',
    toolName: 'read_file',
    parameters: { path: 'src/utils.ts' },
    dependsOn: ['call_1']
  },
  {
    id: 'call_4',
    toolName: 'search_code',
    parameters: { pattern: 'TODO', path: 'src/' }
    // No dependencies - can run in parallel with call_1
  },
  {
    id: 'call_5',
    toolName: 'write_file',
    parameters: { path: 'summary.md', content: '...' },
    dependsOn: ['call_2', 'call_3', 'call_4'] // Depends on all analysis
  }
];

const resolver = new DependencyResolver(logger);
const graph = resolver.buildGraph(toolCalls, registry);
const plan = resolver.planExecution(graph);

console.log('Sequential:', plan.sequential);
// ['call_1', 'call_4', 'call_2', 'call_3', 'call_5']

console.log('Parallel levels:', plan.parallel);
// [
//   ['call_1', 'call_4'],     // Level 0: Can run in parallel
//   ['call_2', 'call_3'],     // Level 1: Wait for call_1
//   ['call_5']                // Level 2: Wait for call_2, call_3, call_4
// ]

console.log('Max parallelism:', plan.maxParallelism);
// 2 (level 0 and level 1 both have 2 calls)