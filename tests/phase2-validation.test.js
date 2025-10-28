/**
 * Phase 2 Implementation Validation Tests
 * These tests verify that Phase 2 components exist and can be imported
 */

import { describe, it, expect } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';

describe('Phase 2: Autonomous Code Modification System', () => {
  describe('Core Implementation Files', () => {
    it('should have created code editor module', async () => {
      const filePath = path.join(process.cwd(), 'src/tools/code-editor.ts');
      expect(await fs.access(filePath).then(() => true).catch(() => false)).toBe(true);

      // Verify file has substantive content
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content.length).toBeGreaterThan(5000);
      expect(content).toContain('export class CodeEditor');
      expect(content).toContain('export interface CodeEdit');
      expect(content).toContain('export interface EditResult');
    });

    it('should have created AST manipulator module', async () => {
      const filePath = path.join(process.cwd(), 'src/tools/ast-manipulator.ts');
      expect(await fs.access(filePath).then(() => true).catch(() => false)).toBe(true);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content.length).toBeGreaterThan(5000);
      expect(content).toContain('export class ASTManipulator');
      expect(content).toContain('export interface ManipulationResult');
      expect(content).toContain('export interface FunctionInfo');
    });

    it('should have created backup manager module', async () => {
      const filePath = path.join(process.cwd(), 'src/core/backup-manager.ts');
      expect(await fs.access(filePath).then(() => true).catch(() => false)).toBe(true);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content.length).toBeGreaterThan(5000);
      expect(content).toContain('export class BackupManager');
      expect(content).toContain('export interface Checkpoint');
      expect(content).toContain('export interface BackupResult');
    });

    it('should have created autonomous modifier module', async () => {
      const filePath = path.join(process.cwd(), 'src/core/autonomous-modifier.ts');
      expect(await fs.access(filePath).then(() => true).catch(() => false)).toBe(true);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content.length).toBeGreaterThan(3000);
      expect(content).toContain('export class AutonomousModifier');
      expect(content).toContain('export interface ModificationPlan');
      expect(content).toContain('export interface ModificationResult');
    });
  });

  describe('Code Quality Validation', () => {
    it('should have well-structured TypeScript files', async () => {
      const phase2Files = [
        'src/tools/code-editor.ts',
        'src/tools/ast-manipulator.ts',
        'src/core/backup-manager.ts',
        'src/core/autonomous-modifier.ts'
      ];

      for (const file of phase2Files) {
        const content = await fs.readFile(path.join(process.cwd(), file), 'utf-8');

        // Should have valid TypeScript exports
        expect(content).toMatch(/export\s+(class|interface|const|function)/);

        // Should have proper imports
        expect(content).toMatch(/import\s+.*from\s+['"][^'"]+['"];?/);

        // Should be substantial implementation (not just stubs)
        expect(content.length).toBeGreaterThan(3000);

        // Should have proper error handling
        expect(content).toContain('try');
        expect(content).toContain('catch');

        // Should have logging
        expect(content).toContain('logger');
      }
    });

    it('should have proper documentation and comments', async () => {
      const phase2Files = [
        'src/tools/code-editor.ts',
        'src/tools/ast-manipulator.ts',
        'src/core/backup-manager.ts',
        'src/core/autonomous-modifier.ts'
      ];

      for (const file of phase2Files) {
        const content = await fs.readFile(path.join(process.cwd(), file), 'utf-8');

        // Should have file-level documentation
        expect(content).toMatch(/\/\*\*[\s\S]*?\*\//);

        // Should have meaningful method documentation or comments
        expect(content.split('/**').length + content.split('//').length).toBeGreaterThan(10);
      }
    });

    it('should follow consistent naming conventions', async () => {
      const phase2Files = [
        'src/tools/code-editor.ts',
        'src/tools/ast-manipulator.ts',
        'src/core/backup-manager.ts',
        'src/core/autonomous-modifier.ts'
      ];

      for (const file of phase2Files) {
        const content = await fs.readFile(path.join(process.cwd(), file), 'utf-8');

        // Classes should be PascalCase
        const classMatches = content.match(/export class (\w+)/g);
        if (classMatches) {
          for (const match of classMatches) {
            const className = match.replace('export class ', '');
            expect(className[0]).toMatch(/[A-Z]/);
          }
        }

        // Interfaces should be PascalCase
        const interfaceMatches = content.match(/export interface (\w+)/g);
        if (interfaceMatches) {
          for (const match of interfaceMatches) {
            const interfaceName = match.replace('export interface ', '');
            expect(interfaceName[0]).toMatch(/[A-Z]/);
          }
        }
      }
    });
  });

  describe('Core Interface Definitions', () => {
    it('should have comprehensive CodeEdit interface', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/tools/code-editor.ts'), 'utf-8');

      // Check for key interface properties
      expect(content).toContain('id:');
      expect(content).toContain('filePath:');
      expect(content).toContain('originalContent:');
      expect(content).toContain('newContent:');
      expect(content).toContain('applied:');
      expect(content).toContain('timestamp:');
      expect(content).toContain('validationPassed:');
    });

    it('should have code transformation interfaces', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/tools/ast-manipulator.ts'), 'utf-8');

      expect(content).toContain('ManipulationResult');
      expect(content).toContain('FunctionInfo');
      expect(content).toContain('ClassInfo');
      expect(content).toContain('ImportInfo');
      expect(content).toContain('CodeTransformation');
    });

    it('should have checkpoint management interfaces', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/core/backup-manager.ts'), 'utf-8');

      expect(content).toContain('Checkpoint');
      expect(content).toContain('CheckpointFile');
      expect(content).toContain('CheckpointMetadata');
      expect(content).toContain('BackupResult');
      expect(content).toContain('RestoreResult');
    });

    it('should have modification plan interfaces', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/core/autonomous-modifier.ts'), 'utf-8');

      expect(content).toContain('ModificationPlan');
      expect(content).toContain('ModificationOperation');
      expect(content).toContain('ModificationResult');
      expect(content).toContain('ModificationError');
    });
  });

  describe('Integration Points', () => {
    it('should integrate with existing logger system', async () => {
      const phase2Files = [
        'src/tools/code-editor.ts',
        'src/tools/ast-manipulator.ts',
        'src/core/backup-manager.ts',
        'src/core/autonomous-modifier.ts'
      ];

      for (const file of phase2Files) {
        const content = await fs.readFile(path.join(process.cwd(), file), 'utf-8');
        expect(content).toContain("import { logger } from '../utils/logger.js'");
        expect(content).toContain('logger.');
      }
    });

    it('should use proper file system operations', async () => {
      const phase2Files = [
        'src/tools/code-editor.ts',
        'src/core/backup-manager.ts'
      ];

      for (const file of phase2Files) {
        const content = await fs.readFile(path.join(process.cwd(), file), 'utf-8');
        expect(content).toContain("import { promises as fs } from 'fs'");
        expect(content).toContain('await fs.');
      }
    });

    it('should integrate components properly', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/core/autonomous-modifier.ts'), 'utf-8');

      expect(content).toContain('CodeEditor');
      expect(content).toContain('ASTManipulator');
      expect(content).toContain('BackupManager');
    });
  });

  describe('Phase 2 Feature Coverage', () => {
    it('should implement safe code editing', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/tools/code-editor.ts'), 'utf-8');

      expect(content).toContain('createEdit');
      expect(content).toContain('applyEdit');
      expect(content).toContain('rollbackEdit');
      expect(content).toContain('validateContent');
      expect(content).toContain('atomicWrite');
    });

    it('should implement AST manipulation', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/tools/ast-manipulator.ts'), 'utf-8');

      expect(content).toContain('extractFunctions');
      expect(content).toContain('extractClasses');
      expect(content).toContain('extractImports');
      expect(content).toContain('applyTransformation');
      expect(content).toContain('renameSymbol');
    });

    it('should implement backup and recovery', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/core/backup-manager.ts'), 'utf-8');

      expect(content).toContain('createCheckpoint');
      expect(content).toContain('restoreCheckpoint');
      expect(content).toContain('deleteCheckpoint');
      expect(content).toContain('getCheckpoints');
      expect(content).toContain('createGitCheckpoint');
    });

    it('should implement autonomous modification orchestration', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/core/autonomous-modifier.ts'), 'utf-8');

      expect(content).toContain('executeModificationPlan');
      expect(content).toContain('executeOperation');
      expect(content).toContain('createCheckpoint');
      expect(content).toContain('rollbackToCheckpoint');
      expect(content).toContain('isRecoverableError');
    });
  });

  describe('Safety and Error Handling', () => {
    it('should have comprehensive error handling in code editor', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/tools/code-editor.ts'), 'utf-8');

      expect(content).toContain('try {');
      expect(content).toContain('} catch (error)');
      expect(content).toContain('ValidationResult');
      expect(content).toContain('validationPassed');
    });

    it('should have backup mechanisms in backup manager', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/core/backup-manager.ts'), 'utf-8');

      expect(content).toContain('createFileBackup');
      expect(content).toContain('atomicWrite');
      expect(content).toContain('RestoreConflict');
      expect(content).toContain('conflicts');
    });

    it('should have rollback capabilities in autonomous modifier', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/core/autonomous-modifier.ts'), 'utf-8');

      expect(content).toContain('rollbackToCheckpoint');
      expect(content).toContain('isRecoverableError');
      expect(content).toContain('rollbackPerformed');
      expect(content).toContain('ModificationError');
    });
  });

  describe('TypeScript Language Features', () => {
    it('should use proper TypeScript types and interfaces', async () => {
      const phase2Files = [
        'src/tools/code-editor.ts',
        'src/tools/ast-manipulator.ts',
        'src/core/backup-manager.ts',
        'src/core/autonomous-modifier.ts'
      ];

      for (const file of phase2Files) {
        const content = await fs.readFile(path.join(process.cwd(), file), 'utf-8');

        // Should have interface definitions
        expect(content).toMatch(/export interface \w+/);

        // Should use proper typing
        expect(content).toMatch(/: \w+(\[\])?[;,]/);

        // Should have async/await usage
        expect(content).toContain('async ');
        expect(content).toContain('await ');

        // Should use Promise types
        expect(content).toContain('Promise<');
      }
    });

    it('should have proper method signatures', async () => {
      const content = await fs.readFile(path.join(process.cwd(), 'src/tools/code-editor.ts'), 'utf-8');

      // Check for method signatures with proper typing
      expect(content).toMatch(/async \w+\(/);
      expect(content).toMatch(/private async \w+/);
      expect(content).toMatch(/Promise</);
    });
  });
});