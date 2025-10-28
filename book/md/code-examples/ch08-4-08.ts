/**
 * Classifies user input into intents using AI
 */
export class IntentClassifier {
  private aiProvider: AIProvider;
  private intents: Map<string, Intent> = new Map();
  private cache: LRUCache<string, IntentMatch[]>;

  constructor(aiProvider: AIProvider) {
    this.aiProvider = aiProvider;
    this.cache = new LRUCache({ max: 1000, ttl: 1000 * 60 * 60 }); // 1 hour
  }

  /**
   * Register an intent
   */
  registerIntent(intent: Intent): void {
    this.intents.set(intent.name, intent);
  }

  /**
   * Classify user input into intent(s)
   */
  async classify(
    input: string,
    context: CommandContext
  ): Promise<IntentMatch[]> {
    // Check cache
    const cached = this.cache.get(input);
    if (cached) {
      return cached;
    }

    // Build classification prompt
    const prompt = this.buildClassificationPrompt(input, context);

    // Get classification from AI
    const response = await this.aiProvider.complete({
      messages: [
        {
          role: MessageRole.SYSTEM,
          content: this.getSystemPrompt()
        },
        {
          role: MessageRole.USER,
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent classification
      maxTokens: 1000
    });

    // Parse response
    const matches = this.parseClassificationResponse(response.content);

    // Cache result
    this.cache.set(input, matches);

    return matches;
  }

  /**
   * Build classification prompt
   */
  private buildClassificationPrompt(
    input: string,
    context: CommandContext
  ): string {
    const intentDescriptions = Array.from(this.intents.values())
      .map(intent => {
        return `
**${intent.name}**
Description: ${intent.description}
Examples:
${intent.examples.map(ex => `  - "${ex}"`).join('\n')}
Required params: ${intent.requiredParams.join(', ') || 'none'}
Optional params: ${intent.optionalParams.join(', ') || 'none'}
        `.trim();
      })
      .join('\n\n');

    return `
Classify the following user input into one or more intents and extract parameters.

# User Input
"${input}"

# Available Intents
${intentDescriptions}

# Context
Working directory: ${context.workingDirectory}
${context.gitStatus ? `Git status: ${context.gitStatus.branch}, ${context.gitStatus.files.length} changed files` : ''}
${context.conversationHistory.length > 0 ? `Recent conversation: ${this.summarizeConversation(context.conversationHistory)}` : ''}

# Task
1. Identify which intent(s) match the user input (can be multiple for compound requests)
2. For each intent, extract parameter values mentioned in the input
3. Identify any required parameters that are missing
4. Calculate confidence score (0-1) for each match

# Output Format
Return a JSON array of matches:

\`\`\`json
[
  {
    "intent": "INTENT_NAME",
    "confidence": 0.95,
    "extractedParams": {
      "param1": "value1",
      "param2": "value2"
    },
    "missingParams": ["param3"]
  }
]
\`\`\`

Only include matches with confidence >= 0.7. Order by confidence descending.
    `.trim();
  }

  /**
   * Get system prompt for classification
   */
  private getSystemPrompt(): string {
    return `
You are an intent classification system for a natural language CLI tool.
Your job is to understand what the user wants to do and map it to registered intents.

Key principles:
- Be generous with interpretation (users may be vague)
- Extract as many parameters as possible from the input
- Handle compound requests (multiple intents in one input)
- Use context to disambiguate
- Return high confidence only when you're certain
- For ambiguous cases, return multiple possibilities

You must ALWAYS respond with valid JSON only, no other text.
    `.trim();
  }

  /**
   * Parse AI classification response
   */
  private parseClassificationResponse(response: string): IntentMatch[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      const json = jsonMatch ? jsonMatch[1] : response;

      const parsed = JSON.parse(json);

      // Validate and convert to IntentMatch[]
      const matches: IntentMatch[] = [];

      for (const item of parsed) {
        const intent = this.intents.get(item.intent);

        if (!intent) {
          continue; // Skip unknown intents
        }

        matches.push({
          intent,
          confidence: item.confidence,
          extractedParams: item.extractedParams || {},
          missingParams: item.missingParams || []
        });
      }

      return matches;

    } catch (error) {
      throw new Error(`Failed to parse classification response: ${error.message}`);
    }
  }

  /**
   * Summarize conversation history for context
   */
  private summarizeConversation(messages: Message[]): string {
    // Take last 3 messages
    const recent = messages.slice(-3);

    return recent
      .map(msg => `${msg.role}: ${msg.content.substring(0, 100)}`)
      .join('; ');
  }
}