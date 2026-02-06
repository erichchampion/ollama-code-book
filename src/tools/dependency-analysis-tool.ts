/**
 * Dependency Analysis Tool
 *
 * Dedicated tool for dependency analysis: graph (structure), circular (cycle detection),
 * impact (affected modules for a file). Separate from ProjectContextTool "dependencies".
 */

import { BaseTool, ToolMetadata, ToolResult, ToolExecutionContext } from './types.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger.js';

const OPERATIONS = ['graph', 'circular', 'impact'] as const;
type Operation = (typeof OPERATIONS)[number];

export class DependencyAnalysisTool extends BaseTool {
  metadata: ToolMetadata = {
    name: 'dependency-analysis',
    description:
      'Analyze project dependencies: graph (dependency structure from package.json and file imports), circular (detect cycles), impact (modules affected by a given file).',
    category: 'context',
    version: '1.0.0',
    parameters: [
      {
        name: 'operation',
        type: 'string',
        description: 'Operation: graph = dependency structure, circular = detect cycles, impact = affected modules for a file',
        required: true,
        enum: [...OPERATIONS],
        validation: (v) => typeof v === 'string' && OPERATIONS.includes(v as Operation),
      },
      {
        name: 'path',
        type: 'string',
        description: 'File path relative to project root (required for impact operation)',
        required: false,
      },
    ],
    examples: [
      { description: 'Get dependency graph', parameters: { operation: 'graph' } },
      { description: 'Detect circular dependencies', parameters: { operation: 'circular' } },
      { description: 'Get impact for a file', parameters: { operation: 'impact', path: 'src/index.js' } },
    ],
  };

  async execute(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const { projectRoot } = context;

    try {
      const operation = parameters?.operation as string;
      if (!operation || !OPERATIONS.includes(operation as Operation)) {
        return {
          success: false,
          error: `Invalid or missing operation. Valid operations: ${OPERATIONS.join(', ')}`,
          metadata: { executionTime: Date.now() - startTime },
        };
      }

      if (operation === 'impact' && !parameters.path) {
        return {
          success: false,
          error: 'Parameter "path" is required for impact operation.',
          metadata: { executionTime: Date.now() - startTime },
        };
      }

      if (operation === 'graph') {
        const graph = await this.buildGraph(projectRoot);
        return {
          success: true,
          data: { graph },
          metadata: { executionTime: Date.now() - startTime },
        };
      }

      if (operation === 'circular') {
        const circular = await this.detectCircular(projectRoot);
        return {
          success: true,
          data: { circular },
          metadata: { executionTime: Date.now() - startTime },
        };
      }

      if (operation === 'impact') {
        const impact = await this.computeImpact(projectRoot, parameters.path as string);
        return {
          success: true,
          data: { impact },
          metadata: { executionTime: Date.now() - startTime },
        };
      }

      return {
        success: false,
        error: `Unhandled operation: ${operation}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.debug('DependencyAnalysisTool error:', message);
      return {
        success: false,
        error: message,
        metadata: { executionTime: Date.now() - startTime },
      };
    }
  }

  private async readPackageJson(root: string): Promise<{ name?: string; dependencies?: Record<string, string> }> {
    const p = path.join(root, 'package.json');
    try {
      const raw = await fs.readFile(p, 'utf-8');
      return JSON.parse(raw) as { name?: string; dependencies?: Record<string, string> };
    } catch {
      return {};
    }
  }

  private async buildGraph(projectRoot: string): Promise<Record<string, unknown>> {
    const pkg = await this.readPackageJson(projectRoot);
    const dependencies = pkg.dependencies ?? {};
    const fileGraph = await this.buildFileImportGraph(projectRoot);
    return {
      package: { name: pkg.name, dependencies: Object.keys(dependencies) },
      dependencies: Object.keys(dependencies),
      fileImports: fileGraph,
    };
  }

  private async buildFileImportGraph(projectRoot: string): Promise<Record<string, string[]>> {
    const graph: Record<string, string[]> = {};
    const jsExtensions = ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'];
    const entryPaths = ['index.js', 'index.ts', 'src/index.js', 'src/index.ts', 'main.js', 'app.js'];

    async function scanDir(dir: string): Promise<string[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      const files: string[] = [];
      for (const e of entries) {
        const full = path.join(dir, e.name);
        const rel = path.relative(projectRoot, full);
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
          files.push(...(await scanDir(full)));
        } else if (e.isFile() && jsExtensions.some((ext) => e.name.endsWith(ext))) {
          files.push(rel);
        }
      }
      return files;
    }

    const files = await scanDir(projectRoot);
    for (const file of files) {
      const fullPath = path.join(projectRoot, file);
      let content: string;
      try {
        content = await fs.readFile(fullPath, 'utf-8');
      } catch {
        continue;
      }
      const imports = this.extractImports(content, path.dirname(file));
      if (imports.length) graph[file] = imports;
    }
    return graph;
  }

  private extractImports(content: string, dir: string): string[] {
    const imports: string[] = [];
    const re = /(?:import\s+.*\s+from\s+['"])(\.\.?\/[^'"]+)(?:['"])|(?:require\s*\(\s*['"])(\.\.?\/[^'"]+)(?:['"])/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      const spec = (m[1] || m[2] || '').replace(/\.(js|mjs|ts|json)$/i, '');
      const resolved = path.join(dir, spec).replace(/\\/g, '/');
      if (!imports.includes(resolved)) imports.push(resolved);
    }
    return imports;
  }

  private async detectCircular(projectRoot: string): Promise<string[][]> {
    const fileGraph = await this.buildFileImportGraph(projectRoot);
    const nodes = new Set<string>(Object.keys(fileGraph));
    for (const deps of Object.values(fileGraph)) deps.forEach((d) => nodes.add(d));
    const adj: Record<string, string[]> = {};
    for (const n of nodes) adj[n] = fileGraph[n] ?? [];
    const cycles: string[][] = [];
    const stack: string[] = [];
    const index: Record<string, number> = {};
    const low: Record<string, number> = {};
    let idx = 0;

    const dfs = (v: string) => {
      index[v] = low[v] = idx++;
      stack.push(v);
      for (const w of adj[v] ?? []) {
        if (index[w] === undefined) {
          dfs(w);
          low[v] = Math.min(low[v], low[w]);
        } else if (stack.includes(w)) {
          low[v] = Math.min(low[v], index[w]);
        }
      }
      if (low[v] === index[v]) {
        const scc: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          scc.push(w);
        } while (w !== v);
        if (scc.length > 1) cycles.push(scc);
      }
    };

    for (const n of nodes) {
      if (index[n] === undefined) dfs(n);
    }
    return cycles;
  }

  private async computeImpact(projectRoot: string, filePath: string): Promise<string[]> {
    const normalized = path.normalize(filePath).replace(/\\/g, '/');
    const graph = await this.buildFileImportGraph(projectRoot);
    const reversed: Record<string, string[]> = {};
    for (const [from, tos] of Object.entries(graph)) {
      for (const to of tos) {
        const key = to.startsWith('.') ? path.join(path.dirname(from), to).replace(/\\/g, '/') : to;
        if (!reversed[key]) reversed[key] = [];
        reversed[key].push(from);
      }
    }
    const visited = new Set<string>();
    const queue = [normalized];
    while (queue.length) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      for (const next of reversed[cur] ?? []) {
        if (!visited.has(next)) queue.push(next);
      }
    }
    visited.delete(normalized);
    return Array.from(visited);
  }
}
