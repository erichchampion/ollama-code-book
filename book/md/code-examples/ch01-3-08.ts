// src/commands/types.ts
export interface CommandDef {
  name: string;
  description: string;
  arguments: CommandArgDef[];
  options: CommandOption[];
  handler: CommandHandler;
}

export type CommandHandler = (
  args: ParsedArgs,
  context: CommandContext
) => Promise<void>;