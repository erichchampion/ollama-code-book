// Workflow: format -> commit -> push
// If push fails, rollback commit (reset HEAD^)

interface RollbackableCommand extends RoutableCommand {
  rollback?(
    params: Record<string, any>,
    context: CommandContext,
    result: CommandResult
  ): Promise<void>;
}