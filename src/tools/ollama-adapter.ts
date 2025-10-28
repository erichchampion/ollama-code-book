/**
 * Ollama Tool Adapter
 *
 * Converts our internal tool definitions to Ollama's tool calling format
 */

import { BaseTool, ToolMetadata, ToolParameter, ToolRegistry } from './types.js';
import { OllamaTool } from '../ai/ollama-client.js';

export class OllamaToolAdapter {
  /**
   * Convert a BaseTool to Ollama's tool format
   */
  static toOllamaFormat(tool: BaseTool): OllamaTool {
    const metadata = tool.metadata;

    return {
      type: 'function',
      function: {
        name: metadata.name,
        description: metadata.description,
        parameters: {
          type: 'object',
          properties: this.convertParameters(metadata.parameters),
          required: metadata.parameters
            .filter(p => p.required)
            .map(p => p.name)
        }
      }
    };
  }

  /**
   * Convert tool parameters to Ollama format
   */
  private static convertParameters(
    parameters: ToolParameter[]
  ): Record<string, { type: string; description: string; enum?: string[] }> {
    const properties: Record<string, any> = {};

    for (const param of parameters) {
      properties[param.name] = {
        type: this.convertParameterType(param.type),
        description: param.description
      };

      // Add enum constraints if present
      if (param.enum !== undefined && param.enum.length > 0) {
        properties[param.name].enum = param.enum;
      }
    }

    return properties;
  }

  /**
   * Convert our parameter types to JSON Schema types
   */
  private static convertParameterType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'array': 'array',
      'object': 'object'
    };

    return typeMap[type] || 'string';
  }

  /**
   * Convert all tools from a registry to Ollama format
   */
  static getAllTools(registry: ToolRegistry): OllamaTool[] {
    const tools: OllamaTool[] = [];

    for (const metadata of registry.list()) {
      const tool = registry.get(metadata.name);
      if (tool) {
        tools.push(this.toOllamaFormat(tool));
      }
    }

    return tools;
  }

  /**
   * Get tools filtered by category
   */
  static getToolsByCategory(
    registry: ToolRegistry,
    category: string
  ): OllamaTool[] {
    const tools = registry.getByCategory(category);
    return tools.map(tool => this.toOllamaFormat(tool));
  }

  /**
   * Get specific tools by name
   */
  static getSpecificTools(
    registry: ToolRegistry,
    toolNames: string[]
  ): OllamaTool[] {
    const tools: OllamaTool[] = [];

    for (const name of toolNames) {
      const tool = registry.get(name);
      if (tool) {
        tools.push(this.toOllamaFormat(tool));
      }
    }

    return tools;
  }
}
