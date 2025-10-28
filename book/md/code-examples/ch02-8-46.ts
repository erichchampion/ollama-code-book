// Good: Appropriate model selection
const complexity = analyzeComplexity(task);

let model;
if (complexity === 'simple') {
  model = 'gpt-3.5-turbo'; // Fast, cheap
} else if (complexity === 'medium') {
  model = 'gpt-4-turbo'; // Balanced
} else {
  model = 'gpt-4'; // Quality for complex tasks
}