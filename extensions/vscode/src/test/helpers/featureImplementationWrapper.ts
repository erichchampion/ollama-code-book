/**
 * Feature Implementation Workflow Mock
 * Mock implementation for testing autonomous feature development capabilities
 */

import {
  FEATURE_IMPLEMENTATION_CONSTANTS,
  FEATURE_COMPLEXITY_WEIGHTS,
  FEATURE_TIME_ESTIMATES,
  FEATURE_SPEC_KEYWORDS,
  FEATURE_IMPLEMENTATION_NUMBERS,
  RISK_ASSESSMENT_CONSTANTS,
  PHASE_TEMPLATES,
  TASK_TEMPLATES,
  SPEC_TEMPLATES,
  RISK_MITIGATION_STRATEGIES,
} from './test-constants';

/**
 * Complexity level of a feature
 */
export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'very_complex';

/**
 * Priority level for tasks
 */
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

/**
 * Risk level assessment
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Resource type required for implementation
 */
export type ResourceType = 'backend' | 'frontend' | 'database' | 'infrastructure' | 'design' | 'qa';

/**
 * Feature specification input
 */
export interface FeatureSpecification {
  /** Specification text (plain text or technical format) */
  text: string;
  /** Type of specification */
  type: 'text' | 'technical';
  /** Project context (optional) */
  projectContext?: string;
  /** Acceptance criteria (for technical specs) */
  acceptanceCriteria?: string[];
}

/**
 * Parsed requirement from specification
 */
export interface ParsedRequirement {
  /** Requirement ID */
  id: string;
  /** Requirement description */
  description: string;
  /** Priority level */
  priority: PriorityLevel;
  /** Category (feature, bug fix, enhancement, etc.) */
  category: string;
  /** Acceptance criteria */
  acceptanceCriteria: string[];
  /** Technical constraints */
  technicalConstraints?: string[];
}

/**
 * Complexity analysis result
 */
export interface ComplexityAnalysis {
  /** Overall complexity level */
  level: ComplexityLevel;
  /** Complexity score (0-100) */
  score: number;
  /** Number of components affected */
  componentsAffected: number;
  /** Number of dependencies */
  dependencies: number;
  /** Technical challenges identified */
  technicalChallenges: string[];
  /** Justification for complexity rating */
  justification: string;
}

/**
 * Time estimation result
 */
export interface TimeEstimation {
  /** Estimated hours */
  hours: number;
  /** Estimated days */
  days: number;
  /** Confidence level (0-100) */
  confidence: number;
  /** Breakdown by phase */
  breakdown: {
    design: number;
    implementation: number;
    testing: number;
    review: number;
  };
}

/**
 * Resource requirements
 */
export interface ResourceRequirements {
  /** Required team members by role */
  roles: Array<{
    type: ResourceType;
    count: number;
    duration: number; // hours
  }>;
  /** Total person-hours */
  totalPersonHours: number;
  /** External dependencies */
  externalDependencies: string[];
  /** Infrastructure requirements */
  infrastructure: string[];
}

/**
 * Implementation task
 */
export interface ImplementationTask {
  /** Task ID */
  id: string;
  /** Task name */
  name: string;
  /** Task description */
  description: string;
  /** Phase number */
  phase: number;
  /** Priority */
  priority: PriorityLevel;
  /** Estimated hours */
  estimatedHours: number;
  /** Dependencies (task IDs) */
  dependencies: string[];
  /** Assigned role */
  assignedRole: ResourceType;
  /** Risk level */
  risk: RiskLevel;
}

/**
 * Implementation phase
 */
export interface ImplementationPhase {
  /** Phase number */
  number: number;
  /** Phase name */
  name: string;
  /** Phase description */
  description: string;
  /** Tasks in this phase */
  tasks: ImplementationTask[];
  /** Duration in hours */
  duration: number;
  /** Milestone */
  milestone: string;
}

/**
 * Risk assessment
 */
export interface RiskAssessment {
  /** Risk ID */
  id: string;
  /** Risk description */
  description: string;
  /** Risk level */
  level: RiskLevel;
  /** Probability (0-100) */
  probability: number;
  /** Impact (0-100) */
  impact: number;
  /** Risk score (probability * impact) */
  score: number;
  /** Mitigation strategies */
  mitigationStrategies: string[];
  /** Owner */
  owner?: ResourceType;
}

/**
 * Implementation plan
 */
export interface ImplementationPlan {
  /** Parsed requirements */
  requirements: ParsedRequirement[];
  /** Complexity analysis */
  complexity: ComplexityAnalysis;
  /** Time estimation */
  timeEstimation: TimeEstimation;
  /** Resource requirements */
  resources: ResourceRequirements;
  /** Implementation phases */
  phases: ImplementationPhase[];
  /** Risk assessments */
  risks: RiskAssessment[];
  /** Critical path tasks */
  criticalPath: string[]; // task IDs
  /** Timeline milestones */
  milestones: Array<{
    name: string;
    date: string;
    deliverables: string[];
  }>;
}

/**
 * Feature Implementation Workflow Configuration
 */
export interface FeatureImplementationConfig {
  /** Include time estimation */
  includeTimeEstimation?: boolean;
  /** Include risk assessment */
  includeRiskAssessment?: boolean;
  /** Maximum phases */
  maxPhases?: number;
  /** Team size */
  teamSize?: number;
}

/**
 * Mock Feature Implementation Workflow
 * Simulates AI-powered feature specification parsing and implementation planning
 */
export class FeatureImplementationWorkflow {
  constructor(private config: FeatureImplementationConfig = {}) {
    this.config = {
      includeTimeEstimation: true,
      includeRiskAssessment: true,
      maxPhases: FEATURE_IMPLEMENTATION_CONSTANTS.DEFAULT_MAX_PHASES,
      teamSize: FEATURE_IMPLEMENTATION_CONSTANTS.DEFAULT_TEAM_SIZE,
      ...config,
    };
  }

  // ============================================================================
  // Helper Methods for Text Matching and Analysis
  // ============================================================================

  /**
   * Check if text contains any of the specified keywords
   */
  private containsAnyKeyword(text: string, keywords: readonly string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some((keyword) => lowerText.includes(keyword));
  }

  /**
   * Determine priority based on keyword matching
   */
  private determinePriority(text: string): PriorityLevel {
    if (this.containsAnyKeyword(text, FEATURE_SPEC_KEYWORDS.PRIORITY.CRITICAL)) {
      return 'critical';
    }
    if (this.containsAnyKeyword(text, FEATURE_SPEC_KEYWORDS.PRIORITY.HIGH)) {
      return 'high';
    }
    if (this.containsAnyKeyword(text, FEATURE_SPEC_KEYWORDS.PRIORITY.LOW)) {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Determine category based on keyword matching
   */
  private determineCategory(text: string): string {
    if (this.containsAnyKeyword(text, FEATURE_SPEC_KEYWORDS.CATEGORY.BUG_FIX)) {
      return 'bug_fix';
    }
    if (this.containsAnyKeyword(text, FEATURE_SPEC_KEYWORDS.CATEGORY.ENHANCEMENT)) {
      return 'enhancement';
    }
    if (this.containsAnyKeyword(text, FEATURE_SPEC_KEYWORDS.CATEGORY.REFACTORING)) {
      return 'refactoring';
    }
    return 'feature';
  }

  /**
   * Aggregate all requirement descriptions into searchable text
   */
  private aggregateRequirementText(requirements: ParsedRequirement[]): string {
    return requirements.map((r) => r.description.toLowerCase()).join(' ');
  }

  /**
   * Create tasks from template configuration
   */
  private createTasksFromTemplates(
    templates: readonly {
      NAME: string;
      DESCRIPTION: string;
      PRIORITY: PriorityLevel;
      ROLE: ResourceType;
      RISK: RiskLevel;
    }[],
    phase: number,
    taskPrefix: string,
    totalHours: number,
    firstTaskDependencies: string[] = []
  ): ImplementationTask[] {
    const tasks: ImplementationTask[] = [];
    const hoursPerTask = totalHours / templates.length;

    templates.forEach((template, index) => {
      const taskNum = index + 1;
      const taskId = `TASK-${taskPrefix}${taskNum.toString().padStart(FEATURE_IMPLEMENTATION_NUMBERS.TASK_ID_PADDING, '0')}`;
      const dependencies = index === 0 ? firstTaskDependencies : [`TASK-${taskPrefix}${(taskNum - 1).toString().padStart(FEATURE_IMPLEMENTATION_NUMBERS.TASK_ID_PADDING, '0')}`];

      tasks.push({
        id: taskId,
        name: template.NAME,
        description: template.DESCRIPTION,
        phase,
        priority: template.PRIORITY,
        estimatedHours: hoursPerTask,
        dependencies,
        assignedRole: template.ROLE,
        risk: template.RISK,
      });
    });

    return tasks;
  }

  // ============================================================================
  // Main Workflow Methods
  // ============================================================================

  /**
   * Parse feature specification into structured requirements
   */
  async parseSpecification(spec: FeatureSpecification): Promise<ParsedRequirement[]> {
    // Mock implementation - in real version, this would use AI to parse the spec
    const requirements: ParsedRequirement[] = [];

    // Simple heuristic: split by sentences/paragraphs
    const lines = spec.text.split('\n').filter((line) => line.trim().length > 0);

    let reqId = FEATURE_IMPLEMENTATION_NUMBERS.INITIAL_REQ_ID;
    for (const line of lines) {
      if (line.length < FEATURE_IMPLEMENTATION_CONSTANTS.MIN_REQUIREMENT_LENGTH) {
        continue;
      }

      requirements.push({
        id: `REQ-${reqId.toString().padStart(FEATURE_IMPLEMENTATION_NUMBERS.REQ_ID_PADDING, '0')}`,
        description: line.trim(),
        priority: this.determinePriority(line),
        category: this.determineCategory(line),
        acceptanceCriteria: spec.acceptanceCriteria || this.extractAcceptanceCriteria(line),
        technicalConstraints: this.extractTechnicalConstraints(line),
      });

      reqId++;
    }

    return requirements;
  }

  /**
   * Analyze feature complexity
   */
  async analyzeComplexity(requirements: ParsedRequirement[]): Promise<ComplexityAnalysis> {
    // Calculate complexity score based on multiple factors
    const componentCount = this.estimateComponentCount(requirements);
    const dependencyCount = this.estimateDependencyCount(requirements);
    const technicalChallenges = this.identifyTechnicalChallenges(requirements);

    // Weighted complexity score
    const componentScore = Math.min(
      FEATURE_COMPLEXITY_WEIGHTS.MAX_SCORE,
      componentCount * FEATURE_COMPLEXITY_WEIGHTS.COMPONENT_WEIGHT
    );
    const dependencyScore = Math.min(
      FEATURE_COMPLEXITY_WEIGHTS.MAX_SCORE,
      dependencyCount * FEATURE_COMPLEXITY_WEIGHTS.DEPENDENCY_WEIGHT
    );
    const challengeScore = Math.min(
      FEATURE_COMPLEXITY_WEIGHTS.MAX_SCORE,
      technicalChallenges.length * FEATURE_COMPLEXITY_WEIGHTS.CHALLENGE_WEIGHT
    );

    const totalScore = Math.min(
      FEATURE_COMPLEXITY_WEIGHTS.MAX_SCORE,
      componentScore * FEATURE_COMPLEXITY_WEIGHTS.COMPONENT_MULTIPLIER +
        dependencyScore * FEATURE_COMPLEXITY_WEIGHTS.DEPENDENCY_MULTIPLIER +
        challengeScore * FEATURE_COMPLEXITY_WEIGHTS.CHALLENGE_MULTIPLIER
    );

    // Determine complexity level
    let level: ComplexityLevel;
    if (totalScore < FEATURE_COMPLEXITY_WEIGHTS.SIMPLE_THRESHOLD) {
      level = 'simple';
    } else if (totalScore < FEATURE_COMPLEXITY_WEIGHTS.MODERATE_THRESHOLD) {
      level = 'moderate';
    } else if (totalScore < FEATURE_COMPLEXITY_WEIGHTS.COMPLEX_THRESHOLD) {
      level = 'complex';
    } else {
      level = 'very_complex';
    }

    return {
      level,
      score: Math.round(totalScore),
      componentsAffected: componentCount,
      dependencies: dependencyCount,
      technicalChallenges,
      justification: this.generateComplexityJustification(level, componentCount, dependencyCount, technicalChallenges),
    };
  }

  /**
   * Estimate implementation time
   */
  async estimateTime(requirements: ParsedRequirement[], complexity: ComplexityAnalysis): Promise<TimeEstimation> {
    if (!this.config.includeTimeEstimation) {
      return {
        hours: 0,
        days: 0,
        confidence: 0,
        breakdown: { design: 0, implementation: 0, testing: 0, review: 0 },
      };
    }

    // Base hours from complexity level
    const baseHours = FEATURE_TIME_ESTIMATES.BASE_HOURS[complexity.level];

    // Add hours per requirement
    const requirementHours = requirements.length * FEATURE_TIME_ESTIMATES.HOURS_PER_REQUIREMENT;

    // Add hours per technical challenge
    const challengeHours = complexity.technicalChallenges.length * FEATURE_TIME_ESTIMATES.HOURS_PER_CHALLENGE;

    const totalHours = baseHours + requirementHours + challengeHours;

    // Calculate breakdown (percentages from FEATURE_TIME_ESTIMATES)
    const breakdown = {
      design: Math.round(totalHours * FEATURE_TIME_ESTIMATES.PHASE_DISTRIBUTION.DESIGN),
      implementation: Math.round(totalHours * FEATURE_TIME_ESTIMATES.PHASE_DISTRIBUTION.IMPLEMENTATION),
      testing: Math.round(totalHours * FEATURE_TIME_ESTIMATES.PHASE_DISTRIBUTION.TESTING),
      review: Math.round(totalHours * FEATURE_TIME_ESTIMATES.PHASE_DISTRIBUTION.REVIEW),
    };

    // Confidence based on complexity (simpler = more confident)
    const confidence = Math.max(
      FEATURE_TIME_ESTIMATES.MIN_CONFIDENCE,
      FEATURE_TIME_ESTIMATES.MAX_CONFIDENCE - complexity.score / FEATURE_IMPLEMENTATION_NUMBERS.CONFIDENCE_DIVISOR
    );

    return {
      hours: totalHours,
      days: Math.ceil(totalHours / FEATURE_TIME_ESTIMATES.HOURS_PER_DAY),
      confidence: Math.round(confidence),
      breakdown,
    };
  }

  /**
   * Identify resource requirements
   */
  async identifyResources(requirements: ParsedRequirement[], complexity: ComplexityAnalysis): Promise<ResourceRequirements> {
    const roles: Array<{ type: ResourceType; count: number; duration: number }> = [];

    // Analyze requirements to determine roles needed
    const needsBackend = requirements.some((r) => this.requiresBackend(r.description));
    const needsFrontend = requirements.some((r) => this.requiresFrontend(r.description));
    const needsDatabase = requirements.some((r) => this.requiresDatabase(r.description));
    const needsInfrastructure = requirements.some((r) => this.requiresInfrastructure(r.description));

    const baseHours = FEATURE_TIME_ESTIMATES.BASE_HOURS[complexity.level];

    if (needsBackend) {
      roles.push({
        type: 'backend',
        count: 1,
        duration: baseHours * FEATURE_IMPLEMENTATION_CONSTANTS.BACKEND_EFFORT_RATIO,
      });
    }

    if (needsFrontend) {
      roles.push({
        type: 'frontend',
        count: 1,
        duration: baseHours * FEATURE_IMPLEMENTATION_CONSTANTS.FRONTEND_EFFORT_RATIO,
      });
    }

    if (needsDatabase) {
      roles.push({
        type: 'database',
        count: 1,
        duration: baseHours * FEATURE_IMPLEMENTATION_CONSTANTS.DATABASE_EFFORT_RATIO,
      });
    }

    if (needsInfrastructure) {
      roles.push({
        type: 'infrastructure',
        count: 1,
        duration: baseHours * FEATURE_IMPLEMENTATION_CONSTANTS.INFRA_EFFORT_RATIO,
      });
    }

    // Always need QA
    roles.push({
      type: 'qa',
      count: 1,
      duration: baseHours * FEATURE_IMPLEMENTATION_CONSTANTS.QA_EFFORT_RATIO,
    });

    const totalPersonHours = roles.reduce((sum, role) => sum + role.duration * role.count, 0);

    return {
      roles,
      totalPersonHours,
      externalDependencies: this.identifyExternalDependencies(requirements),
      infrastructure: this.identifyInfrastructure(requirements),
    };
  }

  /**
   * Generate implementation plan
   */
  async generatePlan(spec: FeatureSpecification): Promise<ImplementationPlan> {
    // Parse specification
    const requirements = await this.parseSpecification(spec);

    // Analyze complexity
    const complexity = await this.analyzeComplexity(requirements);

    // Estimate time
    const timeEstimation = await this.estimateTime(requirements, complexity);

    // Identify resources
    const resources = await this.identifyResources(requirements, complexity);

    // Decompose into phases and tasks
    const phases = await this.decomposeTasks(requirements, complexity, timeEstimation);

    // Assess risks
    const risks = this.config.includeRiskAssessment ? await this.assessRisks(requirements, complexity) : [];

    // Identify critical path
    const criticalPath = this.identifyCriticalPath(phases);

    // Generate milestones
    const milestones = this.generateMilestones(phases, timeEstimation);

    return {
      requirements,
      complexity,
      timeEstimation,
      resources,
      phases,
      risks,
      criticalPath,
      milestones,
    };
  }

  /**
   * Decompose into phases and tasks
   */
  async decomposeTasks(
    requirements: ParsedRequirement[],
    complexity: ComplexityAnalysis,
    timeEstimation: TimeEstimation
  ): Promise<ImplementationPhase[]> {
    const phaseConfigs = [
      {
        num: FEATURE_IMPLEMENTATION_NUMBERS.PHASE_DESIGN,
        template: PHASE_TEMPLATES.DESIGN,
        breakdown: timeEstimation.breakdown.design,
        creator: this.createDesignTasks,
      },
      {
        num: FEATURE_IMPLEMENTATION_NUMBERS.PHASE_IMPLEMENTATION,
        template: PHASE_TEMPLATES.IMPLEMENTATION,
        breakdown: timeEstimation.breakdown.implementation,
        creator: this.createImplementationTasks,
      },
      {
        num: FEATURE_IMPLEMENTATION_NUMBERS.PHASE_TESTING,
        template: PHASE_TEMPLATES.TESTING,
        breakdown: timeEstimation.breakdown.testing,
        creator: this.createTestingTasks,
      },
      {
        num: FEATURE_IMPLEMENTATION_NUMBERS.PHASE_REVIEW,
        template: PHASE_TEMPLATES.REVIEW,
        breakdown: timeEstimation.breakdown.review,
        creator: this.createReviewTasks,
      },
    ];

    return phaseConfigs.map((config) => ({
      number: config.num,
      name: config.template.NAME,
      description: config.template.DESCRIPTION,
      tasks: config.creator.call(this, requirements, config.breakdown),
      duration: config.breakdown,
      milestone: config.template.MILESTONE,
    }));
  }

  /**
   * Assess implementation risks
   */
  async assessRisks(requirements: ParsedRequirement[], complexity: ComplexityAnalysis): Promise<RiskAssessment[]> {
    const risks: RiskAssessment[] = [];

    // Complexity-based risks
    if (complexity.level === 'complex' || complexity.level === 'very_complex') {
      const config = RISK_ASSESSMENT_CONSTANTS.HIGH_COMPLEXITY_RISK;
      risks.push({
        id: config.ID,
        description: config.DESCRIPTION,
        level: config.LEVEL,
        probability: config.PROBABILITY,
        impact: config.IMPACT,
        score: Math.round((config.PROBABILITY * config.IMPACT) / 100),
        mitigationStrategies: [...RISK_MITIGATION_STRATEGIES.HIGH_COMPLEXITY],
        owner: config.OWNER,
      });
    }

    // Technical challenge risks
    if (complexity.technicalChallenges.length > RISK_ASSESSMENT_CONSTANTS.CHALLENGE_COUNT_THRESHOLD) {
      const config = RISK_ASSESSMENT_CONSTANTS.TECHNICAL_CHALLENGES_RISK;
      risks.push({
        id: config.ID,
        description: config.DESCRIPTION,
        level: config.LEVEL,
        probability: config.PROBABILITY,
        impact: config.IMPACT,
        score: Math.round((config.PROBABILITY * config.IMPACT) / 100),
        mitigationStrategies: [...RISK_MITIGATION_STRATEGIES.TECHNICAL_CHALLENGES],
        owner: config.OWNER,
      });
    }

    // Dependency risks
    if (complexity.dependencies > RISK_ASSESSMENT_CONSTANTS.DEPENDENCY_COUNT_THRESHOLD) {
      const config = RISK_ASSESSMENT_CONSTANTS.DEPENDENCY_RISK;
      risks.push({
        id: config.ID,
        description: config.DESCRIPTION,
        level: config.LEVEL,
        probability: config.PROBABILITY,
        impact: config.IMPACT,
        score: Math.round((config.PROBABILITY * config.IMPACT) / 100),
        mitigationStrategies: [...RISK_MITIGATION_STRATEGIES.MULTIPLE_DEPENDENCIES],
        owner: config.OWNER,
      });
    }

    return risks;
  }

  /**
   * Identify critical path through tasks
   */
  identifyCriticalPath(phases: ImplementationPhase[]): string[] {
    const criticalTasks: string[] = [];

    for (const phase of phases) {
      // Find longest task chain in each phase
      const phaseCriticalTask = phase.tasks.reduce((longest, task) => {
        return task.estimatedHours > longest.estimatedHours ? task : longest;
      }, phase.tasks[0]);

      if (phaseCriticalTask) {
        criticalTasks.push(phaseCriticalTask.id);
      }
    }

    return criticalTasks;
  }

  /**
   * Generate timeline milestones
   */
  generateMilestones(
    phases: ImplementationPhase[],
    timeEstimation: TimeEstimation
  ): Array<{ name: string; date: string; deliverables: string[] }> {
    const milestones: Array<{ name: string; date: string; deliverables: string[] }> = [];
    let cumulativeDays = 0;

    for (const phase of phases) {
      const phaseDays = Math.ceil(phase.duration / FEATURE_TIME_ESTIMATES.HOURS_PER_DAY);
      cumulativeDays += phaseDays;

      const date = new Date();
      date.setDate(date.getDate() + cumulativeDays);

      milestones.push({
        name: phase.milestone,
        date: date.toISOString().split('T')[0],
        deliverables: phase.tasks.map((t) => t.name),
      });
    }

    return milestones;
  }

  // Helper methods

  private extractAcceptanceCriteria(text: string): string[] {
    // Simple extraction - in real version, would use AI
    const criteria: string[] = [];
    if (this.containsAnyKeyword(text, FEATURE_SPEC_KEYWORDS.ACCEPTANCE_CRITERIA.USER)) {
      criteria.push(SPEC_TEMPLATES.ACCEPTANCE_CRITERIA.USER_SUCCESS);
    }
    if (this.containsAnyKeyword(text, FEATURE_SPEC_KEYWORDS.ACCEPTANCE_CRITERIA.TEST)) {
      criteria.push(SPEC_TEMPLATES.ACCEPTANCE_CRITERIA.TEST_COVERAGE);
    }
    criteria.push(SPEC_TEMPLATES.ACCEPTANCE_CRITERIA.PERFORMANCE);
    return criteria;
  }

  private extractTechnicalConstraints(text: string): string[] {
    const constraints: string[] = [];
    if (this.containsAnyKeyword(text, FEATURE_SPEC_KEYWORDS.TECHNICAL_CONSTRAINTS.PERFORMANCE)) {
      constraints.push(SPEC_TEMPLATES.TECHNICAL_CONSTRAINTS.RESPONSE_TIME);
    }
    if (this.containsAnyKeyword(text, FEATURE_SPEC_KEYWORDS.TECHNICAL_CONSTRAINTS.SCALE)) {
      constraints.push(SPEC_TEMPLATES.TECHNICAL_CONSTRAINTS.CONCURRENT_USERS(FEATURE_IMPLEMENTATION_NUMBERS.CONCURRENT_USERS_THRESHOLD));
    }
    return constraints;
  }

  private estimateComponentCount(requirements: ParsedRequirement[]): number {
    return requirements.length * FEATURE_IMPLEMENTATION_NUMBERS.COMPONENT_MULTIPLIER;
  }

  private estimateDependencyCount(requirements: ParsedRequirement[]): number {
    return Math.floor(requirements.length * FEATURE_IMPLEMENTATION_NUMBERS.DEPENDENCY_MULTIPLIER);
  }

  private identifyTechnicalChallenges(requirements: ParsedRequirement[]): string[] {
    const challenges: string[] = [];
    const allText = this.aggregateRequirementText(requirements);

    if (this.containsAnyKeyword(allText, FEATURE_SPEC_KEYWORDS.CHALLENGES.REALTIME)) {
      challenges.push(SPEC_TEMPLATES.TECHNICAL_CHALLENGES.REALTIME);
    }
    if (this.containsAnyKeyword(allText, FEATURE_SPEC_KEYWORDS.CHALLENGES.PERFORMANCE)) {
      challenges.push(SPEC_TEMPLATES.TECHNICAL_CHALLENGES.PERFORMANCE);
    }
    if (this.containsAnyKeyword(allText, FEATURE_SPEC_KEYWORDS.CHALLENGES.SECURITY)) {
      challenges.push(SPEC_TEMPLATES.TECHNICAL_CHALLENGES.SECURITY);
    }
    if (this.containsAnyKeyword(allText, FEATURE_SPEC_KEYWORDS.CHALLENGES.INTEGRATION)) {
      challenges.push(SPEC_TEMPLATES.TECHNICAL_CHALLENGES.INTEGRATION);
    }

    return challenges;
  }

  private generateComplexityJustification(
    level: ComplexityLevel,
    components: number,
    dependencies: number,
    challenges: string[]
  ): string {
    return `Complexity rated as ${level} based on ${components} affected components, ${dependencies} dependencies, and ${challenges.length} technical challenges`;
  }

  private requiresBackend(description: string): boolean {
    return this.containsAnyKeyword(description, FEATURE_SPEC_KEYWORDS.BACKEND);
  }

  private requiresFrontend(description: string): boolean {
    return this.containsAnyKeyword(description, FEATURE_SPEC_KEYWORDS.FRONTEND);
  }

  private requiresDatabase(description: string): boolean {
    return this.containsAnyKeyword(description, FEATURE_SPEC_KEYWORDS.DATABASE);
  }

  private requiresInfrastructure(description: string): boolean {
    return this.containsAnyKeyword(description, FEATURE_SPEC_KEYWORDS.INFRASTRUCTURE);
  }

  private identifyExternalDependencies(requirements: ParsedRequirement[]): string[] {
    const deps: string[] = [];
    const allText = this.aggregateRequirementText(requirements);

    if (this.containsAnyKeyword(allText, FEATURE_SPEC_KEYWORDS.DEPENDENCIES.PAYMENT)) {
      deps.push(SPEC_TEMPLATES.EXTERNAL_DEPENDENCIES.PAYMENT);
    }
    if (this.containsAnyKeyword(allText, FEATURE_SPEC_KEYWORDS.DEPENDENCIES.AUTH)) {
      deps.push(SPEC_TEMPLATES.EXTERNAL_DEPENDENCIES.AUTH);
    }
    if (this.containsAnyKeyword(allText, FEATURE_SPEC_KEYWORDS.DEPENDENCIES.EMAIL)) {
      deps.push(SPEC_TEMPLATES.EXTERNAL_DEPENDENCIES.EMAIL);
    }

    return deps;
  }

  private identifyInfrastructure(requirements: ParsedRequirement[]): string[] {
    const infra: string[] = [];
    const allText = this.aggregateRequirementText(requirements);

    if (this.containsAnyKeyword(allText, FEATURE_SPEC_KEYWORDS.INFRASTRUCTURE_TYPES.DATABASE)) {
      infra.push(SPEC_TEMPLATES.INFRASTRUCTURE.DATABASE);
    }
    if (this.containsAnyKeyword(allText, FEATURE_SPEC_KEYWORDS.INFRASTRUCTURE_TYPES.CACHE)) {
      infra.push(SPEC_TEMPLATES.INFRASTRUCTURE.CACHE);
    }
    if (this.containsAnyKeyword(allText, FEATURE_SPEC_KEYWORDS.INFRASTRUCTURE_TYPES.QUEUE)) {
      infra.push(SPEC_TEMPLATES.INFRASTRUCTURE.QUEUE);
    }

    return infra;
  }

  private createDesignTasks(requirements: ParsedRequirement[], totalHours: number): ImplementationTask[] {
    return this.createTasksFromTemplates(
      TASK_TEMPLATES.DESIGN,
      FEATURE_IMPLEMENTATION_NUMBERS.PHASE_DESIGN,
      'D',
      totalHours,
      []
    );
  }

  private createImplementationTasks(requirements: ParsedRequirement[], totalHours: number): ImplementationTask[] {
    const tasks: ImplementationTask[] = [];
    const hoursPerReq = totalHours / requirements.length;

    requirements.forEach((req, index) => {
      const taskId = `TASK-I${(index + 1).toString().padStart(FEATURE_IMPLEMENTATION_NUMBERS.TASK_ID_PADDING, '0')}`;
      const prevTaskId = index > 0 ? `TASK-I${index.toString().padStart(FEATURE_IMPLEMENTATION_NUMBERS.TASK_ID_PADDING, '0')}` : 'TASK-D003';

      tasks.push({
        id: taskId,
        name: `Implement ${req.description.substring(0, FEATURE_IMPLEMENTATION_NUMBERS.TASK_NAME_MAX_LENGTH)}...`,
        description: req.description,
        phase: FEATURE_IMPLEMENTATION_NUMBERS.PHASE_IMPLEMENTATION,
        priority: req.priority,
        estimatedHours: hoursPerReq,
        dependencies: [prevTaskId],
        assignedRole: this.requiresBackend(req.description) ? 'backend' : 'frontend',
        risk: req.priority === 'critical' ? 'high' : 'medium',
      });
    });

    return tasks;
  }

  private createTestingTasks(requirements: ParsedRequirement[], totalHours: number): ImplementationTask[] {
    return this.createTasksFromTemplates(
      TASK_TEMPLATES.TESTING,
      FEATURE_IMPLEMENTATION_NUMBERS.PHASE_TESTING,
      'T',
      totalHours,
      ['TASK-I001']
    );
  }

  private createReviewTasks(requirements: ParsedRequirement[], totalHours: number): ImplementationTask[] {
    return this.createTasksFromTemplates(
      TASK_TEMPLATES.REVIEW,
      FEATURE_IMPLEMENTATION_NUMBERS.PHASE_REVIEW,
      'R',
      totalHours,
      ['TASK-T002']
    );
  }
}
