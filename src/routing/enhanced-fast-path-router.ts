/**
 * Enhanced Fast-Path Router
 *
 * High-performance router that bypasses AI analysis for obvious commands.
 * Implements comprehensive pattern matching, fuzzy matching, and confidence scoring.
 */

import { logger } from '../utils/logger.js';
import { commandRegistry } from '../commands/index.js';
import { FAST_PATH_CONFIG_DEFAULTS } from '../constants/streaming.js';
import { THRESHOLD_CONSTANTS } from '../config/constants.js';

export interface FastPathResult {
  commandName: string;
  args: string[];
  confidence: number;
  method: 'exact' | 'pattern' | 'fuzzy' | 'alias';
}

export interface FastPathConfig {
  enableFuzzyMatching: boolean;
  fuzzyThreshold: number;
  enableAliases: boolean;
  enablePatternExpansion: boolean;
  maxProcessingTime: number; // ms
}

export interface PatternRule {
  patterns: string[];
  command: string;
  confidence: number;
  extractArgs?: (input: string) => string[];
}

/**
 * Enhanced fast-path router with multiple matching strategies
 */
export class EnhancedFastPathRouter {
  private readonly config: FastPathConfig;
  private readonly patternRules: Map<string, PatternRule[]>;
  private readonly aliasMap: Map<string, string>;
  private readonly commandCache: Map<string, FastPathResult>;

  constructor(config: Partial<FastPathConfig> = {}) {
    this.config = {
      ...FAST_PATH_CONFIG_DEFAULTS,
      ...config
    };

    this.patternRules = new Map();
    this.aliasMap = new Map();
    this.commandCache = new Map();

    this.initializePatternRules();
    this.initializeAliases();
  }

  /**
   * Check if input can be handled by fast-path routing
   */
  async checkFastPath(input: string): Promise<FastPathResult | null> {
    const startTime = performance.now();

    try {
      // Normalize input
      const normalizedInput = this.normalizeInput(input);

      // Early exit for knowledge graph queries - let them go through full AI processing
      if (this.isKnowledgeGraphQuery(normalizedInput)) {
        logger.debug('Knowledge graph query detected - bypassing fast-path routing');
        return null;
      }

      // Check cache first
      const cached = this.commandCache.get(normalizedInput);
      if (cached) {
        logger.debug('Fast-path cache hit', { input: input.substring(0, 50), command: cached.commandName });
        return cached;
      }

      // Try different matching strategies in order of speed/accuracy
      const strategies = [
        () => this.exactMatch(normalizedInput, input),
        () => this.aliasMatch(normalizedInput, input),
        () => this.patternMatch(normalizedInput),
        () => this.config.enableFuzzyMatching ? this.fuzzyMatch(normalizedInput) : null
      ];

      for (const strategy of strategies) {
        const result = strategy();
        if (result && result.confidence > THRESHOLD_CONSTANTS.PATTERN_MATCH.MINIMUM) {
          // Cache successful matches
          this.commandCache.set(normalizedInput, result);

          const duration = performance.now() - startTime;
          logger.debug('Fast-path match found', {
            method: result.method,
            confidence: result.confidence,
            duration: `${duration.toFixed(2)}ms`
          });

          return result;
        }

        // Respect time budget
        if (performance.now() - startTime > this.config.maxProcessingTime) {
          logger.debug('Fast-path processing timeout');
          break;
        }
      }

      logger.debug('No fast-path match found', { input: input.substring(0, 50) });
      return null;

    } catch (error) {
      logger.error('Fast-path routing error:', error);
      return null;
    }
  }

  /**
   * Exact command name matching
   */
  private exactMatch(normalizedInput: string, originalInput?: string): FastPathResult | null {
    const trimmed = normalizedInput.trim();
    const parts = trimmed.split(/\s+/);
    const commandName = parts[0];

    if (commandRegistry.exists(commandName)) {
      let args = parts.slice(1);

      // Special handling for 'explain' command - only match if files are present
      if (commandName === 'explain') {
        // Check if any argument looks like a file path
        const hasFileArgs = args.some(arg =>
          arg.includes('.') || arg.includes('/') || arg.includes('\\')
        );

        if (!hasFileArgs) {
          // This is probably a general explanation request, not a file explanation
          return null;
        }
      }

      // Special handling for 'ask' command - preserve quoted arguments
      if (commandName === 'ask' && originalInput && originalInput.includes('"')) {
        const quoteMatch = originalInput.match(/^ask\s+"([^"]+)"/i);
        if (quoteMatch) {
          args = [quoteMatch[1]];
        }
      }

      return {
        commandName,
        args,
        confidence: 1.0,
        method: 'exact'
      };
    }

    return null;
  }

  /**
   * Alias-based matching
   */
  private aliasMatch(normalizedInput: string, originalInput?: string): FastPathResult | null {
    if (!this.config.enableAliases) return null;

    const trimmed = normalizedInput.trim().toLowerCase();
    const parts = trimmed.split(/\s+/);
    const potential = parts[0];

    const commandName = this.aliasMap.get(potential);
    if (commandName && commandRegistry.exists(commandName)) {
      let args = parts.slice(1);

      // Special handling for 'ask' command - preserve quoted arguments
      if (commandName === 'ask' && originalInput && originalInput.includes('"')) {
        const quoteMatch = originalInput.match(/^ask\s+"([^"]+)"/i);
        if (quoteMatch) {
          args = [quoteMatch[1]];
        }
      }

      return {
        commandName,
        args,
        confidence: 0.95,
        method: 'alias'
      };
    }

    return null;
  }

  /**
   * Pattern-based matching with confidence scoring
   */
  private patternMatch(input: string): FastPathResult | null {
    const trimmed = input.trim().toLowerCase();
    let bestMatch: FastPathResult | null = null;
    let bestScore = 0;

    for (const [category, rules] of this.patternRules) {
      for (const rule of rules) {
        for (const pattern of rule.patterns) {
          const score = this.calculatePatternScore(trimmed, pattern);

          if (score > bestScore && score > THRESHOLD_CONSTANTS.PATTERN_MATCH.MINIMUM) {
            bestScore = score;
            bestMatch = {
              commandName: rule.command,
              args: rule.extractArgs ? rule.extractArgs(input) : [],
              confidence: score * rule.confidence,
              method: 'pattern'
            };
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Fuzzy matching for typos and variations
   */
  private fuzzyMatch(input: string): FastPathResult | null {
    const trimmed = input.trim().toLowerCase();
    const parts = trimmed.split(/\s+/);
    const potential = parts[0];

    // Skip fuzzy matching for complex sentences (likely natural language requests)
    if (parts.length > 4 || this.isNaturalLanguageRequest(trimmed)) {
      return null;
    }

    const commands = commandRegistry.list();
    let bestMatch: FastPathResult | null = null;
    let bestScore = 0;

    for (const command of commands) {
      const score = this.calculateFuzzyScore(potential, command.name);

      if (score > bestScore && score >= this.config.fuzzyThreshold) {
        bestScore = score;
        bestMatch = {
          commandName: command.name,
          args: parts.slice(1),
          confidence: score * 0.8, // Lower confidence for fuzzy matches
          method: 'fuzzy'
        };
      }
    }

    return bestMatch;
  }

  /**
   * Check if input looks like a natural language request rather than a command
   */
  private isNaturalLanguageRequest(input: string): boolean {
    // Common indicators of natural language requests
    const naturalLanguageIndicators = [
      /\b(set up|setup)\s+.*\b(framework|system|environment|infrastructure|project)/i,
      /\b(create|build|implement|develop|write)\s+.*\b(for|a|an|the)\b/i,
      /\b(how to|how can|can you|please|help me)\b/i,
      /\b(i want|i need|i would like)\b/i,
      /\b(what is|what are|explain|describe)\b/i,
      /\b(complete|comprehensive|full|entire)\b.*\b(testing|framework|system|solution)\b/i,
      /\b(analyze|review|examine)\s+.*\b(code|performance|characteristics|quality|structure)/i,
      /\b(refactor|improve|optimize|enhance)\s+.*\b(code|function|class|component)/i,
      /\b(find|identify|detect)\s+.*\b(issues|problems|bugs|errors|vulnerabilities)/i,
      /\b(generate|write|create)\s+.*\b(tests|documentation|comments|examples)/i
    ];

    return naturalLanguageIndicators.some(pattern => pattern.test(input));
  }

  /**
   * Initialize comprehensive pattern rules
   */
  private initializePatternRules(): void {
    // Git commands
    this.patternRules.set('git', [
      {
        patterns: [
          'git status',
          'check status',
          'check the status',
          'show status',
          'show git status',
          'show me status',
          'show me git status',
          'show me the status',
          'show me the git status',
          'display status',
          'display git status',
          'get status',
          'get git status',
          'what is the status',
          'what is the git status',
          'current status',
          'repo status',
          'repository status',
          'status of repo',
          'status of repository',
          'status of this repo'
        ],
        command: 'git-status',
        confidence: 0.95
      },
      {
        patterns: [
          'git commit',
          'create commit',
          'make commit',
          'commit changes',
          'commit the changes',
          'save changes',
          'save the changes'
        ],
        command: 'git-commit',
        confidence: 0.9
      },
      {
        patterns: [
          'git branch',
          'list branch',
          'list branches',
          'show branch',
          'show branches',
          'branch info',
          'current branch',
          'what branch'
        ],
        command: 'git-branch',
        confidence: 0.9
      }
    ]);

    // Model commands
    this.patternRules.set('models', [
      {
        patterns: [
          'list models',
          'show models',
          'available models',
          'what models',
          'models list',
          'get models'
        ],
        command: 'list-models',
        confidence: 0.95
      },
      {
        patterns: [
          'pull model',
          'download model',
          'get model',
          'install model'
        ],
        command: 'pull-model',
        confidence: 0.9,
        extractArgs: (input: string) => {
          const match = input.match(/(?:pull|download|get|install)\s+model\s+(\S+)/i);
          return match ? [match[1]] : [];
        }
      }
    ]);

    // Help commands
    this.patternRules.set('help', [
      {
        patterns: [
          'help',
          'show help',
          'get help',
          'how to',
          'what can you do',
          'what commands',
          'available commands',
          'command list'
        ],
        command: 'help',
        confidence: 0.95
      }
    ]);

    // Search commands
    this.patternRules.set('search', [
      {
        patterns: [
          'search for',
          'find',
          'look for',
          'search',
          'grep'
        ],
        command: 'search',
        confidence: 0.85,
        extractArgs: (input: string) => {
          const match = input.match(/(?:search|find|look)\s+(?:for\s+)?(.+)/i);
          return match ? [match[1].trim()] : [];
        }
      }
    ]);
  }

  /**
   * Initialize command aliases
   */
  private initializeAliases(): void {
    if (!this.config.enableAliases) {
      this.aliasMap.clear();
      return;
    }

    const aliases = {
      // Common shortcuts
      'status': 'git-status',
      'st': 'git-status',
      'commit': 'git-commit',
      'ci': 'git-commit',
      'branch': 'git-branch',
      'br': 'git-branch',

      // Model shortcuts
      'models': 'list-models',
      'ls': 'list-models',
      'pull': 'pull-model',
      'download': 'pull-model',

      // General shortcuts
      'h': 'help',
      '?': 'help',
      's': 'search',
      'find': 'search',

      // Ask variants
      'ask': 'ask',
      'question': 'ask',
      'q': 'ask'
    };

    for (const [alias, command] of Object.entries(aliases)) {
      this.aliasMap.set(alias, command);
    }
  }

  /**
   * Calculate pattern matching score
   */
  private calculatePatternScore(input: string, pattern: string): number {
    // Exact match
    if (input === pattern) return 1.0;

    // Contains pattern
    if (input.includes(pattern)) return THRESHOLD_CONSTANTS.PATTERN_MATCH.EXACT;

    // Pattern contains input (partial match)
    if (pattern.includes(input)) return THRESHOLD_CONSTANTS.PATTERN_MATCH.PARTIAL;

    // Word-based matching with improved precision
    const inputWords = input.split(/\s+/);
    const patternWords = pattern.split(/\s+/);

    let matchedWords = 0;
    const matchedInputWords = new Set<string>();

    for (const word of inputWords) {
      for (const pw of patternWords) {
        // Only match if words are identical, or if one is a meaningful prefix/suffix
        // Avoid matching short substrings like "is" in "characteristics"
        if (word === pw ||
            (word.length > 3 && pw.length > 3 &&
             (word.startsWith(pw) || pw.startsWith(word) ||
              word.endsWith(pw) || pw.endsWith(word)))) {
          if (!matchedInputWords.has(word)) {
            matchedWords++;
            matchedInputWords.add(word);
            break;
          }
        }
      }
    }

    const wordScore = matchedWords / Math.max(inputWords.length, patternWords.length);

    // Require higher word match ratio for pattern matching
    if (wordScore > 0.4) {
      return Math.max(wordScore * 0.8, 0.6); // Reduced minimum score
    }

    return 0;
  }

  /**
   * Calculate fuzzy matching score using Levenshtein distance
   */
  private calculateFuzzyScore(input: string, target: string): number {
    if (input === target) return 1.0;

    // Handle exact prefix matches with high scores
    if (target.startsWith(input) || input.startsWith(target)) {
      return 0.85;
    }

    const distance = this.levenshteinDistance(input, target);
    const maxLength = Math.max(input.length, target.length);

    if (maxLength === 0) return 1.0;

    const score = 1 - (distance / maxLength);

    // Boost score for close matches
    if (distance <= 2 && maxLength >= 4) {
      return Math.min(score + 0.1, 1.0);
    }

    return score;
  }

  /**
   * Levenshtein distance calculation
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Normalize input for consistent processing
   */
  private normalizeInput(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ') // Replace special chars with spaces
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.commandCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    // This would be tracked in a real implementation
    return {
      size: this.commandCache.size,
      hitRate: 0 // Would track hits vs misses
    };
  }

  /**
   * Check if the input is a knowledge graph query that should bypass fast-path routing
   */
  private isKnowledgeGraphQuery(input: string): boolean {
    // Keywords that indicate knowledge graph queries
    const knowledgeGraphKeywords = [
      'knowledge graph', 'graph', 'indexed', 'elements', 'nodes', 'edges',
      'code elements', 'relationships', 'patterns', 'architecture',
      'dependencies', 'structure', 'analysis', 'codebase analysis'
    ];

    // Patterns that specifically indicate knowledge graph queries
    const knowledgeGraphPatterns = [
      /knowledge.*graph/,
      /graph.*(?:show|contains|has|statistics|overview|elements)/,
      /(?:show|list|display).*(?:code elements|elements|nodes|indexed)/,
      /(?:what|which).*(?:indexed|in.*knowledge|in.*graph)/,
      /(?:graph|codebase).*(?:statistics|overview|summary|elements)/,
      /indexed.*(?:in|knowledge|graph|elements)/,
      /code.*elements.*(?:indexed|graph|knowledge)/,
      /(?:analyze|analysis).*(?:codebase|architecture|structure)/
    ];

    // Check for direct keyword matches
    const hasKnowledgeGraphKeywords = knowledgeGraphKeywords.some(keyword =>
      input.includes(keyword)
    );

    // Check for pattern matches
    const hasKnowledgeGraphPatterns = knowledgeGraphPatterns.some(pattern =>
      pattern.test(input)
    );

    return hasKnowledgeGraphKeywords || hasKnowledgeGraphPatterns;
  }
}