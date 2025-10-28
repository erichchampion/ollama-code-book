interface ApprovalPolicy {
  // Define when approval is needed
  requiresApproval(tool: Tool, params: any): boolean;

  // Define approval level (user, admin, auto)
  getApprovalLevel(tool: Tool, params: any): ApprovalLevel;

  // Auto-approve based on rules
  autoApprove(tool: Tool, params: any): boolean;
}

// TODO: Implement policy for file operations
// TODO: Implement policy for git operations
// TODO: Implement policy for external API calls
// TODO: Add policy composition (AND, OR, NOT)