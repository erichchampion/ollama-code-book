/**
 * Complexity Detection
 *
 * Heuristics to detect request complexity and suggest planning for complex tasks.
 */

export interface ComplexityResult {
  level: 'simple' | 'moderate' | 'complex';
  indicators: string[];
  confidence: number;
}

/**
 * Detect complexity level of a user request
 */
export function detectComplexity(request: string): ComplexityResult {
  const requestLower = request.toLowerCase();
  const indicators: string[] = [];
  let complexityScore = 0;

  // Simple request indicators
  const simpleKeywords = [
    'what is',
    'what are',
    'explain',
    'show',
    'how to',
    'example',
    'tell me',
  ];
  const hasSimpleKeywords = simpleKeywords.some((keyword) => requestLower.includes(keyword));

  // Complex request indicators
  const complexKeywords = [
    'architecture',
    'microservices',
    'distributed',
    'scalable',
    'refactor entire',
    'redesign',
    'migrate',
    'full-stack',
    'complete',
  ];
  const hasComplexKeywords = complexKeywords.some((keyword) => requestLower.includes(keyword));
  
  // System keyword - check separately as it's common but needs context
  const hasSystemKeyword = requestLower.includes('system');

  // Multi-file indicators - look for file extensions
  const fileExtensionPattern = /\.(js|ts|jsx|tsx|py|java|cpp|c|cs|php|rb|go|rs|json|yaml|yml|md|html|css)/gi;
  const fileMatches = Array.from(requestLower.matchAll(fileExtensionPattern));
  const fileCount = fileMatches.length;
  if (fileCount >= 3) {
    indicators.push('multiple_files');
    complexityScore += 2;
  } else if (fileCount >= 2) {
    indicators.push('multiple_files');
    complexityScore += 1;
  }

  // Multi-phase indicators
  const phaseKeywords = ['then', 'after', 'next', 'finally', 'and then', 'followed by'];
  const phaseConnectors = ['set up', 'implement', 'add', 'create', 'build', 'deploy', 'test'];
  const phaseCount = phaseConnectors.filter((connector) => requestLower.includes(connector)).length;
  if (phaseCount >= 4) {
    indicators.push('multi_phase');
    complexityScore += 4; // 4+ phases indicates complex task
  } else if (phaseCount >= 3) {
    indicators.push('multi_phase');
    complexityScore += 3; // 3 phases indicates complex task
  } else if (phaseCount >= 2) {
    indicators.push('multi_phase');
    complexityScore += 1;
  }

  // Architecture/system design indicators
  if (hasComplexKeywords) {
    if (requestLower.includes('architecture')) {
      indicators.push('architecture');
      indicators.push('system_design');
      complexityScore += 4; // Architecture requests are complex
    } else {
      indicators.push('system_design');
      complexityScore += 2;
    }
  }
  
  // System keyword with other indicators makes it complex
  if (hasSystemKeyword && (hasComplexKeywords || requestLower.includes('authentication') || requestLower.includes('api'))) {
    indicators.push('system_design');
    complexityScore += 2;
  }

  // Refactoring indicators
  if (requestLower.includes('refactor') && requestLower.includes('entire')) {
    indicators.push('large_refactor');
    complexityScore += 3;
  } else if (requestLower.includes('refactor')) {
    complexityScore += 1;
  }

  // Length indicator (very long requests are likely complex)
  if (request.length > 200) {
    indicators.push('long_request');
    complexityScore += 1;
  }

  // Multiple components/features mentioned
  const componentKeywords = ['component', 'service', 'module', 'feature', 'endpoint', 'api'];
  const componentCount = componentKeywords.filter((keyword) =>
    requestLower.includes(keyword)
  ).length;
  if (componentCount >= 3) {
    indicators.push('multiple_components');
    complexityScore += 2;
  } else if (componentCount >= 1) {
    // Even a single component/service mention suggests moderate complexity
    indicators.push('multiple_components');
    complexityScore += 2; // Give 2 points to ensure moderate level
  }
  
  // Multiple features mentioned (login, registration, password reset, etc.)
  const featureKeywords = ['login', 'registration', 'authentication', 'password reset', 'checkout', 'payment'];
  const featureCount = featureKeywords.filter((keyword) => requestLower.includes(keyword)).length;
  if (featureCount >= 3) {
    indicators.push('multiple_features');
    complexityScore += 2;
  } else if (featureCount >= 2) {
    indicators.push('multiple_features');
    complexityScore += 1;
  }
  
  // Detect multiple entities/features mentioned together (e.g., "users, posts, and comments")
  // Pattern: look for lists with "and" or commas indicating multiple items
  const listPattern = /\b(for|with|including)\s+[\w\s,]+(?:and|,)\s+[\w\s,]+/gi;
  const listMatches = Array.from(requestLower.matchAll(listPattern));
  if (listMatches.length > 0 && (requestLower.includes('endpoint') || requestLower.includes('api'))) {
    // If endpoints/API mentioned with multiple entities, it's complex
    indicators.push('multiple_endpoints');
    complexityScore += 2;
  }
  
  // Also detect when multiple component keywords appear together (e.g., "REST API with endpoints")
  if (componentCount >= 2 && (requestLower.includes('rest') || requestLower.includes('api'))) {
    indicators.push('api_system');
    complexityScore += 1;
  }

  // Determine complexity level
  let level: 'simple' | 'moderate' | 'complex';
  if (hasSimpleKeywords && complexityScore <= 1) {
    level = 'simple';
  } else if (complexityScore >= 4) {
    level = 'complex';
  } else if (complexityScore >= 2) {
    level = 'moderate';
  } else {
    level = 'simple';
  }

  // Calculate confidence (0-1)
  const confidence = Math.min(complexityScore / 5, 1);

  return {
    level,
    indicators,
    confidence,
  };
}

/**
 * Determine if planning should be suggested for a request
 */
export function shouldSuggestPlanning(request: string): boolean {
  const complexity = detectComplexity(request);

  // Always suggest for complex requests
  if (complexity.level === 'complex') {
    return true;
  }

  // Suggest for moderate requests with multiple indicators
  if (complexity.level === 'moderate' && complexity.indicators.length >= 2) {
    return true;
  }

  // Check for specific patterns that suggest planning
  const requestLower = request.toLowerCase();

  // Multiple files/components mentioned
  const fileExtensionPattern = /\.(js|ts|jsx|tsx|py|java|cpp|c|cs|php|rb|go|rs|json|yaml|yml|md|html|css)/gi;
  const fileMatches = Array.from(requestLower.matchAll(fileExtensionPattern));
  if (fileMatches.length >= 2) {
    return true;
  }

  // Multiple components/services/modules
  const componentPattern = /\b(component|service|module|feature|endpoint|api)\b/gi;
  const componentMatches = Array.from(requestLower.matchAll(componentPattern));
  if (componentMatches.length >= 3) {
    return true;
  }

  // Detect component/service names (capitalized words followed by component/service keywords)
  // Pattern: "User component", "AuthService", "LoginForm", etc.
  const componentNamePattern = /\b([A-Z][a-zA-Z]+)\s+(component|service|module|form|view|controller|handler)\b/gi;
  const componentNameMatches = Array.from(request.matchAll(componentNamePattern));
  // Also detect PascalCase names that might be components (e.g., "AuthService", "LoginForm")
  const pascalCasePattern = /\b([A-Z][a-zA-Z]+(?:Service|Form|Component|Module|View|Controller|Handler))\b/g;
  const pascalCaseMatches = Array.from(request.matchAll(pascalCasePattern));
  const totalComponentNames = componentNameMatches.length + pascalCaseMatches.length;
  if (totalComponentNames >= 2) {
    return true;
  }

  // Architecture/system design keywords
  const architectureKeywords = [
    'architecture',
    'microservices',
    'distributed',
    'scalable',
    'system design',
    'system architecture',
  ];
  // Check if any architecture keyword appears (including "scalable system")
  if (architectureKeywords.some((keyword) => requestLower.includes(keyword))) {
    return true;
  }
  // Also check for "scalable" + "system" combination
  if (requestLower.includes('scalable') && requestLower.includes('system')) {
    return true;
  }
  
  // "Refactor entire" should suggest planning
  if (requestLower.includes('refactor entire') || (requestLower.includes('refactor') && requestLower.includes('entire'))) {
    return true;
  }

  // Multi-step workflow keywords
  const workflowKeywords = ['set up', 'implement', 'add', 'create', 'build', 'deploy', 'test'];
  const workflowCount = workflowKeywords.filter((keyword) => requestLower.includes(keyword)).length;
  if (workflowCount >= 3) {
    return true;
  }

  // Sequential steps indicated
  const sequentialKeywords = ['then', 'after', 'next', 'finally', 'followed by'];
  if (sequentialKeywords.some((keyword) => requestLower.includes(keyword))) {
    return true;
  }

  // Very long requests (likely complex)
  if (request.length > 200) {
    return true;
  }

  return false;
}
