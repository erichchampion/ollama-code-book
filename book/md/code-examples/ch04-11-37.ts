/**
 * Manages approval workflows for destructive operations
 */
export class ApprovalManager {
  private logger: Logger;
  private autoApprove: Set<string>;
  private alwaysDeny: Set<string>;

  constructor(logger: Logger) {
    this.logger = logger;
    this.autoApprove = new Set();
    this.alwaysDeny = new Set();
  }

  /**
   * Request approval for a tool call
   */
  async requestApproval(
    call: ToolCall,
    tool: Tool,
    promptCallback: ApprovalPromptCallback
  ): Promise<ApprovalResult> {
    // Check auto-approve list
    if (this.autoApprove.has(tool.name)) {
      this.logger.debug(`Auto-approved: ${tool.name}`);
      return {
        approved: true,
        remember: true
      };
    }

    // Check always-deny list
    if (this.alwaysDeny.has(tool.name)) {
      this.logger.debug(`Auto-denied: ${tool.name}`);
      return {
        approved: false,
        remember: true
      };
    }

    // Prompt user
    const result = await promptCallback({
      toolName: tool.name,
      description: tool.description,
      parameters: call.parameters,
      impact: this.assessImpact(tool, call)
    });

    // Remember choice if requested
    if (result.remember) {
      if (result.approved) {
        this.autoApprove.add(tool.name);
      } else {
        this.alwaysDeny.add(tool.name);
      }
    }

    return result;
  }

  /**
   * Assess impact of tool execution
   */
  private assessImpact(tool: Tool, call: ToolCall): ImpactAssessment {
    const impact: ImpactAssessment = {
      level: 'low',
      description: '',
      warnings: []
    };

    // Assess based on tool type
    if (tool.name.includes('delete')) {
      impact.level = 'high';
      impact.description = 'This operation will delete data permanently';
      impact.warnings.push('⚠️  Cannot be undone');
    } else if (tool.name.includes('write') || tool.name.includes('commit')) {
      impact.level = 'medium';
      impact.description = 'This operation will modify files';
      if (call.parameters.path) {
        impact.warnings.push(`📝 Will modify: ${call.parameters.path}`);
      }
    } else if (tool.name.includes('push') || tool.name.includes('deploy')) {
      impact.level = 'high';
      impact.description = 'This operation will affect remote systems';
      impact.warnings.push('🌐 Remote operation - affects others');
    }

    return impact;
  }

  /**
   * Clear approval memory
   */
  clearMemory(): void {
    this.autoApprove.clear();
    this.alwaysDeny.clear();
    this.logger.debug('Cleared approval memory');
  }

  /**
   * Get approval statistics
   */
  getStats(): ApprovalStats {
    return {
      autoApproveCount: this.autoApprove.size,
      alwaysDenyCount: this.alwaysDeny.size,
      autoApproveTools: Array.from(this.autoApprove),
      alwaysDenyTools: Array.from(this.alwaysDeny)
    };
  }
}

interface ApprovalPromptCallback {
  (prompt: ApprovalPrompt): Promise<ApprovalResult>;
}

interface ApprovalPrompt {
  toolName: string;
  description: string;
  parameters: any;
  impact: ImpactAssessment;
}

interface ApprovalResult {
  approved: boolean;
  remember?: boolean; // Remember this choice
}

interface ImpactAssessment {
  level: 'low' | 'medium' | 'high';
  description: string;
  warnings: string[];
}

interface ApprovalStats {
  autoApproveCount: number;
  alwaysDenyCount: number;
  autoApproveTools: string[];
  alwaysDenyTools: string[];
}