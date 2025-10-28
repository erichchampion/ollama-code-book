// Bad: Using GPT-4 for simple tasks
const commitMsg = await openai.complete(diff, {
  model: 'gpt-4' // Expensive overkill
});