async function* generateCodeStreaming(prompt: string): AsyncGenerator<string> {
  const stream = await aiProvider.streamChat({
    messages: [{ role: 'user', content: prompt }]
  });

  for await (const chunk of stream) {
    yield chunk.content;
  }
}

// Usage
console.log('Generating code...');
for await (const chunk of generateCodeStreaming('Create a REST API')) {
  process.stdout.write(chunk); // Show tokens as they arrive
}