/**
 * Task Planner
 *
 * Decomposes complex user requests into smaller, manageable tasks with
 * dependency analysis, progress tracking, and adaptive planning capabilities.
 */

import { logger } from '../utils/logger.js';
import { toolRegistry } from '../tools/index.js';
import { EnhancedClient } from './enhanced-client.js';
import { ProjectContext } from './context.js';
import { safeStringify } from '../utils/safe-json.js';
import { AI_CONSTANTS, DURATION_ESTIMATES } from '../config/constants.js';
import { normalizeError } from '../utils/error-utils.js';

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'analysis' | 'implementation' | 'testing' | 'documentation' | 'refactoring';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  dependencies: string[];
  estimatedDuration: number; // in minutes
  actualDuration?: number;
  toolsRequired: string[];
  filesInvolved: string[];
  acceptance_criteria: string[];
  created: Date;
  started?: Date;
  completed?: Date;
  error?: string;
  result?: any;
}

export interface TaskPlan {
  id: string;
  title: string;
  description: string;
  tasks: Task[];
  dependencies: Map<string, string[]>;
  estimatedDuration: number;
  status: 'planning' | 'executing' | 'completed' | 'failed';
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  created: Date;
  started?: Date;
  completed?: Date;
  metadata: {
    complexity: 'simple' | 'moderate' | 'complex' | 'expert';
    confidence: number;
    adaptations: number;
  };
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PlanningContext {
  projectRoot: string;
  availableTools: string[];
  projectLanguages: string[];
  codebaseSize: 'small' | 'medium' | 'large';
  userExperience: 'beginner' | 'intermediate' | 'advanced';
  timeConstraints?: number; // in minutes
  qualityRequirements: 'basic' | 'production' | 'enterprise';
}

// Type aliases for index.ts exports
export type TaskType = Task['type'];
export type TaskPriority = Task['priority'];
export type TaskStatus = Task['status'];
export type PlanningResult = TaskPlan;

export class TaskPlanner {
  private aiClient: any;
  private projectContext?: ProjectContext;
  private activePlans = new Map<string, TaskPlan>();

  constructor(aiClient: any, projectContext?: ProjectContext) {
    this.aiClient = aiClient;
    this.projectContext = projectContext;
  }

  /**
   * Create a task plan from user request
   */
  async createPlan(
    userRequest: string,
    context: PlanningContext
  ): Promise<TaskPlan> {
    logger.info('Creating task plan for request:', userRequest);

    try {
      // Analyze request complexity
      const complexity = await this.analyzeComplexity(userRequest, context);

      // Generate initial plan
      const planData = await this.generateInitialPlan(userRequest, context, complexity);

      // Create task plan object
      const plan: TaskPlan = {
        id: this.generatePlanId(),
        title: planData.title,
        description: planData.description,
        tasks: planData.tasks,
        dependencies: this.buildDependencyMap(planData.tasks),
        estimatedDuration: planData.tasks.reduce((sum, task) => sum + task.estimatedDuration, 0),
        status: 'planning',
        progress: {
          completed: 0,
          total: planData.tasks.length,
          percentage: 0
        },
        created: new Date(),
        metadata: {
          complexity,
          confidence: planData.confidence,
          adaptations: 0
        },
        riskLevel: this.assessRiskLevel(planData.tasks, complexity)
      };

      // Validate and optimize plan
      await this.validatePlan(plan);
      await this.optimizePlan(plan);

      this.activePlans.set(plan.id, plan);

      logger.info(`Created task plan with ${plan.tasks.length} tasks (${complexity} complexity)`);
      return plan;

    } catch (error) {
      logger.error('Failed to create task plan:', error);
      throw error;
    }
  }

  /**
   * Execute a task plan
   */
  async executePlan(planId: string): Promise<void> {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    logger.info(`Starting execution of plan: ${plan.title}`);
    plan.status = 'executing';
    plan.started = new Date();

    try {
      // Execute tasks in dependency order
      const executionOrder = this.determineExecutionOrder(plan);

      for (const taskId of executionOrder) {
        const task = plan.tasks.find(t => t.id === taskId);
        if (!task) continue;

        // Check if dependencies are completed
        if (!this.areDependenciesCompleted(task, plan)) {
          task.status = 'blocked';
          continue;
        }

        await this.executeTask(task, plan);
        this.updatePlanProgress(plan);

        // Adaptive planning: reassess if needed
        if (task.status === 'failed' || task.actualDuration! > task.estimatedDuration * 2) {
          await this.adaptPlan(plan, task);
        }
      }

      // Finalize plan
      plan.status = this.allTasksCompleted(plan) ? 'completed' : 'failed';
      plan.completed = new Date();

      logger.info(`Plan execution completed: ${plan.status}`);

    } catch (error) {
      logger.error('Plan execution failed:', error);
      plan.status = 'failed';
      throw error;
    }
  }

  /**
   * Analyze request complexity
   */
  private async analyzeComplexity(
    request: string,
    context: PlanningContext
  ): Promise<'simple' | 'moderate' | 'complex' | 'expert'> {
    const complexityIndicators = {
      simple: [
        'explain', 'show', 'what is', 'how to', 'example'
      ],
      moderate: [
        'create', 'implement', 'add', 'build', 'write'
      ],
      complex: [
        'refactor', 'optimize', 'integrate', 'migrate', 'redesign'
      ],
      expert: [
        'architecture', 'performance', 'scalability', 'security', 'distributed'
      ]
    };

    const requestLower = request.toLowerCase();
    let maxComplexity: 'simple' | 'moderate' | 'complex' | 'expert' = 'simple';

    // Check keywords
    for (const [level, keywords] of Object.entries(complexityIndicators)) {
      if (keywords.some(keyword => requestLower.includes(keyword))) {
        maxComplexity = level as typeof maxComplexity;
      }
    }

    // Consider context factors
    if (context.codebaseSize === 'large') {
      maxComplexity = this.increaseComplexity(maxComplexity);
    }

    if (context.qualityRequirements === 'enterprise') {
      maxComplexity = this.increaseComplexity(maxComplexity);
    }

    return maxComplexity;
  }

  /**
   * Generate initial plan using AI
   */
  private async generateInitialPlan(
    request: string,
    context: PlanningContext,
    complexity: string
  ): Promise<{
    title: string;
    description: string;
    tasks: Task[];
    confidence: number;
  }> {
    const planningPrompt = this.buildPlanningPrompt(request, context, complexity);

    const response = await this.aiClient.complete(planningPrompt, {
      temperature: AI_CONSTANTS.DECOMPOSITION_TEMPERATURE, // Lower temperature for planning
      responseQuality: 'high',
      enableToolUse: false // Don't use tools for planning
    });

    // Extract content from response structure
    const responseContent = response.message?.content || response.content || '';

    // INVESTIGATION: Log full response for analysis
    logger.debug('Raw AI planning response:', {
      request: request.substring(0, 200),
      complexity,
      response: responseContent,
      responseLength: responseContent.length,
      hasJson: responseContent.includes('{'),
      hasCodeBlock: responseContent.includes('```'),
      jsonBlockCount: (responseContent.match(/```[\s\S]*?```/g) || []).length,
      firstJsonChar: responseContent.indexOf('{'),
      lastJsonChar: responseContent.lastIndexOf('}')
    });

    try {
      // Extract structured plan from AI response
      const planData = this.parsePlanFromResponse(responseContent);

      // Generate tasks with IDs and details
      const tasks: Task[] = planData.tasks.map((taskData: any, index: number) => ({
        id: `task_${Date.now()}_${index}`,
        title: taskData.title,
        description: taskData.description,
        type: taskData.type || 'implementation',
        priority: taskData.priority || 'medium',
        status: 'pending',
        dependencies: taskData.dependencies || [],
        estimatedDuration: taskData.estimatedDuration || DURATION_ESTIMATES.MEDIUM_COMPLEXITY,
        toolsRequired: taskData.toolsRequired || [],
        filesInvolved: taskData.filesInvolved || [],
        acceptance_criteria: taskData.acceptance_criteria || [],
        created: new Date()
      }));

      return {
        title: planData.title || 'Generated Task Plan',
        description: planData.description || request,
        tasks,
        confidence: response.confidence || 0.8
      };

    } catch (error) {
      // Enhanced error logging for investigation
      this.debugParsingFailure(responseContent, error as Error, request, complexity);
      logger.warn('Failed to parse AI plan, creating fallback plan', {
        error: normalizeError(error).message,
        requestPreview: request.substring(0, 100),
        complexity
      });
      return this.createFallbackPlan(request, context);
    }
  }

  /**
   * Build planning prompt for AI
   */
  private buildPlanningPrompt(
    request: string,
    context: PlanningContext,
    complexity: string
  ): string {
    const availableTools = toolRegistry.list().map(tool => tool.name).join(', ');

    return `You are an expert software development project planner. Your task is to create a detailed task plan for the following request.

## Request:
${request}

## Context:
- Project Languages: ${context.projectLanguages.join(', ')}
- Codebase Size: ${context.codebaseSize}
- Quality Requirements: ${context.qualityRequirements}
- Available Tools: ${availableTools}
- Complexity Level: ${complexity}

## Planning Guidelines:
- Break complex tasks into smaller, manageable subtasks
- Each task should be completable in 15-60 minutes
- Include proper dependencies between tasks
- Specify required tools and files for each task
- Include acceptance criteria for quality validation

## CRITICAL: Response Format Requirements
You MUST respond ONLY with valid JSON. Do not include any text before or after the JSON.
The JSON must be wrapped in markdown code blocks with "json" language identifier.
Follow this exact format:

\`\`\`json
{
  "title": "Plan Title Here",
  "description": "Overall plan description here",
  "tasks": [
    {
      "title": "Task Title Here",
      "description": "Detailed task description here",
      "type": "analysis",
      "priority": "medium",
      "dependencies": [],
      "estimatedDuration": 30,
      "toolsRequired": ["filesystem"],
      "filesInvolved": [],
      "acceptance_criteria": ["Task completed successfully"]
    }
  ]
}
\`\`\`

## Validation Rules:
- "type" must be one of: "analysis", "implementation", "testing", "documentation", "refactoring"
- "priority" must be one of: "low", "medium", "high", "critical"
- "estimatedDuration" must be a number between 5 and 120
- "tasks" array must contain at least 1 task
- All string fields must use double quotes, not single quotes
- Do not use trailing commas

Create a comprehensive plan that addresses all aspects of the request. Respond ONLY with the JSON, no other text.`;
  }

  /**
   * Parse plan from AI response with multiple strategies
   */
  private parsePlanFromResponse(response: string): any {
    const strategies = [
      () => this.parseJsonCodeBlock(response),
      () => this.parseGenericCodeBlock(response),
      () => this.parseRawJson(response),
      () => this.parseWithJsonCleaning(response),
      () => this.parsePartialInformation(response)
    ];

    let lastError: Error | null = null;

    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (result && this.validatePlanStructure(result)) {
          logger.debug('Successfully parsed plan using strategy', {
            strategyName: strategy.name,
            taskCount: result.tasks?.length || 0
          });
          return result;
        }
      } catch (error) {
        lastError = error as Error;
        logger.debug('Parsing strategy failed', {
          strategyName: strategy.name,
          error: normalizeError(error).message
        });
        continue;
      }
    }

    throw new Error(`All parsing strategies failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Strategy 1: Parse JSON from markdown code blocks
   */
  private parseJsonCodeBlock(response: string): any {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      throw new Error('No JSON code block found');
    }
    return JSON.parse(jsonMatch[1]);
  }

  /**
   * Strategy 2: Parse from generic code blocks
   */
  private parseGenericCodeBlock(response: string): any {
    const codeBlockMatch = response.match(/```\s*([\s\S]*?)\s*```/);
    if (!codeBlockMatch) {
      throw new Error('No code block found');
    }

    const content = codeBlockMatch[1].trim();
    if (content.startsWith('{') || content.startsWith('[')) {
      return JSON.parse(content);
    }

    throw new Error('Code block does not contain JSON');
  }

  /**
   * Strategy 3: Parse raw JSON from response
   */
  private parseRawJson(response: string): any {
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
      throw new Error('No valid JSON object boundaries found');
    }

    const jsonStr = response.substring(jsonStart, jsonEnd + 1);
    return JSON.parse(jsonStr);
  }

  /**
   * Strategy 4: Clean and fix common JSON issues before parsing
   */
  private parseWithJsonCleaning(response: string): any {
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON boundaries for cleaning');
    }

    let jsonStr = response.substring(jsonStart, jsonEnd + 1);
    jsonStr = this.cleanAndFixJson(jsonStr);

    return JSON.parse(jsonStr);
  }

  /**
   * Strategy 5: Extract partial information from natural language
   */
  private parsePartialInformation(response: string): any {
    logger.debug('Attempting partial information extraction from natural language');

    const partialPlan: any = {
      title: this.extractTitle(response) || 'Extracted Plan',
      description: this.extractDescription(response) || 'Plan extracted from AI response',
      tasks: this.extractTasksFromText(response)
    };

    if (!partialPlan.tasks || partialPlan.tasks.length === 0) {
      throw new Error('No tasks could be extracted from response');
    }

    return partialPlan;
  }

  /**
   * Clean and fix common JSON formatting issues
   */
  private cleanAndFixJson(jsonStr: string): string {
    return jsonStr
      // Remove trailing commas before closing brackets/braces
      .replace(/,\s*([}\]])/g, '$1')
      // Quote unquoted object keys
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
      // Convert single quotes to double quotes for strings
      .replace(/:\s*'([^']*)'/g, ': "$1"')
      // Fix common spacing issues
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validate plan structure has required fields
   */
  private validatePlanStructure(planData: any): boolean {
    if (!planData || typeof planData !== 'object') {
      return false;
    }

    // Must have tasks array
    if (!planData.tasks || !Array.isArray(planData.tasks)) {
      return false;
    }

    // Must have at least one task
    if (planData.tasks.length === 0) {
      return false;
    }

    // Each task must have minimum required fields
    for (const task of planData.tasks) {
      if (!task.title || typeof task.title !== 'string') {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract title from natural language response
   */
  private extractTitle(response: string): string | null {
    const patterns = [
      /title["\s]*:[\s"]*([^"`,\n]+)/i,
      /plan[:\s]+([^\n]+)/i,
      /^#{1,3}\s*(.+)$/m,
      /\*\*(.+?)\*\*/
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        return match[1].trim().replace(/["`]/g, '');
      }
    }

    return null;
  }

  /**
   * Extract description from natural language response
   */
  private extractDescription(response: string): string | null {
    const patterns = [
      /description["\s]*:[\s"]*([^"`,\n]+)/i,
      /(?:here's|this is|i'll create)\s+(.+?)(?:\n|$)/i
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        return match[1].trim().replace(/["`]/g, '');
      }
    }

    return null;
  }

  /**
   * Extract tasks from natural language text
   */
  private extractTasksFromText(response: string): any[] {
    const tasks: any[] = [];

    // Pattern 1: Numbered lists (1. Task name)
    const numberedMatches = response.match(/^\d+\.\s*(.+)$/gm);
    if (numberedMatches) {
      tasks.push(...numberedMatches.map((match, index) => this.convertTextToTask(match, index)));
    }

    // Pattern 2: Bullet points (- Task name or * Task name)
    const bulletMatches = response.match(/^[-*]\s*(.+)$/gm);
    if (bulletMatches && tasks.length === 0) {
      tasks.push(...bulletMatches.map((match, index) => this.convertTextToTask(match, index)));
    }

    // Pattern 3: Lines starting with action verbs
    if (tasks.length === 0) {
      const actionVerbs = ['analyze', 'create', 'implement', 'test', 'review', 'update', 'fix', 'add', 'remove', 'refactor'];
      const lines = response.split('\n');

      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        if (actionVerbs.some(verb => trimmed.startsWith(verb)) && trimmed.length > 10) {
          tasks.push(this.convertTextToTask(line.trim(), tasks.length));
        }
      }
    }

    return tasks;
  }

  /**
   * Convert text description to task object
   */
  private convertTextToTask(text: string, index: number): any {
    // Clean up the text
    const cleanText = text.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim();

    // Determine task type based on keywords
    const lowerText = cleanText.toLowerCase();
    let type = 'implementation';

    if (lowerText.includes('analyz') || lowerText.includes('review') || lowerText.includes('examine')) {
      type = 'analysis';
    } else if (lowerText.includes('test') || lowerText.includes('verify')) {
      type = 'testing';
    } else if (lowerText.includes('document') || lowerText.includes('readme')) {
      type = 'documentation';
    } else if (lowerText.includes('refactor') || lowerText.includes('clean') || lowerText.includes('improve')) {
      type = 'refactoring';
    }

    // Estimate duration based on complexity keywords
    let estimatedDuration: number = DURATION_ESTIMATES.MEDIUM_COMPLEXITY;
    if (lowerText.includes('complex') || lowerText.includes('comprehensive') || lowerText.includes('full')) {
      estimatedDuration = DURATION_ESTIMATES.HIGH_COMPLEXITY;
    } else if (lowerText.includes('simple') || lowerText.includes('quick') || lowerText.includes('basic')) {
      estimatedDuration = DURATION_ESTIMATES.LOW_COMPLEXITY;
    }

    return {
      title: cleanText.length > 50 ? cleanText.substring(0, 47) + '...' : cleanText,
      description: cleanText,
      type,
      priority: 'medium',
      estimatedDuration,
      dependencies: [],
      toolsRequired: this.inferToolsFromText(lowerText),
      filesInvolved: [],
      acceptance_criteria: [`${cleanText} completed successfully`]
    };
  }

  /**
   * Infer required tools from task text
   */
  private inferToolsFromText(text: string): string[] {
    const tools: string[] = [];

    if (text.includes('file') || text.includes('code') || text.includes('read')) {
      tools.push('filesystem');
    }
    if (text.includes('test') || text.includes('spec')) {
      tools.push('testing');
    }
    if (text.includes('git') || text.includes('commit') || text.includes('branch')) {
      tools.push('git');
    }
    if (text.includes('build') || text.includes('compile') || text.includes('package')) {
      tools.push('build');
    }

    return tools.length > 0 ? tools : ['filesystem'];
  }

  /**
   * Debug parsing failure with detailed analysis
   */
  private debugParsingFailure(response: string, error: Error, request: string, complexity: string): void {
    // Ensure response is a string
    const responseStr = response || '';

    const debugInfo = {
      timestamp: new Date().toISOString(),
      request: request.substring(0, 200),
      complexity,
      error: error.message,
      responseLength: responseStr.length,
      responsePreview: responseStr.substring(0, 500),
      responseEnd: responseStr.length > 200 ? responseStr.substring(responseStr.length - 200) : responseStr,
      hasJson: responseStr.includes('{'),
      hasCodeBlock: responseStr.includes('```'),
      jsonBlocks: (responseStr.match(/```[\s\S]*?```/g) || []).length,
      jsonBlockContent: responseStr.match(/```[\s\S]*?```/g) || [],
      firstJsonChar: responseStr.indexOf('{'),
      lastJsonChar: responseStr.lastIndexOf('}'),
      potentialJsonContent: responseStr.indexOf('{') !== -1 && responseStr.lastIndexOf('}') !== -1
        ? responseStr.substring(responseStr.indexOf('{'), responseStr.lastIndexOf('}') + 1)
        : null,
      lineCount: responseStr.split('\n').length,
      hasTitle: responseStr.toLowerCase().includes('title'),
      hasTasks: responseStr.toLowerCase().includes('task'),
      hasDescription: responseStr.toLowerCase().includes('description')
    };

    logger.error('Detailed parsing failure analysis', debugInfo);
  }

  /**
   * Create intelligent fallback plan when AI planning fails
   */
  private createFallbackPlan(request: string, context: PlanningContext): {
    title: string;
    description: string;
    tasks: Task[];
    confidence: number;
  } {
    logger.info('Creating intelligent fallback plan', { request: request.substring(0, 100) });

    // Progressive fallback strategies
    try {
      // Strategy 1: Template-based plan
      const templatePlan = this.createTemplateBasedPlan(request, context);
      if (templatePlan.tasks.length > 1) {
        logger.debug('Using template-based fallback plan');
        return { ...templatePlan, confidence: 0.7 };
      }
    } catch (error) {
      logger.debug('Template-based fallback failed', { error: normalizeError(error).message });
    }

    try {
      // Strategy 2: Pattern-based plan
      const patternPlan = this.createPatternBasedPlan(request, context);
      if (patternPlan.tasks.length > 0) {
        logger.debug('Using pattern-based fallback plan');
        return { ...patternPlan, confidence: 0.6 };
      }
    } catch (error) {
      logger.debug('Pattern-based fallback failed', { error: normalizeError(error).message });
    }

    // Strategy 3: Simple generic fallback (last resort)
    logger.debug('Using simple generic fallback plan');
    return this.createSimpleFallbackPlan(request, context);
  }

  /**
   * Create template-based plan based on request type
   */
  private createTemplateBasedPlan(request: string, context: PlanningContext): {
    title: string;
    description: string;
    tasks: Task[];
  } {
    const requestType = this.classifyRequest(request);

    switch (requestType) {
      case 'codebase_analysis':
        return this.createAnalysisTemplate(request, context);
      case 'feature_implementation':
        return this.createImplementationTemplate(request, context);
      case 'bug_fix':
        return this.createBugFixTemplate(request, context);
      case 'refactoring':
        return this.createRefactoringTemplate(request, context);
      case 'testing':
        return this.createTestingTemplate(request, context);
      default:
        return this.createGenericTemplate(request, context);
    }
  }

  /**
   * Classify the request type based on keywords
   */
  private classifyRequest(request: string): string {
    const lowerRequest = request.toLowerCase();

    if (lowerRequest.includes('analyz') || lowerRequest.includes('review') || lowerRequest.includes('understand') || lowerRequest.includes('examine')) {
      return 'codebase_analysis';
    }
    if (lowerRequest.includes('implement') || lowerRequest.includes('add') || lowerRequest.includes('create') || lowerRequest.includes('build')) {
      return 'feature_implementation';
    }
    if (lowerRequest.includes('fix') || lowerRequest.includes('bug') || lowerRequest.includes('error') || lowerRequest.includes('issue')) {
      return 'bug_fix';
    }
    if (lowerRequest.includes('refactor') || lowerRequest.includes('improve') || lowerRequest.includes('clean') || lowerRequest.includes('optimize')) {
      return 'refactoring';
    }
    if (lowerRequest.includes('test') || lowerRequest.includes('spec') || lowerRequest.includes('verify')) {
      return 'testing';
    }

    return 'generic';
  }

  /**
   * Create analysis template
   */
  private createAnalysisTemplate(request: string, context: PlanningContext): {
    title: string;
    description: string;
    tasks: Task[];
  } {
    const tasks: Task[] = [
      this.createTaskFromTemplate({
        title: 'Project Structure Analysis',
        description: 'Analyze the overall project structure and organization',
        type: 'analysis',
        estimatedDuration: 15,
        toolsRequired: ['filesystem'],
        acceptance_criteria: ['Project structure documented', 'Key directories identified']
      }),
      this.createTaskFromTemplate({
        title: 'Code Architecture Review',
        description: 'Review the codebase architecture and design patterns',
        type: 'analysis',
        estimatedDuration: 30,
        toolsRequired: ['filesystem', 'code-analysis'],
        acceptance_criteria: ['Architecture patterns identified', 'Dependencies mapped']
      }),
      this.createTaskFromTemplate({
        title: 'Technology Stack Assessment',
        description: 'Assess the technology stack and dependencies',
        type: 'analysis',
        estimatedDuration: 20,
        toolsRequired: ['filesystem'],
        acceptance_criteria: ['Technology stack documented', 'Dependencies analyzed']
      }),
      this.createTaskFromTemplate({
        title: 'Code Quality Evaluation',
        description: 'Evaluate code quality and identify improvement areas',
        type: 'analysis',
        estimatedDuration: 25,
        toolsRequired: ['filesystem', 'code-analysis'],
        acceptance_criteria: ['Code quality metrics gathered', 'Improvement areas identified']
      })
    ];

    return {
      title: 'Codebase Analysis Plan',
      description: 'Comprehensive analysis of the codebase structure, architecture, and quality',
      tasks
    };
  }

  /**
   * Create implementation template
   */
  private createImplementationTemplate(request: string, context: PlanningContext): {
    title: string;
    description: string;
    tasks: Task[];
  } {
    const tasks: Task[] = [
      this.createTaskFromTemplate({
        title: 'Requirements Analysis',
        description: 'Analyze and document the implementation requirements',
        type: 'analysis',
        estimatedDuration: 20,
        toolsRequired: ['filesystem'],
        acceptance_criteria: ['Requirements documented', 'Scope defined']
      }),
      this.createTaskFromTemplate({
        title: 'Design Planning',
        description: 'Design the implementation approach and architecture',
        type: 'analysis',
        estimatedDuration: 30,
        toolsRequired: ['filesystem'],
        acceptance_criteria: ['Design approach documented', 'Architecture planned']
      }),
      this.createTaskFromTemplate({
        title: 'Core Implementation',
        description: 'Implement the core functionality',
        type: 'implementation',
        estimatedDuration: 60,
        toolsRequired: ['filesystem', 'code-editor'],
        acceptance_criteria: ['Core functionality implemented', 'Code follows standards']
      }),
      this.createTaskFromTemplate({
        title: 'Testing and Validation',
        description: 'Test the implementation and validate functionality',
        type: 'testing',
        estimatedDuration: 30,
        toolsRequired: ['testing', 'filesystem'],
        acceptance_criteria: ['Tests pass', 'Functionality validated']
      })
    ];

    return {
      title: 'Feature Implementation Plan',
      description: 'Complete plan for implementing new functionality',
      tasks
    };
  }

  /**
   * Create bug fix template
   */
  private createBugFixTemplate(request: string, context: PlanningContext): {
    title: string;
    description: string;
    tasks: Task[];
  } {
    const tasks: Task[] = [
      this.createTaskFromTemplate({
        title: 'Issue Investigation',
        description: 'Investigate and reproduce the bug',
        type: 'analysis',
        estimatedDuration: 20,
        toolsRequired: ['filesystem', 'debugging'],
        acceptance_criteria: ['Bug reproduced', 'Root cause identified']
      }),
      this.createTaskFromTemplate({
        title: 'Fix Implementation',
        description: 'Implement the bug fix',
        type: 'implementation',
        estimatedDuration: 30,
        toolsRequired: ['filesystem', 'code-editor'],
        acceptance_criteria: ['Fix implemented', 'Code compiles']
      }),
      this.createTaskFromTemplate({
        title: 'Testing and Verification',
        description: 'Test the fix and verify it resolves the issue',
        type: 'testing',
        estimatedDuration: 20,
        toolsRequired: ['testing', 'filesystem'],
        acceptance_criteria: ['Fix verified', 'No regressions introduced']
      })
    ];

    return {
      title: 'Bug Fix Plan',
      description: 'Plan to investigate, fix, and verify bug resolution',
      tasks
    };
  }

  /**
   * Create refactoring template
   */
  private createRefactoringTemplate(request: string, context: PlanningContext): {
    title: string;
    description: string;
    tasks: Task[];
  } {
    const tasks: Task[] = [
      this.createTaskFromTemplate({
        title: 'Code Analysis',
        description: 'Analyze current code to identify refactoring opportunities',
        type: 'analysis',
        estimatedDuration: 25,
        toolsRequired: ['filesystem', 'code-analysis'],
        acceptance_criteria: ['Refactoring targets identified', 'Impact assessed']
      }),
      this.createTaskFromTemplate({
        title: 'Refactoring Implementation',
        description: 'Implement the code refactoring',
        type: 'refactoring',
        estimatedDuration: 45,
        toolsRequired: ['filesystem', 'code-editor'],
        acceptance_criteria: ['Code refactored', 'Functionality preserved']
      }),
      this.createTaskFromTemplate({
        title: 'Validation and Testing',
        description: 'Validate refactoring and ensure no functionality is broken',
        type: 'testing',
        estimatedDuration: 20,
        toolsRequired: ['testing', 'filesystem'],
        acceptance_criteria: ['Tests pass', 'Refactoring validated']
      })
    ];

    return {
      title: 'Code Refactoring Plan',
      description: 'Plan to refactor and improve code quality',
      tasks
    };
  }

  /**
   * Create testing template
   */
  private createTestingTemplate(request: string, context: PlanningContext): {
    title: string;
    description: string;
    tasks: Task[];
  } {
    const tasks: Task[] = [
      this.createTaskFromTemplate({
        title: 'Test Strategy Planning',
        description: 'Plan the testing strategy and approach',
        type: 'analysis',
        estimatedDuration: 15,
        toolsRequired: ['filesystem'],
        acceptance_criteria: ['Test strategy defined', 'Test cases planned']
      }),
      this.createTaskFromTemplate({
        title: 'Test Implementation',
        description: 'Implement the test cases',
        type: 'testing',
        estimatedDuration: 40,
        toolsRequired: ['testing', 'filesystem'],
        acceptance_criteria: ['Test cases implemented', 'Tests executable']
      }),
      this.createTaskFromTemplate({
        title: 'Test Execution and Validation',
        description: 'Execute tests and validate results',
        type: 'testing',
        estimatedDuration: 20,
        toolsRequired: ['testing'],
        acceptance_criteria: ['Tests executed', 'Results analyzed']
      })
    ];

    return {
      title: 'Testing Plan',
      description: 'Comprehensive testing plan and implementation',
      tasks
    };
  }

  /**
   * Create generic template for unclassified requests
   */
  private createGenericTemplate(request: string, context: PlanningContext): {
    title: string;
    description: string;
    tasks: Task[];
  } {
    const tasks: Task[] = [
      this.createTaskFromTemplate({
        title: 'Requirement Analysis',
        description: 'Analyze and understand the request requirements',
        type: 'analysis',
        estimatedDuration: 20,
        toolsRequired: ['filesystem'],
        acceptance_criteria: ['Requirements understood', 'Approach planned']
      }),
      this.createTaskFromTemplate({
        title: 'Implementation',
        description: request.length > 50 ? request.substring(0, 50) + '...' : request,
        type: 'implementation',
        estimatedDuration: 40,
        toolsRequired: ['filesystem'],
        acceptance_criteria: ['Request implemented', 'Solution working']
      })
    ];

    return {
      title: 'Generic Task Plan',
      description: request,
      tasks
    };
  }

  /**
   * Create pattern-based plan by extracting actions from request
   */
  private createPatternBasedPlan(request: string, context: PlanningContext): {
    title: string;
    description: string;
    tasks: Task[];
  } {
    const extractedTasks = this.extractTasksFromText(request);

    if (extractedTasks.length === 0) {
      throw new Error('No tasks could be extracted from request');
    }

    const tasks: Task[] = extractedTasks.map((taskData, index) =>
      this.createTaskFromTemplate({
        title: taskData.title,
        description: taskData.description,
        type: taskData.type,
        estimatedDuration: taskData.estimatedDuration,
        toolsRequired: taskData.toolsRequired,
        acceptance_criteria: taskData.acceptance_criteria
      }, index)
    );

    return {
      title: 'Pattern-Based Plan',
      description: `Plan extracted from request: ${request.substring(0, 100)}`,
      tasks
    };
  }

  /**
   * Create simple fallback plan (last resort)
   */
  private createSimpleFallbackPlan(request: string, context: PlanningContext): {
    title: string;
    description: string;
    tasks: Task[];
    confidence: number;
  } {
    const task = this.createTaskFromTemplate({
      title: 'Complete Request',
      description: request,
      type: 'implementation',
      estimatedDuration: 60,
      toolsRequired: ['filesystem'],
      acceptance_criteria: ['Request completed successfully']
    });

    return {
      title: 'Simple Fallback Plan',
      description: request,
      tasks: [task],
      confidence: 0.3
    };
  }

  /**
   * Helper to create task from template data
   */
  private createTaskFromTemplate(template: {
    title: string;
    description: string;
    type: string;
    estimatedDuration: number;
    toolsRequired: string[];
    acceptance_criteria: string[];
  }, index: number = 0): Task {
    return {
      id: `task_${Date.now()}_${index}`,
      title: template.title,
      description: template.description,
      type: template.type as any,
      priority: 'medium',
      status: 'pending',
      dependencies: [],
      estimatedDuration: template.estimatedDuration,
      toolsRequired: template.toolsRequired,
      filesInvolved: [],
      acceptance_criteria: template.acceptance_criteria,
      created: new Date()
    };
  }

  /**
   * Build dependency map
   */
  private buildDependencyMap(tasks: Task[]): Map<string, string[]> {
    const dependencyMap = new Map<string, string[]>();

    for (const task of tasks) {
      dependencyMap.set(task.id, task.dependencies);
    }

    return dependencyMap;
  }

  /**
   * Validate plan for circular dependencies and other issues
   */
  private async validatePlan(plan: TaskPlan): Promise<void> {
    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (taskId: string): boolean => {
      if (recursionStack.has(taskId)) return true;
      if (visited.has(taskId)) return false;

      visited.add(taskId);
      recursionStack.add(taskId);

      const dependencies = plan.dependencies.get(taskId) || [];
      for (const dep of dependencies) {
        if (hasCycle(dep)) return true;
      }

      recursionStack.delete(taskId);
      return false;
    };

    for (const task of plan.tasks) {
      if (hasCycle(task.id)) {
        throw new Error('Circular dependency detected in task plan');
      }
    }

    // Validate and fix dependency references
    const taskIds = new Set(plan.tasks.map(t => t.id));
    const taskNameToId = new Map(plan.tasks.map(t => [t.title, t.id]));

    for (const task of plan.tasks) {
      const validDependencies: string[] = [];

      for (const dep of task.dependencies) {
        if (taskIds.has(dep)) {
          // Dependency is already a valid task ID
          validDependencies.push(dep);
        } else if (taskNameToId.has(dep)) {
          // Dependency is a task name, convert to task ID
          const depId = taskNameToId.get(dep)!;
          validDependencies.push(depId);
          logger.debug(`Mapped dependency name "${dep}" to ID "${depId}" for task ${task.id}`);
        } else {
          // Invalid dependency, log warning but don't include it
          logger.warn(`Invalid dependency reference: ${dep} in task ${task.id}`);
        }
      }

      task.dependencies = validDependencies;
    }
  }

  /**
   * Optimize plan for better execution
   */
  private async optimizePlan(plan: TaskPlan): Promise<void> {
    // Reorder tasks for better parallel execution
    // Group similar tasks together
    // Optimize resource usage

    logger.debug('Plan optimization completed');
  }

  /**
   * Determine execution order respecting dependencies
   */
  private determineExecutionOrder(plan: TaskPlan): string[] {
    const order: string[] = [];
    const completed = new Set<string>();

    while (order.length < plan.tasks.length) {
      let addedAny = false;

      for (const task of plan.tasks) {
        if (completed.has(task.id)) continue;

        // Check if all dependencies are completed
        const canExecute = task.dependencies.every(dep => completed.has(dep));

        if (canExecute) {
          order.push(task.id);
          completed.add(task.id);
          addedAny = true;
        }
      }

      if (!addedAny) {
        // Deadlock - this shouldn't happen if validation passed
        logger.error('Execution deadlock detected');
        break;
      }
    }

    return order;
  }

  /**
   * Execute individual task
   */
  private async executeTask(task: Task, plan: TaskPlan): Promise<void> {
    logger.info(`Executing task: ${task.title}`);

    task.status = 'in_progress';
    task.started = new Date();

    try {
      // Use AI to execute the task
      const taskPrompt = this.buildTaskExecutionPrompt(task, plan);

      const response = await this.aiClient.complete(taskPrompt, {
        enableToolUse: task.toolsRequired.length > 0,
        responseQuality: 'high'
      });

      // Handle different AI response structures
      if (response?.content) {
        task.result = response.content;
      } else if (response?.message?.content) {
        task.result = response.message.content;
      } else if (typeof response === 'string') {
        task.result = response;
      } else {
        task.result = safeStringify(response, { maxDepth: 5 });
        logger.warn('Unexpected AI response structure, storing as safe JSON string');
      }

      task.status = 'completed';
      task.completed = new Date();
      task.actualDuration = (task.completed.getTime() - task.started!.getTime()) / (1000 * 60);

      logger.info(`Task completed: ${task.title} (${task.actualDuration.toFixed(1)}min)`);

    } catch (error) {
      const normalizedError = normalizeError(error);
      task.status = 'failed';
      task.error = normalizedError.message;
      task.completed = new Date();

      logger.error(`Task failed: ${task.title} - ${task.error}`);
    }
  }

  /**
   * Build task execution prompt
   */
  private buildTaskExecutionPrompt(task: Task, plan: TaskPlan): string {
    let prompt = `## Task: ${task.title}\n\n${task.description}\n\n`;

    // Add PROJECT CONTEXT - This is critical for accurate analysis!
    if (this.projectContext) {
      prompt += '## Project Context:\n';
      prompt += `**Project Directory:** ${this.projectContext.root}\n`;
      prompt += `**Working Directory:** ${process.cwd()}\n\n`;

      // Add file structure
      if (this.projectContext.allFiles && this.projectContext.allFiles.length > 0) {
        prompt += '### Actual Project Files:\n';
        const sortedFiles = this.projectContext.allFiles
          .slice(0, 50) // Limit to first 50 files to avoid overwhelming the prompt
          .sort((a, b) => a.path.localeCompare(b.path));

        for (const file of sortedFiles) {
          prompt += `- ${file.path} (${file.type})\n`;
        }

        if (this.projectContext.allFiles.length > 50) {
          prompt += `... and ${this.projectContext.allFiles.length - 50} more files\n`;
        }
        prompt += '\n';
      }

      // Add package.json info if available
      const packageJsonFile = this.projectContext.allFiles?.find(f => f.path.includes('package.json'));
      if (packageJsonFile) {
        prompt += '### Project Type: Node.js/TypeScript project (has package.json)\n';
      }

      // Add key directories
      const directories = new Set<string>();
      this.projectContext.allFiles?.forEach(file => {
        const dir = file.path.split('/')[0];
        if (dir && dir !== file.path) {
          directories.add(dir);
        }
      });

      if (directories.size > 0) {
        prompt += '### Key Directories:\n';
        Array.from(directories).sort().forEach(dir => {
          prompt += `- ${dir}/\n`;
        });
        prompt += '\n';
      }
    } else {
      prompt += '## ⚠️ WARNING: No project context available - analysis may be generic\n\n';
    }

    // Add context from completed tasks
    const completedTasks = plan.tasks.filter(t => t.status === 'completed');
    if (completedTasks.length > 0) {
      prompt += '## Previous Task Results:\n';
      for (const prevTask of completedTasks) {
        if (task.dependencies.includes(prevTask.id)) {
          prompt += `- ${prevTask.title}: ${prevTask.result}\n`;
        }
      }
      prompt += '\n';
    }

    // Add acceptance criteria
    if (task.acceptance_criteria.length > 0) {
      prompt += '## Acceptance Criteria:\n';
      for (const criteria of task.acceptance_criteria) {
        prompt += `- ${criteria}\n`;
      }
      prompt += '\n';
    }

    prompt += '**IMPORTANT:** Base your analysis ONLY on the actual project files and context provided above. Do not make assumptions or use generic examples.';

    return prompt;
  }

  /**
   * Check if task dependencies are completed
   */
  private areDependenciesCompleted(task: Task, plan: TaskPlan): boolean {
    return task.dependencies.every(depId => {
      const depTask = plan.tasks.find(t => t.id === depId);
      return depTask?.status === 'completed';
    });
  }

  /**
   * Update plan progress
   */
  private updatePlanProgress(plan: TaskPlan): void {
    const completed = plan.tasks.filter(t => t.status === 'completed').length;
    plan.progress = {
      completed,
      total: plan.tasks.length,
      percentage: Math.round((completed / plan.tasks.length) * 100)
    };
  }

  /**
   * Check if all tasks are completed
   */
  private allTasksCompleted(plan: TaskPlan): boolean {
    return plan.tasks.every(t => t.status === 'completed');
  }

  /**
   * Adapt plan when issues occur
   */
  private async adaptPlan(plan: TaskPlan, failedTask: Task): Promise<void> {
    logger.info(`Adapting plan due to task issues: ${failedTask.title}`);

    plan.metadata.adaptations++;

    // Simple adaptation: add retry task or break down failed task
    if (failedTask.status === 'failed' && plan.metadata.adaptations < 3) {
      // Create a simplified version of the failed task
      const retryTask: Task = {
        ...failedTask,
        id: `${failedTask.id}_retry`,
        title: `Retry: ${failedTask.title}`,
        estimatedDuration: Math.ceil(failedTask.estimatedDuration * 0.5),
        status: 'pending',
        started: undefined,
        completed: undefined,
        error: undefined,
        result: undefined
      };

      plan.tasks.push(retryTask);
      plan.progress.total++;
    }
  }

  /**
   * Helper method to increase complexity level
   */
  private increaseComplexity(current: 'simple' | 'moderate' | 'complex' | 'expert'): typeof current {
    const levels = ['simple', 'moderate', 'complex', 'expert'] as const;
    const currentIndex = levels.indexOf(current);
    return levels[Math.min(currentIndex + 1, levels.length - 1)];
  }

  /**
   * Generate unique plan ID
   */
  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active plan
   */
  getPlan(planId: string): TaskPlan | undefined {
    return this.activePlans.get(planId);
  }

  /**
   * List all active plans
   */
  getActivePlans(): TaskPlan[] {
    return Array.from(this.activePlans.values());
  }

  /**
   * Cancel plan execution
   */
  cancelPlan(planId: string): void {
    const plan = this.activePlans.get(planId);
    if (plan) {
      plan.status = 'failed';
      // Mark pending and in-progress tasks as blocked
      for (const task of plan.tasks) {
        if (task.status === 'pending' || task.status === 'in_progress') {
          task.status = 'blocked';
        }
      }
      logger.info(`Plan cancelled: ${plan.title}`);
    }
  }

  /**
   * Assess risk level based on tasks and complexity
   */
  private assessRiskLevel(tasks: Task[], complexity: 'simple' | 'moderate' | 'complex' | 'expert'): 'low' | 'medium' | 'high' {
    // Base risk on complexity
    if (complexity === 'expert') return 'high';
    if (complexity === 'complex') return 'medium';

    // Check for risky task types
    const riskyTasks = tasks.filter(task =>
      task.type === 'implementation' ||
      task.type === 'refactoring' ||
      task.filesInvolved.length > 5
    );

    if (riskyTasks.length > tasks.length * 0.7) return 'high';
    if (riskyTasks.length > tasks.length * 0.3) return 'medium';

    return 'low';
  }
}