// src/ai/conversation-manager.ts
export class ConversationManager {
  async addTurn(
    userInput: string,
    intent: UserIntent,
    response: string,
    actions: ActionTaken[]
  ): Promise<ConversationTurn>;

  getRecentHistory(maxTurns: number): ConversationTurn[];
  getRelevantHistory(currentIntent: UserIntent): ConversationTurn[];

  async persistConversation(): Promise<void>;
  async summarizeConversation(): Promise<ConversationSummary>;
}