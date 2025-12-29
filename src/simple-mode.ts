
import { OllamaClient } from './ai/ollama-client.js';
import { ensureOllamaServerRunning } from './utils/ollama-server.js';
import { normalizeError } from './utils/error-utils.js';
import { DEFAULT_MODEL } from './constants.js';

/**
 * Run simple mode (basic commands only)
 * 
 * @param command - The command to run
 * @param args - Arguments for the command
 */
export async function runSimpleMode(command: string, args: string[]): Promise<void> {
    try {
        // Ensure Ollama server is running before creating client
        console.log('Ensuring Ollama server is running...');
        await ensureOllamaServerRunning();

        // Use the client
        const client = new OllamaClient();

        switch (command) {
            case 'ask':
                if (args.length === 0) {
                    console.error('Please provide a question to ask.');
                    console.log('Example: ollama-code ask "How do I implement a binary search?"');
                    process.exit(1);
                }

                const question = args.join(' ');
                console.log('Asking Ollama...\n');

                // Create abort controller for cancellation
                const abortController = new AbortController();

                // Handle Ctrl+C gracefully
                const handleInterrupt = () => {
                    abortController.abort();
                    console.log('\n\nRequest cancelled by user.');
                };
                process.on('SIGINT', handleInterrupt);

                let responseText = '';
                try {
                    await client.completeStream(question, { model: DEFAULT_MODEL }, (event) => {
                        if (event.message?.content) {
                            process.stdout.write(event.message.content);
                            responseText += event.message.content;
                        }
                    }, abortController.signal);
                } finally {
                    // Clean up interrupt handler
                    process.off('SIGINT', handleInterrupt);
                }

                // Add newline at the end
                if (responseText) {
                    console.log('\n');
                } else {
                    console.log('No response received');
                }
                break;

            case 'list-models':
                console.log('Fetching available models...\n');

                const models = await client.listModels();

                if (models.length === 0) {
                    console.log('No models found. Use "pull-model <name>" to download a model.');
                    return;
                }

                console.log('Available models:');
                console.log('================');

                for (const model of models) {
                    const sizeInGB = (model.size / (1024 * 1024 * 1024)).toFixed(2);
                    const modifiedDate = new Date(model.modified_at).toLocaleDateString();

                    console.log(`📦 ${model.name}`);
                    console.log(`   Size: ${sizeInGB} GB`);
                    console.log(`   Modified: ${modifiedDate}`);
                    console.log('');
                }

                console.log(`Total: ${models.length} model(s) available`);
                break;

            case 'pull-model':
                if (args.length === 0) {
                    console.error('Please provide a model name to download.');
                    console.log('Example: ollama-code pull-model llama3.2');
                    process.exit(1);
                }

                const modelName = args[0];
                console.log(`Downloading model: ${modelName}`);
                console.log('This may take several minutes depending on model size...\n');

                await client.pullModel(modelName);

                console.log(`✅ Successfully downloaded model: ${modelName}`);
                console.log('You can now use this model with the ask command.');
                break;

            default:
                console.error(`Unknown command: ${command}`);
                console.log('Simple mode supports: ask, list-models, pull-model');
                console.log('Use --mode advanced for more commands.');
                process.exit(1);
        }
    } catch (error) {
        console.error('Error:', normalizeError(error).message);

        if (error instanceof Error && error.message.includes('fetch')) {
            console.log('\nMake sure Ollama is running:');
            console.log('  1. Install Ollama: https://ollama.ai');
            console.log('  2. Start the server: ollama serve');
            console.log('  3. Try again');
        }

        process.exit(1);
    }
}
