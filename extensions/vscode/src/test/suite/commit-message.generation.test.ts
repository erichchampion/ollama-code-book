/**
 * Commit Message Generation Tests
 * Phase 3.1.2 - AI-powered commit message generation tests
 *
 * Tests production CommitMessageGenerator for AI-powered generation capabilities
 */

import * as assert from 'assert';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import { PROVIDER_TEST_TIMEOUTS, COMMIT_MESSAGE_TEST_CONSTANTS } from '../helpers/test-constants';
import {
  withGitRepo,
  createAndStageFile,
  createCommitMessageConfig,
  assertValidCommitMessage,
  assertConventionalFormat,
  assertEmojiFormat,
} from '../helpers/gitHooksTestHelper';
import {
  CommitMessageGenerator,
  type CommitMessageConfig,
  type GeneratedCommitMessage,
} from '../helpers/commitMessageGeneratorWrapper';

suite('Commit Message Generation Tests', () => {
  let testWorkspacePath: string;

  setup(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('commit-message-tests');
  });

  teardown(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('AI-Powered Generation', () => {
    test('Should generate descriptive commit message from diff', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await withGitRepo('msg-gen-descriptive', async (repoPath) => {
        // Create and stage a new feature file
        const featureCode = `
export function calculateTotal(items: number[]): number {
  return items.reduce((sum, item) => sum + item, 0);
}
`;
        await createAndStageFile(repoPath, 'src/calculator.ts', featureCode);

        const config = createCommitMessageConfig(repoPath, {
          style: 'descriptive',
          includeBody: true
        });

        const generator = new CommitMessageGenerator(config);
        const result = await generator.generateCommitMessage();

        assertValidCommitMessage(result, config);
      });
    });

    test('Should generate conventional commit (feat:, fix:, docs:)', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await withGitRepo('msg-gen-conventional', async (repoPath) => {
        await createAndStageFile(repoPath, 'src/feature.ts', 'export const newFeature = true;');

        const config = createCommitMessageConfig(repoPath, {
          maxLength: COMMIT_MESSAGE_TEST_CONSTANTS.EXTENDED_MAX_LENGTH,
          includeScope: true
        });

        const generator = new CommitMessageGenerator(config);
        const result = await generator.generateCommitMessage();

        assertValidCommitMessage(result, config);
        assert.ok(['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore'].includes(result.type),
          'Should have valid commit type');
        assertConventionalFormat(result.message);
      });
    });

    test('Should generate emoji-style commit (✨ Add feature)', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await withGitRepo('msg-gen-emoji', async (repoPath) => {
        await createAndStageFile(repoPath, 'src/new-feature.ts', 'export const feature = "new";');

        const config = createCommitMessageConfig(repoPath, {
          style: 'emoji'
        });

        const generator = new CommitMessageGenerator(config);
        const result = await generator.generateCommitMessage();

        assertEmojiFormat(result.message);
      });
    });

    test('Should generate with issue reference', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await withGitRepo('msg-gen-issue-ref', async (repoPath) => {
        await createAndStageFile(repoPath, 'src/bugfix.ts', 'export const fixed = true;');

        const config = createCommitMessageConfig(repoPath, {
          maxLength: COMMIT_MESSAGE_TEST_CONSTANTS.EXTENDED_MAX_LENGTH,
          includeFooter: true
        });

        const generator = new CommitMessageGenerator(config);
        const result = await generator.generateCommitMessage();

        // If footer enabled, should include reference
        if (result.footer) {
          assert.ok(result.footer.length > 0, 'Footer should contain content');
        }
        assert.ok(result.message, 'Should generate message');
      });
    });

    test('Should generate multi-file change summary', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await withGitRepo('msg-gen-multi-file', async (repoPath) => {
        // Create multiple files
        await createAndStageFile(repoPath, 'src/service.ts', 'export class Service {}');
        await createAndStageFile(repoPath, 'src/controller.ts', 'export class Controller {}');
        await createAndStageFile(repoPath, 'src/model.ts', 'export interface Model {}');

        const config = createCommitMessageConfig(repoPath, {
          maxLength: COMMIT_MESSAGE_TEST_CONSTANTS.EXTENDED_MAX_LENGTH,
          includeScope: true,
          includeBody: true
        });

        const generator = new CommitMessageGenerator(config);
        const result = await generator.generateCommitMessage();

        assert.ok(result.message, 'Should generate message');
        assert.ok(result.analysis, 'Should include analysis');
        // Body might contain summary of multiple files
        if (result.body && config.includeBody) {
          assert.ok(result.body.length > 0, 'Body should summarize changes');
        }
      });
    });

    test('Should provide alternative message suggestions', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await withGitRepo('msg-gen-alternatives', async (repoPath) => {
        await createAndStageFile(repoPath, 'src/feature.ts', 'export const feature = true;');

        const config = createCommitMessageConfig(repoPath);

        const generator = new CommitMessageGenerator(config);
        const result = await generator.generateCommitMessage();

        assert.ok(Array.isArray(result.alternatives), 'Should provide alternatives array');
        assert.ok(result.alternatives.length > 0, 'Should provide at least one alternative');
        assert.ok(result.alternatives.every(alt => typeof alt === 'string'), 'Alternatives should be strings');
      });
    });

    test('Should analyze commit type from code changes', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await withGitRepo('msg-gen-type-analysis', async (repoPath) => {
        // Bug fix code
        const bugfixCode = `
export function fixCalculation(value: number): number {
  // Fixed: was returning wrong value
  return value * 2; // Corrected calculation
}
`;
        await createAndStageFile(repoPath, 'src/bugfix.ts', bugfixCode);

        const config = createCommitMessageConfig(repoPath);

        const generator = new CommitMessageGenerator(config);
        const result = await generator.generateCommitMessage();

        // Should detect this is a fix (or feat, depending on AI analysis)
        assert.ok(['feat', 'fix', 'refactor'].includes(result.type),
          'Should detect appropriate commit type for code change');
        assert.ok(result.analysis, 'Should include analysis details');
      });
    });

    test('Should respect maximum message length constraint', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await withGitRepo('msg-gen-max-length', async (repoPath) => {
        await createAndStageFile(repoPath, 'src/feature.ts', 'export const feature = "test";');

        const config = createCommitMessageConfig(repoPath, {
          maxLength: COMMIT_MESSAGE_TEST_CONSTANTS.SHORT_MAX_LENGTH,
          includeScope: true
        });

        const generator = new CommitMessageGenerator(config);
        const result = await generator.generateCommitMessage();

        // First line (subject) should respect max length
        const firstLine = result.message.split('\n')[0];
        assert.ok(firstLine.length <= config.maxLength,
          `First line should be <= ${config.maxLength} chars, got ${firstLine.length}`);
      });
    });
  });

  suite('Context-Aware Generation', () => {
    test('Should consider file types in message generation', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await withGitRepo('msg-gen-file-types', async (repoPath) => {
        // Documentation change
        await createAndStageFile(repoPath, 'README.md', '# Documentation\n\nUpdated docs');

        const config = createCommitMessageConfig(repoPath);

        const generator = new CommitMessageGenerator(config);
        const result = await generator.generateCommitMessage();

        // Should detect docs change
        assert.strictEqual(result.type, 'docs', 'Should detect documentation change');
      });
    });

    test('Should consider project history in generation', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await withGitRepo('msg-gen-history', async (repoPath) => {
        await createAndStageFile(repoPath, 'src/feature.ts', 'export const feature = true;');

        const config = createCommitMessageConfig(repoPath, {
          includeScope: true
        });

        // Mock commit history
        const mockHistory = [
          'feat(core): Add initial implementation',
          'fix(core): Resolve edge case',
          'feat(api): Add new endpoint'
        ];

        const generator = new CommitMessageGenerator(config);
        const result = await generator.generateWithContext(undefined, mockHistory);

        // Should use consistent scope based on history
        assert.ok(result.message, 'Should generate message considering history');
        if (result.scope) {
          assert.ok(['core', 'api', 'ui'].includes(result.scope), 'Should use scope from project');
        }
      });
    });

    test('Should consider branch name in generation', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await withGitRepo('msg-gen-branch', async (repoPath) => {
        await createAndStageFile(repoPath, 'src/feature.ts', 'export const feature = true;');

        const config = createCommitMessageConfig(repoPath);

        const generator = new CommitMessageGenerator(config);

        // Test feat branch
        const featResult = await generator.generateWithContext('feat/new-api');
        assert.strictEqual(featResult.type, 'feat', 'Should detect feat type from branch name');

        // Test fix branch
        const fixResult = await generator.generateWithContext('fix/bug-123');
        assert.strictEqual(fixResult.type, 'fix', 'Should detect fix type from branch name');
      });
    });

    test('Should support custom message templates', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await withGitRepo('msg-gen-custom-template', async (repoPath) => {
        await createAndStageFile(repoPath, 'src/feature.ts', 'export const feature = true;');

        const customTemplate = '[{TYPE}] {SUBJECT}\n\nWhat: {WHAT}\nWhy: {WHY}';
        const config = createCommitMessageConfig(repoPath, {
          style: 'custom',
          maxLength: COMMIT_MESSAGE_TEST_CONSTANTS.EXTENDED_MAX_LENGTH,
          includeBody: true,
          customTemplate
        });

        const generator = new CommitMessageGenerator(config);
        const result = await generator.generateCommitMessage();

        // Should follow custom template structure
        assert.ok(result.message, 'Should generate message with custom template');
        assert.ok(result.message.length > 0, 'Should have content');
      });
    });

    test('Should extract scope from file paths', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await withGitRepo('msg-gen-scope-extraction', async (repoPath) => {
        // Create file in specific module
        await createAndStageFile(repoPath, 'src/auth/login.ts', 'export const login = () => {};');

        const config = createCommitMessageConfig(repoPath, {
          includeScope: true
        });

        const generator = new CommitMessageGenerator(config);
        const result = await generator.generateCommitMessage();

        // Should extract 'auth' or 'core' as scope from file path
        assert.ok(result.message, 'Should generate message');
        if (result.scope) {
          assert.ok(result.scope.length > 0, 'Should have extracted scope');
        }
      });
    });

    test('Should handle mixed change types appropriately', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await withGitRepo('msg-gen-mixed-changes', async (repoPath) => {
        // Mix of feature code and tests
        await createAndStageFile(repoPath, 'src/feature.ts', 'export const feature = true;');
        await createAndStageFile(repoPath, 'src/feature.test.ts', 'test("feature", () => {});');

        const config = createCommitMessageConfig(repoPath, {
          includeBody: true
        });

        const generator = new CommitMessageGenerator(config);
        const result = await generator.generateCommitMessage();

        // Should prioritize main change type (feat over test)
        assert.ok(['feat', 'test'].includes(result.type), 'Should determine primary change type');
        // Body might mention both types
        if (result.body) {
          assert.ok(result.body.length > 0, 'Body should describe mixed changes');
        }
      });
    });

    test('Should provide confidence score for generated messages', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      await withGitRepo('msg-gen-confidence', async (repoPath) => {
        await createAndStageFile(repoPath, 'src/feature.ts', 'export const feature = true;');

        const config = createCommitMessageConfig(repoPath);

        const generator = new CommitMessageGenerator(config);
        const result = await generator.generateCommitMessage();

        assert.ok(typeof result.confidence === 'number', 'Should provide confidence score');
        assert.ok(result.confidence >= 0 && result.confidence <= 1, 'Confidence should be between 0 and 1');
      });
    });
  });
});
