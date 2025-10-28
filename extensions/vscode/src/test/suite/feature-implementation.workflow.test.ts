/**
 * Feature Implementation Workflow Tests
 * Tests for autonomous feature development - specification parsing and implementation planning
 *
 * Tests production FeatureImplementationWorkflow for automated feature development
 */

import * as assert from 'assert';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import { PROVIDER_TEST_TIMEOUTS, FEATURE_IMPLEMENTATION_CONSTANTS } from '../helpers/test-constants';
import {
  FeatureImplementationWorkflow,
  FeatureSpecification,
  ParsedRequirement,
  ComplexityAnalysis,
  TimeEstimation,
  ResourceRequirements,
  ImplementationPlan,
} from '../helpers/featureImplementationWrapper';

suite('Feature Implementation Workflow Tests', () => {
  let testWorkspacePath: string;

  setup(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
    testWorkspacePath = await createTestWorkspace('feature-implementation-tests');
  });

  teardown(async function () {
    this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
    await cleanupTestWorkspace(testWorkspacePath);
  });

  suite('Specification Parsing', () => {
    test('Should parse text specification to structured requirements', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: FEATURE_IMPLEMENTATION_CONSTANTS.MODERATE_SPEC_TEXT,
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow();
      const requirements = await workflow.parseSpecification(spec);

      assert.ok(requirements.length > 0, 'Should parse at least one requirement');
      assert.ok(requirements.every((r) => r.id.startsWith('REQ-')), 'All requirements should have REQ- prefix');
      assert.ok(requirements.every((r) => r.description.length > 0), 'All requirements should have description');
      assert.ok(requirements.every((r) => r.priority), 'All requirements should have priority');
      assert.ok(requirements.every((r) => r.category), 'All requirements should have category');
      assert.ok(
        requirements.every((r) => r.acceptanceCriteria.length > 0),
        'All requirements should have acceptance criteria'
      );
    });

    test('Should parse technical specification with acceptance criteria', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: 'Implement OAuth2 authentication flow',
        type: 'technical',
        acceptanceCriteria: [
          'User can login with Google OAuth',
          'User can login with GitHub OAuth',
          'OAuth tokens are securely stored',
          'Token refresh is handled automatically',
        ],
      };

      const workflow = new FeatureImplementationWorkflow();
      const requirements = await workflow.parseSpecification(spec);

      assert.ok(requirements.length > 0, 'Should parse requirements');
      const firstReq = requirements[0];
      assert.ok(firstReq.acceptanceCriteria.length >= 4, 'Should include provided acceptance criteria');
      assert.strictEqual(firstReq.acceptanceCriteria[0], 'User can login with Google OAuth');
    });

    test('Should perform complexity analysis (simple, moderate, complex)', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const workflow = new FeatureImplementationWorkflow();

      // Test simple feature
      const simpleSpec: FeatureSpecification = {
        text: FEATURE_IMPLEMENTATION_CONSTANTS.SIMPLE_SPEC_TEXT,
        type: 'text',
      };
      const simpleReqs = await workflow.parseSpecification(simpleSpec);
      const simpleComplexity = await workflow.analyzeComplexity(simpleReqs);

      assert.strictEqual(simpleComplexity.level, 'simple', 'Simple feature should be rated simple');
      assert.ok(simpleComplexity.score < 50, 'Simple feature should have low complexity score');

      // Test complex feature
      const complexSpec: FeatureSpecification = {
        text: FEATURE_IMPLEMENTATION_CONSTANTS.COMPLEX_SPEC_TEXT,
        type: 'text',
      };
      const complexReqs = await workflow.parseSpecification(complexSpec);
      const complexComplexity = await workflow.analyzeComplexity(complexReqs);

      assert.ok(
        complexComplexity.level === 'complex' || complexComplexity.level === 'very_complex',
        'Complex feature should be rated complex or very_complex'
      );
      assert.ok(complexComplexity.score > 50, 'Complex feature should have high complexity score');
    });

    test('Should estimate implementation time', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: FEATURE_IMPLEMENTATION_CONSTANTS.MODERATE_SPEC_TEXT,
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow();
      const requirements = await workflow.parseSpecification(spec);
      const complexity = await workflow.analyzeComplexity(requirements);
      const timeEstimation = await workflow.estimateTime(requirements, complexity);

      assert.ok(timeEstimation.hours > 0, 'Should estimate hours');
      assert.ok(timeEstimation.days > 0, 'Should estimate days');
      assert.ok(timeEstimation.confidence >= 0 && timeEstimation.confidence <= 100, 'Confidence should be 0-100');
      assert.ok(timeEstimation.breakdown.design > 0, 'Should have design phase hours');
      assert.ok(timeEstimation.breakdown.implementation > 0, 'Should have implementation phase hours');
      assert.ok(timeEstimation.breakdown.testing > 0, 'Should have testing phase hours');
      assert.ok(timeEstimation.breakdown.review > 0, 'Should have review phase hours');

      // Verify breakdown sums to total
      const sum =
        timeEstimation.breakdown.design +
        timeEstimation.breakdown.implementation +
        timeEstimation.breakdown.testing +
        timeEstimation.breakdown.review;
      assert.strictEqual(sum, timeEstimation.hours, 'Breakdown should sum to total hours');
    });

    test('Should identify resource requirements', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: 'Build a REST API with database backend and React frontend',
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow();
      const requirements = await workflow.parseSpecification(spec);
      const complexity = await workflow.analyzeComplexity(requirements);
      const resources = await workflow.identifyResources(requirements, complexity);

      assert.ok(resources.roles.length > 0, 'Should identify roles needed');
      assert.ok(resources.totalPersonHours > 0, 'Should calculate total person-hours');

      // Should identify backend, frontend, and database needs
      const hasBackend = resources.roles.some((r) => r.type === 'backend');
      const hasFrontend = resources.roles.some((r) => r.type === 'frontend');
      const hasDatabase = resources.roles.some((r) => r.type === 'database');
      const hasQA = resources.roles.some((r) => r.type === 'qa');

      assert.ok(hasBackend, 'Should identify backend need');
      assert.ok(hasFrontend, 'Should identify frontend need');
      assert.ok(hasDatabase, 'Should identify database need');
      assert.ok(hasQA, 'Should always include QA');
    });

    test('Should extract acceptance criteria from specification', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: 'Users should be able to test the search functionality',
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow();
      const requirements = await workflow.parseSpecification(spec);

      assert.ok(requirements.length > 0, 'Should parse requirements');
      const firstReq = requirements[0];
      assert.ok(firstReq.acceptanceCriteria.length > 0, 'Should have acceptance criteria');

      // Should include heuristic-based criteria
      const hasUserCriteria = firstReq.acceptanceCriteria.some((c) => c.toLowerCase().includes('user'));
      const hasTestCriteria = firstReq.acceptanceCriteria.some((c) => c.toLowerCase().includes('test'));
      assert.ok(hasUserCriteria || hasTestCriteria, 'Should generate context-aware acceptance criteria');
    });

    test('Should identify technical challenges from specification', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: 'Build a real-time chat with end-to-end encryption and must scale to handle high performance requirements',
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow();
      const requirements = await workflow.parseSpecification(spec);
      const complexity = await workflow.analyzeComplexity(requirements);

      assert.ok(complexity.technicalChallenges.length > 0, 'Should identify technical challenges');

      const challengesText = complexity.technicalChallenges.join(' ').toLowerCase();
      assert.ok(
        challengesText.includes('real-time') ||
          challengesText.includes('security') ||
          challengesText.includes('performance'),
        'Should identify real-time, security, or performance challenges'
      );
    });

    test('Should provide complexity justification', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: FEATURE_IMPLEMENTATION_CONSTANTS.COMPLEX_SPEC_TEXT,
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow();
      const requirements = await workflow.parseSpecification(spec);
      const complexity = await workflow.analyzeComplexity(requirements);

      assert.ok(complexity.justification, 'Should provide complexity justification');
      assert.ok(complexity.justification.length > 0, 'Justification should not be empty');
      assert.ok(
        complexity.justification.includes(complexity.level),
        'Justification should mention complexity level'
      );
      assert.ok(complexity.justification.includes('components'), 'Justification should mention components');
      assert.ok(complexity.justification.includes('dependencies'), 'Justification should mention dependencies');
      assert.ok(complexity.justification.includes('challenges'), 'Justification should mention challenges');
    });
  });

  suite('Implementation Decomposition', () => {
    test('Should generate multi-phase implementation plan', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: FEATURE_IMPLEMENTATION_CONSTANTS.MODERATE_SPEC_TEXT,
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow();
      const plan = await workflow.generatePlan(spec);

      assert.ok(plan.phases.length >= 3, 'Should generate at least 3 phases');
      assert.ok(plan.phases.length <= 5, 'Should not exceed 5 phases');

      // Verify phase structure
      plan.phases.forEach((phase, index) => {
        assert.strictEqual(phase.number, index + 1, 'Phases should be numbered sequentially');
        assert.ok(phase.name, 'Phase should have name');
        assert.ok(phase.description, 'Phase should have description');
        assert.ok(phase.tasks.length > 0, 'Phase should have tasks');
        assert.ok(phase.duration > 0, 'Phase should have duration');
        assert.ok(phase.milestone, 'Phase should have milestone');
      });
    });

    test('Should identify task dependencies correctly', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: FEATURE_IMPLEMENTATION_CONSTANTS.MODERATE_SPEC_TEXT,
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow();
      const plan = await workflow.generatePlan(spec);

      // Collect all tasks
      const allTasks = plan.phases.flatMap((p) => p.tasks);

      // Verify dependencies reference valid task IDs
      for (const task of allTasks) {
        for (const depId of task.dependencies) {
          const depExists = allTasks.some((t) => t.id === depId);
          assert.ok(depExists, `Task ${task.id} dependency ${depId} should reference existing task`);
        }
      }

      // Verify no circular dependencies (simplified check)
      for (const task of allTasks) {
        assert.ok(!task.dependencies.includes(task.id), 'Task should not depend on itself');
      }
    });

    test('Should identify critical path through tasks', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: FEATURE_IMPLEMENTATION_CONSTANTS.MODERATE_SPEC_TEXT,
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow();
      const plan = await workflow.generatePlan(spec);

      assert.ok(plan.criticalPath.length > 0, 'Should identify critical path');

      // Verify critical path tasks exist
      const allTasks = plan.phases.flatMap((p) => p.tasks);
      for (const criticalTaskId of plan.criticalPath) {
        const taskExists = allTasks.some((t) => t.id === criticalTaskId);
        assert.ok(taskExists, `Critical path task ${criticalTaskId} should exist`);
      }

      // Critical path should have one task per phase (or close to it)
      assert.ok(
        plan.criticalPath.length >= plan.phases.length - 1,
        'Critical path should span most phases'
      );
    });

    test('Should assess risks with mitigation strategies', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: FEATURE_IMPLEMENTATION_CONSTANTS.COMPLEX_SPEC_TEXT,
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow({ includeRiskAssessment: true });
      const plan = await workflow.generatePlan(spec);

      assert.ok(plan.risks.length > 0, 'Should identify risks for complex feature');

      // Verify risk structure
      plan.risks.forEach((risk) => {
        assert.ok(risk.id, 'Risk should have ID');
        assert.ok(risk.description, 'Risk should have description');
        assert.ok(risk.level, 'Risk should have level');
        assert.ok(risk.probability >= 0 && risk.probability <= 100, 'Probability should be 0-100');
        assert.ok(risk.impact >= 0 && risk.impact <= 100, 'Impact should be 0-100');
        assert.ok(risk.score >= 0, 'Risk score should be non-negative');
        assert.ok(risk.mitigationStrategies.length > 0, 'Risk should have mitigation strategies');
      });
    });

    test('Should generate timeline with milestones', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: FEATURE_IMPLEMENTATION_CONSTANTS.MODERATE_SPEC_TEXT,
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow();
      const plan = await workflow.generatePlan(spec);

      assert.ok(plan.milestones.length > 0, 'Should generate milestones');
      assert.strictEqual(plan.milestones.length, plan.phases.length, 'Should have one milestone per phase');

      // Verify milestone structure
      plan.milestones.forEach((milestone, index) => {
        assert.ok(milestone.name, 'Milestone should have name');
        assert.ok(milestone.date, 'Milestone should have date');
        assert.ok(milestone.deliverables.length > 0, 'Milestone should have deliverables');

        // Verify date format (YYYY-MM-DD)
        assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(milestone.date), 'Date should be in YYYY-MM-DD format');

        // Milestones should be chronologically ordered
        if (index > 0) {
          const prevDate = new Date(plan.milestones[index - 1].date);
          const currDate = new Date(milestone.date);
          assert.ok(currDate >= prevDate, 'Milestones should be chronologically ordered');
        }
      });
    });

    test('Should optimize execution order based on dependencies', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: FEATURE_IMPLEMENTATION_CONSTANTS.MODERATE_SPEC_TEXT,
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow();
      const plan = await workflow.generatePlan(spec);

      // Collect all tasks in execution order (by phase, then by task order)
      const allTasks = plan.phases.flatMap((p) => p.tasks);

      // Verify that dependencies come before dependent tasks
      for (let i = 0; i < allTasks.length; i++) {
        const task = allTasks[i];
        for (const depId of task.dependencies) {
          const depIndex = allTasks.findIndex((t) => t.id === depId);
          if (depIndex !== -1) {
            assert.ok(
              depIndex < i,
              `Dependency ${depId} should come before task ${task.id} in execution order`
            );
          }
        }
      }
    });

    test('Should break down tasks into appropriate phases', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: FEATURE_IMPLEMENTATION_CONSTANTS.MODERATE_SPEC_TEXT,
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow();
      const plan = await workflow.generatePlan(spec);

      // Should have standard phases: Design, Implementation, Testing, Review
      const phaseNames = plan.phases.map((p) => p.name.toLowerCase());
      assert.ok(phaseNames.some((n) => n.includes('design')), 'Should have design phase');
      assert.ok(phaseNames.some((n) => n.includes('implementation')), 'Should have implementation phase');
      assert.ok(phaseNames.some((n) => n.includes('test')), 'Should have testing phase');
      assert.ok(phaseNames.some((n) => n.includes('review')), 'Should have review phase');

      // Verify tasks are in correct phases
      const allTasks = plan.phases.flatMap((p) => p.tasks);
      for (const task of allTasks) {
        const phase = plan.phases.find((p) => p.number === task.phase);
        assert.ok(phase, `Task ${task.id} should belong to a valid phase`);
        assert.ok(phase.tasks.some((t) => t.id === task.id), `Task ${task.id} should be in phase ${task.phase}`);
      }
    });

    test('Should assign appropriate roles to tasks', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: 'Build a backend API with database and deploy to production',
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow();
      const plan = await workflow.generatePlan(spec);

      const allTasks = plan.phases.flatMap((p) => p.tasks);

      // Should have tasks assigned to different roles
      const roles = new Set(allTasks.map((t) => t.assignedRole));
      assert.ok(roles.size > 1, 'Tasks should be assigned to multiple different roles');

      // Backend tasks should exist
      const hasBackend = allTasks.some((t) => t.assignedRole === 'backend');
      assert.ok(hasBackend, 'Should assign tasks to backend role');

      // QA tasks should exist (testing phase)
      const hasQA = allTasks.some((t) => t.assignedRole === 'qa');
      assert.ok(hasQA, 'Should assign tasks to QA role');

      // Infrastructure tasks should exist (deployment)
      const hasInfra = allTasks.some((t) => t.assignedRole === 'infrastructure');
      assert.ok(hasInfra, 'Should assign deployment tasks to infrastructure role');
    });

    test('Should estimate task durations that sum to phase durations', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: FEATURE_IMPLEMENTATION_CONSTANTS.MODERATE_SPEC_TEXT,
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow();
      const plan = await workflow.generatePlan(spec);

      // Verify each phase's task durations sum to phase duration
      for (const phase of plan.phases) {
        const taskHoursSum = phase.tasks.reduce((sum, task) => sum + task.estimatedHours, 0);
        const tolerance = 2; // Allow small rounding differences

        assert.ok(
          Math.abs(taskHoursSum - phase.duration) <= tolerance,
          `Phase ${phase.number} task hours (${taskHoursSum}) should approximately equal phase duration (${phase.duration})`
        );
      }
    });

    test('Should prioritize tasks appropriately', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: 'Critical: Implement security features. Important: Add user dashboard. Nice to have: Add dark mode.',
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow();
      const plan = await workflow.generatePlan(spec);

      const allTasks = plan.phases.flatMap((p) => p.tasks);

      // Should have tasks with different priorities
      const priorities = new Set(allTasks.map((t) => t.priority));
      assert.ok(priorities.size > 1, 'Tasks should have different priorities');

      // Critical requirements should result in high-priority tasks
      const hasCritical = allTasks.some((t) => t.priority === 'critical');
      const hasHigh = allTasks.some((t) => t.priority === 'high');
      assert.ok(hasCritical || hasHigh, 'Should have critical or high priority tasks');
    });

    test('Should calculate resource allocation correctly', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: FEATURE_IMPLEMENTATION_CONSTANTS.MODERATE_SPEC_TEXT,
        type: 'text',
      };

      const workflow = new FeatureImplementationWorkflow();
      const plan = await workflow.generatePlan(spec);

      // Verify resource allocation matches task assignments
      const allTasks = plan.phases.flatMap((p) => p.tasks);
      const taskRoles = new Set(allTasks.map((t) => t.assignedRole));
      const resourceRoles = new Set(plan.resources.roles.map((r) => r.type));

      // Every role assigned to a task should have a resource allocation
      for (const role of taskRoles) {
        assert.ok(resourceRoles.has(role), `Role ${role} should have resource allocation`);
      }

      // Total person-hours should account for all role allocations
      const totalRoleHours = plan.resources.roles.reduce((sum, role) => sum + role.duration * role.count, 0);
      assert.strictEqual(
        totalRoleHours,
        plan.resources.totalPersonHours,
        'Total person-hours should match sum of role allocations'
      );
    });

    test('Should handle configuration options (maxPhases, includeRiskAssessment)', async function () {
      this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

      const spec: FeatureSpecification = {
        text: FEATURE_IMPLEMENTATION_CONSTANTS.MODERATE_SPEC_TEXT,
        type: 'text',
      };

      // Test with risk assessment disabled
      const workflowNoRisk = new FeatureImplementationWorkflow({ includeRiskAssessment: false });
      const planNoRisk = await workflowNoRisk.generatePlan(spec);
      assert.strictEqual(planNoRisk.risks.length, 0, 'Should not generate risks when disabled');

      // Test with risk assessment enabled
      const workflowWithRisk = new FeatureImplementationWorkflow({ includeRiskAssessment: true });
      const planWithRisk = await workflowWithRisk.generatePlan(spec);

      // Complex spec should generate risks
      const complexSpec: FeatureSpecification = {
        text: FEATURE_IMPLEMENTATION_CONSTANTS.COMPLEX_SPEC_TEXT,
        type: 'text',
      };
      const complexPlan = await workflowWithRisk.generatePlan(complexSpec);
      assert.ok(complexPlan.risks.length > 0, 'Should generate risks for complex feature when enabled');
    });
  });
});
