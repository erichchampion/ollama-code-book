// ✅ Type safety catches bugs at compile time
interface AIProvider {
  name: string;
  complete(prompt: string): Promise<Response>;
}

// This will cause a compile error - typo in method name
const provider: AIProvider = {
  name: 'ollama',
  complet: async (prompt) => { ... }  // ✗ Error: Property 'complete' is missing
};