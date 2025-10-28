// Benchmark: Time until user sees first content

// Non-streaming
console.time('First content (non-streaming)');
const response = await generateCode(prompt);
console.log(response[0]); // First character
console.timeEnd('First content (non-streaming)');
// Output: First content (non-streaming): 8743ms

// Streaming
console.time('First content (streaming)');
const stream = generateCodeStreaming(prompt);
const firstChunk = await stream.next();
console.log(firstChunk.value);
console.timeEnd('First content (streaming)');
// Output: First content (streaming): 142ms

// Improvement: 8743ms → 142ms (61x faster first content!)