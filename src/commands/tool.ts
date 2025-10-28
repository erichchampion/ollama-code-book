/**
 * Tool Command
 *
 * Provides access to the tool system for direct tool execution
 * and orchestration capabilities.
 */

import { CommandDef, ArgType } from './index.js';
import { toolRegistry, createDefaultContext, ToolOrchestrator } from '../tools/index.js';
import { logger } from '../utils/logger.js';

export const toolCommand: CommandDef = {
  name: 'tool',
  description: 'Execute tools directly or manage tool orchestration',
  category: 'tools',
  args: [
    {
      name: 'action',
      description: 'Action to perform: execute, list, describe, orchestrate',
      type: ArgType.STRING,
      required: true,
      position: 0,
      choices: ['execute', 'list', 'describe', 'orchestrate']
    },
    {
      name: 'toolName',
      description: 'Name of the tool to execute or describe',
      type: ArgType.STRING,
      required: false,
      position: 1
    },
    {
      name: 'parameters',
      description: 'Tool parameters as JSON string',
      type: ArgType.STRING,
      required: false
    },
    {
      name: 'category',
      description: 'Filter tools by category',
      type: ArgType.STRING,
      required: false
    },
    {
      name: 'timeout',
      description: 'Execution timeout in milliseconds',
      type: ArgType.NUMBER,
      required: false,
      default: 30000
    },
    {
      name: 'workdir',
      description: 'Working directory for tool execution',
      type: ArgType.STRING,
      required: false
    }
  ],
  examples: [
    'tool list',
    'tool list --category core',
    'tool describe filesystem',
    'tool execute filesystem --parameters \'{"operation": "read", "path": "package.json"}\'',
    'tool execute search --parameters \'{"query": "console.log", "type": "content"}\''
  ],
  async handler(args: Record<string, any>): Promise<any> {
    const { action, toolName, parameters, category, timeout, workdir } = args;

    try {
      switch (action) {
        case 'list':
          return await handleListTools(category);

        case 'describe':
          if (!toolName) {
            throw new Error('Tool name is required for describe action');
          }
          return await handleDescribeTool(toolName);

        case 'execute':
          if (!toolName) {
            throw new Error('Tool name is required for execute action');
          }
          return await handleExecuteTool(toolName, parameters, { timeout, workdir });

        case 'orchestrate':
          return await handleOrchestrate(parameters, { timeout, workdir });

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error(`Tool command failed: ${error}`);
      throw error;
    }
  }
};

async function handleListTools(category?: string): Promise<void> {
  const tools = toolRegistry.list();

  if (tools.length === 0) {
    console.log('No tools are currently registered.');
    return;
  }

  const filteredTools = category
    ? tools.filter(tool => tool.category === category)
    : tools;

  if (filteredTools.length === 0) {
    console.log(`No tools found in category: ${category}`);
    return;
  }

  // Group by category
  const categorizedTools = new Map<string, typeof filteredTools>();
  for (const tool of filteredTools) {
    const cat = tool.category || 'uncategorized';
    if (!categorizedTools.has(cat)) {
      categorizedTools.set(cat, []);
    }
    categorizedTools.get(cat)!.push(tool);
  }

  console.log(`\nAvailable Tools (${filteredTools.length} total):\n`);

  for (const [cat, toolsInCategory] of categorizedTools) {
    console.log(`${cat.toUpperCase()}:`);
    for (const tool of toolsInCategory) {
      const paramCount = tool.parameters.length;
      const hasExamples = tool.examples.length > 0;

      console.log(`  ${tool.name.padEnd(15)} ${tool.description}`);
      console.log(`    ${' '.repeat(15)} Version: ${tool.version}, Parameters: ${paramCount}${hasExamples ? ', Has examples' : ''}`);
    }
    console.log('');
  }
}

async function handleDescribeTool(toolName: string): Promise<void> {
  const tool = toolRegistry.get(toolName);
  if (!tool) {
    throw new Error(`Tool '${toolName}' not found`);
  }

  const metadata = tool.metadata;

  console.log(`\nTool: ${metadata.name}`);
  console.log(`Description: ${metadata.description}`);
  console.log(`Category: ${metadata.category}`);
  console.log(`Version: ${metadata.version}`);

  if (metadata.dependencies && metadata.dependencies.length > 0) {
    console.log(`Dependencies: ${metadata.dependencies.join(', ')}`);
  }

  console.log('\nParameters:');
  if (metadata.parameters.length === 0) {
    console.log('  None');
  } else {
    for (const param of metadata.parameters) {
      const required = param.required ? ' (required)' : '';
      const defaultValue = param.default !== undefined ? ` [default: ${param.default}]` : '';

      console.log(`  ${param.name} (${param.type})${required}${defaultValue}`);
      console.log(`    ${param.description}`);

      if (param.validation) {
        console.log(`    Has custom validation`);
      }
    }
  }

  if (metadata.examples.length > 0) {
    console.log('\nExamples:');
    for (const example of metadata.examples) {
      console.log(`  ${example.description}:`);
      console.log(`    Parameters: ${JSON.stringify(example.parameters, null, 2)}`);
      if (example.expectedOutput) {
        console.log(`    Expected: ${example.expectedOutput}`);
      }
    }
  }

  console.log('');
}

async function handleExecuteTool(
  toolName: string,
  parametersJson?: string,
  options: { timeout?: number; workdir?: string } = {}
): Promise<void> {
  const tool = toolRegistry.get(toolName);
  if (!tool) {
    throw new Error(`Tool '${toolName}' not found`);
  }

  let parameters = {};
  if (parametersJson) {
    try {
      parameters = JSON.parse(parametersJson);
    } catch (error) {
      throw new Error(`Invalid JSON parameters: ${error}`);
    }
  }

  // Validate parameters
  if (!tool.validateParameters(parameters)) {
    throw new Error('Invalid parameters provided');
  }

  const context = createDefaultContext({
    timeout: options.timeout,
    workingDirectory: options.workdir
  });

  console.log(`Executing tool: ${toolName}`);
  console.log(`Parameters: ${JSON.stringify(parameters, null, 2)}`);

  const startTime = Date.now();
  const result = await tool.execute(parameters, context);
  const duration = Date.now() - startTime;

  if (result.success) {
    console.log(`\n✅ Tool executed successfully in ${duration}ms`);

    if (result.data) {
      console.log('\nResult:');
      if (typeof result.data === 'string') {
        console.log(result.data);
      } else {
        console.log(JSON.stringify(result.data, null, 2));
      }
    }

    if (result.metadata?.warnings && result.metadata.warnings.length > 0) {
      console.log('\nWarnings:');
      for (const warning of result.metadata.warnings) {
        console.log(`  ${warning}`);
      }
    }
  } else {
    console.error(`\n❌ Tool execution failed: ${result.error}`);
    if (result.metadata?.executionTime) {
      console.log(`Execution time: ${result.metadata.executionTime}ms`);
    }
    throw new Error(result.error);
  }
}

async function handleOrchestrate(
  planJson?: string,
  options: { timeout?: number; workdir?: string } = {}
): Promise<void> {
  if (!planJson) {
    throw new Error('Orchestration plan JSON is required');
  }

  let planData;
  try {
    planData = JSON.parse(planJson);
  } catch (error) {
    throw new Error(`Invalid JSON plan: ${error}`);
  }

  if (!Array.isArray(planData)) {
    throw new Error('Orchestration plan must be an array of tool executions');
  }

  const orchestrator = new ToolOrchestrator();
  const plan = orchestrator.createPlan(planData);

  console.log(`Starting orchestrated execution of ${plan.executions.length} tools`);
  console.log(`Estimated duration: ${Math.round(plan.estimatedDuration / 1000)}s`);

  const context = createDefaultContext({
    timeout: options.timeout,
    workingDirectory: options.workdir
  });

  // Set up progress monitoring
  orchestrator.on('execution', (event) => {
    const { type, execution } = event;
    switch (type) {
      case 'start':
        console.log(`▶️  Starting: ${execution.toolName} (${execution.id})`);
        break;
      case 'complete':
        console.log(`✅ Completed: ${execution.toolName} (${execution.id})`);
        break;
      case 'error':
        console.error(`❌ Failed: ${execution.toolName} (${execution.id})`);
        break;
    }
  });

  const startTime = Date.now();
  const results = await orchestrator.executeOrchestration(plan, context);
  const totalDuration = Date.now() - startTime;

  console.log(`\n🎉 Orchestration completed in ${Math.round(totalDuration / 1000)}s`);

  // Summary of results
  let successCount = 0;
  let failureCount = 0;

  for (const [executionId, result] of results) {
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
      const execution = plan.executions.find(e => e.id === executionId);
      console.error(`Failed: ${execution?.toolName} - ${result.error}`);
    }
  }

  console.log(`\nSummary: ${successCount} successful, ${failureCount} failed`);
}