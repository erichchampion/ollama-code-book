// Bad: Always using GPT-4
const response = await openai.complete(prompt, { model: 'gpt-4' });