/**
 * Handles streaming responses for lower perceived latency
 */
export class StreamingResponseHandler {
  async handleStream(
    stream: AsyncIterableIterator<StreamEvent>,
    onToken: (token: string) => void,
    onComplete: (fullResponse: string) => void
  ): Promise<void> {
    let fullResponse = '';
    let firstTokenTime: number | null = null;

    const startTime = performance.now();

    for await (const event of stream) {
      if (event.type === StreamEventType.CONTENT) {
        // Record first token latency
        if (!firstTokenTime) {
          firstTokenTime = performance.now() - startTime;
          console.log(`First token: ${firstTokenTime.toFixed(2)}ms`);
        }

        fullResponse += event.content;
        onToken(event.content);
      } else if (event.type === StreamEventType.DONE) {
        break;
      }
    }

    const totalTime = performance.now() - startTime;

    console.log(`Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`Tokens/second: ${(fullResponse.length / (totalTime / 1000)).toFixed(2)}`);

    onComplete(fullResponse);
  }
}

/**
 * Example usage
 */
async function streamExample() {
  const provider = new AnthropicProvider({ apiKey: '...' });

  const stream = provider.stream({
    messages: [{
      role: MessageRole.USER,
      content: 'Write a long essay about AI'
    }]
  });

  const handler = new StreamingResponseHandler();

  await handler.handleStream(
    stream,
    (token) => {
      // Display token immediately
      process.stdout.write(token);
    },
    (fullResponse) => {
      console.log('\n\nComplete!');
      console.log(`Total length: ${fullResponse.length} characters`);
    }
  );
}