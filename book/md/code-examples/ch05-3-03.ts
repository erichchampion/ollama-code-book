async function generateCode(prompt: string): Promise<string> {
  const response = await aiProvider.chat({
    messages: [{ role: 'user', content: prompt }]
  });

  // User waits for entire response
  return response.content;
}

// Usage
console.log('Generating code...');
const code = await generateCode('Create a REST API for users');
console.log(code); // All at once after 10 seconds