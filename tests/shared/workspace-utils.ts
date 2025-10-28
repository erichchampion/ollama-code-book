/**
 * Shared Workspace Utilities
 * Common workspace management functions for testing
 */

import * as path from 'path';
import { ensureDir, remove, writeFile, copy } from './file-utils.js';

/**
 * Create a test workspace directory
 * @param name Workspace name
 * @param baseDir Base directory for workspaces (default: .test-workspaces)
 * @returns Promise that resolves with workspace path
 */
export async function createTestWorkspace(
  name: string = 'test-workspace',
  baseDir: string = '.test-workspaces'
): Promise<string> {
  const workspacePath = path.join(process.cwd(), baseDir, name);
  await ensureDir(workspacePath);
  return workspacePath;
}

/**
 * Clean up test workspace
 * @param workspacePath Path to workspace to clean up
 */
export async function cleanupTestWorkspace(workspacePath: string): Promise<void> {
  try {
    await remove(workspacePath, true);
  } catch (error) {
    console.warn(`Failed to cleanup workspace: ${workspacePath}`, error);
  }
}

/**
 * Create a test file in workspace
 * @param workspacePath Workspace path
 * @param filename Relative file path within workspace
 * @param content File content
 * @returns Promise that resolves with full file path
 */
export async function createTestFile(
  workspacePath: string,
  filename: string,
  content: string
): Promise<string> {
  const filePath = path.join(workspacePath, filename);
  const dir = path.dirname(filePath);

  await ensureDir(dir);
  await writeFile(filePath, content);

  return filePath;
}

/**
 * Create a mock workspace with multiple test files
 * @param options Workspace configuration
 * @returns Promise that resolves with workspace path
 */
export interface MockWorkspaceOptions {
  name: string;
  files: Array<{
    path: string;
    content: string;
  }>;
}

export async function createMockWorkspace(
  options: MockWorkspaceOptions
): Promise<string> {
  const workspacePath = await createTestWorkspace(options.name);

  for (const file of options.files) {
    await createTestFile(workspacePath, file.path, file.content);
  }

  return workspacePath;
}

/**
 * Copy a fixture to a workspace directory
 * @param fixtureName Name of fixture to copy
 * @param targetDir Target directory path
 * @param fixturesBaseDir Base directory for fixtures (default: tests/fixtures/projects)
 */
export async function copyFixtureToWorkspace(
  fixtureName: string,
  targetDir: string,
  fixturesBaseDir: string = 'tests/fixtures/projects'
): Promise<void> {
  const fixturePath = path.join(process.cwd(), fixturesBaseDir, fixtureName);
  await copy(fixturePath, targetDir);
}

/**
 * Create a package.json file in workspace
 * @param workspacePath Workspace path
 * @param packageData Package.json data
 */
export async function createPackageJson(
  workspacePath: string,
  packageData: {
    name?: string;
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
    [key: string]: any;
  }
): Promise<string> {
  const defaultData = {
    name: 'test-package',
    version: '1.0.0',
    ...packageData,
  };

  const filePath = path.join(workspacePath, 'package.json');
  await writeFile(filePath, JSON.stringify(defaultData, null, 2));

  return filePath;
}

/**
 * Create a tsconfig.json file in workspace
 * @param workspacePath Workspace path
 * @param config TypeScript configuration
 */
export async function createTsConfig(
  workspacePath: string,
  config?: Record<string, any>
): Promise<string> {
  const defaultConfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      lib: ['ES2020'],
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
    ...config,
  };

  const filePath = path.join(workspacePath, 'tsconfig.json');
  await writeFile(filePath, JSON.stringify(defaultConfig, null, 2));

  return filePath;
}
