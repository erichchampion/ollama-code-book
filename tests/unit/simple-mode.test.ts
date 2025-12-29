
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Define mocks
const mockOllamaClient = {
    completeStream: jest.fn(),
    complete: jest.fn(),
    listModels: jest.fn(),
    pullModel: jest.fn(),
};

const mockEnsureServer = jest.fn().mockResolvedValue(undefined);

// Apply mocks before imports
jest.unstable_mockModule('../../src/ai/ollama-client.js', () => ({
    OllamaClient: jest.fn(() => mockOllamaClient)
}));

jest.unstable_mockModule('../../src/utils/ollama-server.js', () => ({
    ensureOllamaServerRunning: mockEnsureServer
}));

// Mock constants if needed, or rely on real ones if they are simple values
// simple-mode.ts imports DEFAULT_MODEL from './constants.js'. 
// We should probably mock it to avoid import issues or side effects.
jest.unstable_mockModule('../../src/constants.js', () => ({
    DEFAULT_MODEL: 'mock-model'
}));

// Import the module under test dynamically
const { runSimpleMode } = await import('../../src/simple-mode.js');

describe('Simple Mode', () => {
    let consoleLogSpy;
    let consoleErrorSpy;
    let processExitSpy;
    let processStdoutWriteSpy;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock console and process
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { });
        processStdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should throw error/exit for unknown command', async () => {
        await runSimpleMode('unknown-command', []);
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    describe('ask command', () => {
        test('should fail if no question provided', async () => {
            await runSimpleMode('ask', []);
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Please provide a question'));
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        test('should call ensureOllamaServerRunning', async () => {
            // Mock completeStream to simulate event
            mockOllamaClient.completeStream.mockImplementation(async (q, opts, cb) => {
                cb({ message: { content: 'Answer' } });
            });

            await runSimpleMode('ask', ['question']);

            expect(mockEnsureServer).toHaveBeenCalled();
        });

        test('should call client.completeStream with correct args', async () => {
            mockOllamaClient.completeStream.mockImplementation(async (q, opts, cb) => {
                cb({ message: { content: 'Answer' } });
            });

            await runSimpleMode('ask', ['test', 'question']);

            expect(mockOllamaClient.completeStream).toHaveBeenCalledWith(
                'test question',
                { model: 'mock-model' },
                expect.any(Function),
                expect.anything()
            );
        });
    });

    describe('list-models command', () => {
        test('should list models', async () => {
            mockOllamaClient.listModels.mockResolvedValue([
                { name: 'model1', size: 1024 * 1024 * 1024, modified_at: new Date() }
            ]);

            await runSimpleMode('list-models', []);

            expect(mockOllamaClient.listModels).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('model1'));
        });

        test('should handle empty model list', async () => {
            mockOllamaClient.listModels.mockResolvedValue([]);

            await runSimpleMode('list-models', []);

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No models found'));
        });
    });

    describe('pull-model command', () => {
        test('should fail if no model name provided', async () => {
            await runSimpleMode('pull-model', []);
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Please provide a model name'));
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        test('should call pullModel with correct model name', async () => {
            // Ensure pullModel resolves immediately
            mockOllamaClient.pullModel.mockResolvedValue(undefined);

            await runSimpleMode('pull-model', ['llama3']);
            expect(mockOllamaClient.pullModel).toHaveBeenCalledWith('llama3');
        });
    });
});
