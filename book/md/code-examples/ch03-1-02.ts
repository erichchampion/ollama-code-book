// ConversationManager needs AI completion
const conversationManager = new ConversationManager(router);

// ToolOrchestrator also needs AI completion
const toolOrchestrator = new ToolOrchestrator(router);

// VCSIntelligence needs both
const vcsIntelligence = new VCSIntelligence(conversationManager, toolOrchestrator);

// Who creates what? In what order? 🤔