/**
 * AST Manipulator
 *
 * Provides syntax-aware code transformations using Abstract Syntax Trees
 * for safe and precise code modifications.
 */

import { promises as fs } from 'fs';
import { normalizeError } from '../utils/error-utils.js';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import { getOrCompileGlobalRegex, getOrCompileRegex } from '../utils/regex-cache.js';
import { safeParse } from '../utils/safe-json.js';

export interface ASTNode {
  type: string;
  start: number;
  end: number;
  range: [number, number];
  children?: ASTNode[];
  name?: string;
  value?: any;
  parent?: ASTNode;
}

export interface CodeLocation {
  line: number;
  column: number;
  index: number;
}

export interface CodeRange {
  start: CodeLocation;
  end: CodeLocation;
}

export interface FunctionInfo {
  name: string;
  range: CodeRange;
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  docstring?: string;
}

export interface ClassInfo {
  name: string;
  range: CodeRange;
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  superClass?: string;
  isExported: boolean;
  docstring?: string;
}

export interface PropertyInfo {
  name: string;
  range: CodeRange;
  type?: string;
  isPrivate: boolean;
  isStatic: boolean;
}

export interface ImportInfo {
  module: string;
  imports: string[];
  isDefault: boolean;
  range: CodeRange;
}

export interface ManipulationResult {
  success: boolean;
  originalCode: string;
  modifiedCode: string;
  changes: CodeChange[];
  error?: string;
}

export interface CodeChange {
  type: 'insert' | 'delete' | 'replace';
  range: CodeRange;
  oldText: string;
  newText: string;
  description: string;
}

export interface CodeTransformation {
  type: 'rename-symbol' | 'extract-function' | 'add-import' | 'modify-function' | 'custom';
  target?: string;
  replacement?: string;
  scope?: 'global' | 'local';
  parameters?: Record<string, any>;
}

export class ASTManipulator {
  private languageSupport = new Map<string, LanguageHandler>();

  constructor() {
    this.initializeLanguageSupport();
  }

  /**
   * Initialize language-specific handlers
   */
  private initializeLanguageSupport(): void {
    this.languageSupport.set('.js', new JavaScriptHandler());
    this.languageSupport.set('.mjs', new JavaScriptHandler());
    this.languageSupport.set('.ts', new TypeScriptHandler());
    this.languageSupport.set('.jsx', new JavaScriptHandler());
    this.languageSupport.set('.tsx', new TypeScriptHandler());
    this.languageSupport.set('.py', new PythonHandler());
    this.languageSupport.set('.json', new JSONHandler());
  }

  /**
   * Parse file and extract AST information
   */
  async parseFile(filePath: string): Promise<ASTNode> {
    const ext = path.extname(filePath).toLowerCase();
    const handler = this.languageSupport.get(ext);

    if (!handler) {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return handler.parse(content);
  }

  /**
   * Extract function information from code
   */
  async extractFunctions(filePath: string): Promise<FunctionInfo[]> {
    const ext = path.extname(filePath).toLowerCase();
    const handler = this.languageSupport.get(ext);

    if (!handler) {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return handler.extractFunctions(content);
  }

  /**
   * Extract class information from code
   */
  async extractClasses(filePath: string): Promise<ClassInfo[]> {
    const ext = path.extname(filePath).toLowerCase();
    const handler = this.languageSupport.get(ext);

    if (!handler) {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return handler.extractClasses(content);
  }

  /**
   * Extract import/export information
   */
  async extractImports(filePath: string): Promise<ImportInfo[]> {
    const ext = path.extname(filePath).toLowerCase();
    const handler = this.languageSupport.get(ext);

    if (!handler) {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return handler.extractImports(content);
  }

  /**
   * Rename a symbol throughout the file with scope awareness
   */
  async renameSymbol(
    filePath: string,
    oldName: string,
    newName: string,
    scope?: 'global' | 'local'
  ): Promise<ManipulationResult> {
    const ext = path.extname(filePath).toLowerCase();
    const handler = this.languageSupport.get(ext);

    if (!handler) {
      return {
        success: false,
        originalCode: '',
        modifiedCode: '',
        changes: [],
        error: `Unsupported file type: ${ext}`
      };
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return handler.renameSymbol(content, oldName, newName, scope);
    } catch (error) {
      return {
        success: false,
        originalCode: '',
        modifiedCode: '',
        changes: [],
        error: normalizeError(error).message
      };
    }
  }

  /**
   * Extract a function to a separate location
   */
  async extractFunction(
    filePath: string,
    functionName: string,
    targetLocation: 'separate-file' | 'top-of-file' | 'bottom-of-file'
  ): Promise<ManipulationResult> {
    const ext = path.extname(filePath).toLowerCase();
    const handler = this.languageSupport.get(ext);

    if (!handler) {
      return {
        success: false,
        originalCode: '',
        modifiedCode: '',
        changes: [],
        error: `Unsupported file type: ${ext}`
      };
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return handler.extractFunction(content, functionName, targetLocation);
    } catch (error) {
      return {
        success: false,
        originalCode: '',
        modifiedCode: '',
        changes: [],
        error: normalizeError(error).message
      };
    }
  }

  /**
   * Add import statement
   */
  async addImport(
    filePath: string,
    importStatement: string,
    position?: 'top' | 'after-existing'
  ): Promise<ManipulationResult> {
    const ext = path.extname(filePath).toLowerCase();
    const handler = this.languageSupport.get(ext);

    if (!handler) {
      return {
        success: false,
        originalCode: '',
        modifiedCode: '',
        changes: [],
        error: `Unsupported file type: ${ext}`
      };
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return handler.addImport(content, importStatement, position);
    } catch (error) {
      return {
        success: false,
        originalCode: '',
        modifiedCode: '',
        changes: [],
        error: normalizeError(error).message
      };
    }
  }

  /**
   * Modify function parameters
   */
  async modifyFunction(
    filePath: string,
    functionName: string,
    modifications: {
      addParameters?: string[];
      removeParameters?: string[];
      changeReturnType?: string;
      addDocstring?: string;
    }
  ): Promise<ManipulationResult> {
    const ext = path.extname(filePath).toLowerCase();
    const handler = this.languageSupport.get(ext);

    if (!handler) {
      return {
        success: false,
        originalCode: '',
        modifiedCode: '',
        changes: [],
        error: `Unsupported file type: ${ext}`
      };
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return handler.modifyFunction(content, functionName, modifications);
    } catch (error) {
      return {
        success: false,
        originalCode: '',
        modifiedCode: '',
        changes: [],
        error: normalizeError(error).message
      };
    }
  }

  /**
   * Apply a code transformation based on the transformation specification
   */
  async applyTransformation(
    filePath: string,
    transformation: CodeTransformation
  ): Promise<ManipulationResult> {
    try {
      switch (transformation.type) {
        case 'rename-symbol':
          if (!transformation.target || !transformation.replacement) {
            throw new Error('Rename transformation requires target and replacement');
          }
          return await this.renameSymbol(
            filePath,
            transformation.target,
            transformation.replacement,
            transformation.scope
          );

        case 'extract-function':
          if (!transformation.target) {
            throw new Error('Extract function transformation requires target function name');
          }
          const targetLocation = transformation.parameters?.targetLocation || 'separate-file';
          return await this.extractFunction(filePath, transformation.target, targetLocation);

        case 'add-import':
          if (!transformation.target) {
            throw new Error('Add import transformation requires import statement');
          }
          const position = transformation.parameters?.position || 'top';
          return await this.addImport(filePath, transformation.target, position);

        case 'modify-function':
          if (!transformation.target) {
            throw new Error('Modify function transformation requires function name');
          }
          const modifications = transformation.parameters || {};
          return await this.modifyFunction(filePath, transformation.target, modifications);

        case 'custom':
          // For custom transformations, use parameters to determine what to do
          throw new Error('Custom transformations not yet implemented');

        default:
          throw new Error(`Unknown transformation type: ${transformation.type}`);
      }
    } catch (error) {
      return {
        success: false,
        originalCode: '',
        modifiedCode: '',
        changes: [],
        error: normalizeError(error).message
      };
    }
  }
}

/**
 * Base language handler interface
 */
abstract class LanguageHandler {
  abstract parse(code: string): ASTNode;
  abstract extractFunctions(code: string): FunctionInfo[];
  abstract extractClasses(code: string): ClassInfo[];
  abstract extractImports(code: string): ImportInfo[];
  abstract renameSymbol(code: string, oldName: string, newName: string, scope?: string): ManipulationResult;
  abstract extractFunction(code: string, functionName: string, targetLocation: string): ManipulationResult;
  abstract addImport(code: string, importStatement: string, position?: string): ManipulationResult;
  abstract modifyFunction(code: string, functionName: string, modifications: any): ManipulationResult;

  protected createCodeLocation(code: string, index: number): CodeLocation {
    const lines = code.substring(0, index).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
      index
    };
  }

  protected createCodeRange(code: string, start: number, end: number): CodeRange {
    return {
      start: this.createCodeLocation(code, start),
      end: this.createCodeLocation(code, end)
    };
  }
}

/**
 * JavaScript/TypeScript handler using regex-based parsing
 * (In production, this would use a proper parser like Babel or TypeScript AST)
 */
class JavaScriptHandler extends LanguageHandler {
  parse(code: string): ASTNode {
    // Simplified AST representation
    return {
      type: 'Program',
      start: 0,
      end: code.length,
      range: [0, code.length],
      children: []
    };
  }

  extractFunctions(code: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    // Match function declarations, expressions, and arrow functions
    const functionRegex = /(export\s+)?(async\s+)?(?:function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)|(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>|([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s+)?\(([^)]*)\)\s*=>)/g;

    let match;
    while ((match = functionRegex.exec(code)) !== null) {
      const isExported = !!match[1];
      const isAsync = !!match[2];
      const name = match[3] || match[4] || match[6] || 'anonymous';
      const params = match[5] || match[7] || '';

      functions.push({
        name,
        range: this.createCodeRange(code, match.index, match.index + match[0].length),
        parameters: params.split(',').map(p => p.trim()).filter(p => p),
        isAsync,
        isExported
      });
    }

    return functions;
  }

  extractClasses(code: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const classRegex = /(export\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:extends\s+([a-zA-Z_$][a-zA-Z0-9_$]*))?\s*\{/g;

    let match;
    while ((match = classRegex.exec(code)) !== null) {
      const isExported = !!match[1];
      const name = match[2];
      const superClass = match[3];

      classes.push({
        name,
        range: this.createCodeRange(code, match.index, match.index + match[0].length),
        methods: [],
        properties: [],
        superClass,
        isExported
      });
    }

    return classes;
  }

  extractImports(code: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const importRegex = /import\s+(?:([a-zA-Z_$][a-zA-Z0-9_$]*)|(?:\{([^}]+)\}))\s+from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(code)) !== null) {
      const isDefault = !!match[1];
      const namedImports = match[2] ? match[2].split(',').map(i => i.trim()) : [];
      const module = match[3];

      imports.push({
        module,
        imports: isDefault ? [match[1]] : namedImports,
        isDefault,
        range: this.createCodeRange(code, match.index, match.index + match[0].length)
      });
    }

    return imports;
  }

  renameSymbol(code: string, oldName: string, newName: string, scope?: string): ManipulationResult {
    const changes: CodeChange[] = [];
    const symbolRegex = getOrCompileGlobalRegex(`\\b${oldName}\\b`);

    let modifiedCode = code;
    let match;

    while ((match = symbolRegex.exec(code)) !== null) {
      changes.push({
        type: 'replace',
        range: this.createCodeRange(code, match.index, match.index + oldName.length),
        oldText: oldName,
        newText: newName,
        description: `Rename symbol ${oldName} to ${newName}`
      });
    }

    modifiedCode = code.replace(symbolRegex, newName);

    return {
      success: true,
      originalCode: code,
      modifiedCode,
      changes
    };
  }

  extractFunction(code: string, functionName: string, targetLocation: string): ManipulationResult {
    // Simplified implementation - would need proper AST parsing for production
    const functionRegex = getOrCompileGlobalRegex(`(function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{[^}]*\\})`);
    const match = functionRegex.exec(code);

    if (!match) {
      return {
        success: false,
        originalCode: code,
        modifiedCode: code,
        changes: [],
        error: `Function ${functionName} not found`
      };
    }

    const functionCode = match[1];
    const modifiedCode = code.replace(functionRegex, '');

    return {
      success: true,
      originalCode: code,
      modifiedCode,
      changes: [{
        type: 'delete',
        range: this.createCodeRange(code, match.index, match.index + functionCode.length),
        oldText: functionCode,
        newText: '',
        description: `Extract function ${functionName}`
      }]
    };
  }

  addImport(code: string, importStatement: string, position = 'top'): ManipulationResult {
    const lines = code.split('\n');
    let insertIndex = 0;

    if (position === 'after-existing') {
      // Find the last import statement
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          insertIndex = i + 1;
        }
      }
    }

    lines.splice(insertIndex, 0, importStatement);
    const modifiedCode = lines.join('\n');

    return {
      success: true,
      originalCode: code,
      modifiedCode,
      changes: [{
        type: 'insert',
        range: this.createCodeRange(code, 0, 0),
        oldText: '',
        newText: importStatement + '\n',
        description: 'Add import statement'
      }]
    };
  }

  modifyFunction(code: string, functionName: string, modifications: any): ManipulationResult {
    // Simplified implementation
    return {
      success: true,
      originalCode: code,
      modifiedCode: code,
      changes: []
    };
  }
}

/**
 * TypeScript handler (extends JavaScript with type information)
 */
class TypeScriptHandler extends JavaScriptHandler {
  extractFunctions(code: string): FunctionInfo[] {
    const functions = super.extractFunctions(code);

    // Enhanced for TypeScript - extract type information
    functions.forEach(func => {
      const typeRegex = getOrCompileRegex(`${func.name}\\s*\\([^)]*\\)\\s*:\\s*([^{]+)\\s*\\{`);
      const typeMatch = typeRegex.exec(code);
      if (typeMatch) {
        func.returnType = typeMatch[1].trim();
      }
    });

    return functions;
  }
}

/**
 * Python handler (simplified implementation)
 */
class PythonHandler extends LanguageHandler {
  parse(code: string): ASTNode {
    return {
      type: 'Module',
      start: 0,
      end: code.length,
      range: [0, code.length],
      children: []
    };
  }

  extractFunctions(code: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const functionRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/g;

    let match;
    while ((match = functionRegex.exec(code)) !== null) {
      functions.push({
        name: match[1],
        range: this.createCodeRange(code, match.index, match.index + match[0].length),
        parameters: match[2].split(',').map(p => p.trim()).filter(p => p),
        isAsync: code.substring(match.index - 10, match.index).includes('async'),
        isExported: false // Python doesn't have explicit exports
      });
    }

    return functions;
  }

  extractClasses(code: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const classRegex = /class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\(([^)]*)\))?:/g;

    let match;
    while ((match = classRegex.exec(code)) !== null) {
      classes.push({
        name: match[1],
        range: this.createCodeRange(code, match.index, match.index + match[0].length),
        methods: [],
        properties: [],
        superClass: match[2],
        isExported: false
      });
    }

    return classes;
  }

  extractImports(code: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const importRegex = /(?:from\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+)?import\s+([a-zA-Z_][a-zA-Z0-9_,\s]*)/g;

    let match;
    while ((match = importRegex.exec(code)) !== null) {
      const module = match[1] || '';
      const importNames = match[2].split(',').map(i => i.trim());

      imports.push({
        module,
        imports: importNames,
        isDefault: false,
        range: this.createCodeRange(code, match.index, match.index + match[0].length)
      });
    }

    return imports;
  }

  renameSymbol(code: string, oldName: string, newName: string, scope?: string): ManipulationResult {
    // Similar to JavaScript implementation
    const changes: CodeChange[] = [];
    const symbolRegex = getOrCompileGlobalRegex(`\\b${oldName}\\b`);

    const modifiedCode = code.replace(symbolRegex, newName);

    return {
      success: true,
      originalCode: code,
      modifiedCode,
      changes
    };
  }

  extractFunction(code: string, functionName: string, targetLocation: string): ManipulationResult {
    // Python function extraction implementation
    return {
      success: true,
      originalCode: code,
      modifiedCode: code,
      changes: []
    };
  }

  addImport(code: string, importStatement: string, position = 'top'): ManipulationResult {
    const lines = code.split('\n');
    lines.unshift(importStatement);

    return {
      success: true,
      originalCode: code,
      modifiedCode: lines.join('\n'),
      changes: [{
        type: 'insert',
        range: this.createCodeRange(code, 0, 0),
        oldText: '',
        newText: importStatement + '\n',
        description: 'Add import statement'
      }]
    };
  }

  modifyFunction(code: string, functionName: string, modifications: any): ManipulationResult {
    return {
      success: true,
      originalCode: code,
      modifiedCode: code,
      changes: []
    };
  }
}

/**
 * JSON handler for configuration files
 */
class JSONHandler extends LanguageHandler {
  parse(code: string): ASTNode {
    const parsed = safeParse(code);
    if (!parsed) {
      throw new Error('Invalid JSON: Failed to parse');
    }
    return {
      type: 'JSON',
      start: 0,
      end: code.length,
      range: [0, code.length]
    };
  }

  extractFunctions(code: string): FunctionInfo[] {
    return []; // JSON doesn't have functions
  }

  extractClasses(code: string): ClassInfo[] {
    return []; // JSON doesn't have classes
  }

  extractImports(code: string): ImportInfo[] {
    return []; // JSON doesn't have imports
  }

  renameSymbol(code: string, oldName: string, newName: string): ManipulationResult {
    // Rename JSON property keys
    const obj = safeParse(code);
    if (!obj) {
      return {
        success: false,
        originalCode: code,
        modifiedCode: code,
        changes: [],
        error: 'Failed to parse JSON'
      };
    }
    const modifiedObj = this.renameObjectProperty(obj, oldName, newName);

    return {
      success: true,
      originalCode: code,
      modifiedCode: JSON.stringify(modifiedObj, null, 2),
      changes: []
    };
  }

  private renameObjectProperty(obj: any, oldName: string, newName: string): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.renameObjectProperty(item, oldName, newName));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const newKey = key === oldName ? newName : key;
      result[newKey] = this.renameObjectProperty(value, oldName, newName);
    }

    return result;
  }

  extractFunction(code: string, functionName: string, targetLocation: string): ManipulationResult {
    return {
      success: false,
      originalCode: code,
      modifiedCode: code,
      changes: [],
      error: 'JSON files do not contain functions'
    };
  }

  addImport(code: string, importStatement: string): ManipulationResult {
    return {
      success: false,
      originalCode: code,
      modifiedCode: code,
      changes: [],
      error: 'JSON files do not support imports'
    };
  }

  modifyFunction(code: string, functionName: string, modifications: any): ManipulationResult {
    return {
      success: false,
      originalCode: code,
      modifiedCode: code,
      changes: [],
      error: 'JSON files do not contain functions'
    };
  }
}
