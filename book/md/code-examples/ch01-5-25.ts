import { Command } from 'commander';

const program = new Command();

program
  .name('ollama-code')
  .description('AI coding assistant')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate code from description')
  .argument('<description>', 'What to generate')
  .option('-o, --output <file>', 'Output file')
  .action(async (description, options) => {
    await generateCode(description, options);
  });

program.parse();