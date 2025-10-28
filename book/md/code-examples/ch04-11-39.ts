// Using approval system with orchestrator

const approvalManager = new ApprovalManager(logger);
const approvalUI = new TerminalApprovalUI();

const result = await orchestrator.execute(toolCalls, {
  parallelExecution: true,
  enableCache: true,
  approvalCallback: async (call, tool) => {
    // Use approval manager
    const result = await approvalManager.requestApproval(
      call,
      tool,
      async (prompt) => await approvalUI.prompt(prompt)
    );

    return result.approved;
  }
});

// Cleanup
approvalUI.close();

// Show approval stats
const stats = approvalManager.getStats();
console.log(`\nApproval Statistics:`);
console.log(`  Auto-approve: ${stats.autoApproveTools.join(', ')}`);
console.log(`  Always deny: ${stats.alwaysDenyTools.join(', ')}`);