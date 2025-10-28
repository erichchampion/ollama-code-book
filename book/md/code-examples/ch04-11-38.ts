/**
 * Terminal-based approval UI
 */
export class TerminalApprovalUI {
  private readline: readline.Interface;

  constructor() {
    this.readline = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Prompt user for approval
   */
  async prompt(promptData: ApprovalPrompt): Promise<ApprovalResult> {
    // Display tool information
    console.log('\n' + '='.repeat(60));
    console.log(`🔧 Tool: ${promptData.toolName}`);
    console.log(`📄 ${promptData.description}`);
    console.log('='.repeat(60));

    // Display parameters
    console.log('\n📋 Parameters:');
    console.log(JSON.stringify(promptData.parameters, null, 2));

    // Display impact assessment
    const impactIcon = {
      low: '✅',
      medium: '⚠️',
      high: '🔴'
    }[promptData.impact.level];

    console.log(`\n${impactIcon} Impact: ${promptData.impact.level.toUpperCase()}`);
    console.log(`   ${promptData.impact.description}`);

    if (promptData.impact.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      for (const warning of promptData.impact.warnings) {
        console.log(`   ${warning}`);
      }
    }

    // Prompt for approval
    console.log('\nOptions:');
    console.log('  y  - Approve');
    console.log('  n  - Deny');
    console.log('  ya - Approve and remember (auto-approve this tool)');
    console.log('  na - Deny and remember (always deny this tool)');

    const answer = await this.question('\nYour choice: ');

    const approved = answer.toLowerCase().startsWith('y');
    const remember = answer.toLowerCase().endsWith('a');

    return { approved, remember };
  }

  /**
   * Prompt user with a question
   */
  private question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.readline.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  }

  /**
   * Close the UI
   */
  close(): void {
    this.readline.close();
  }
}