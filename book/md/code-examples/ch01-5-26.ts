import inquirer from 'inquirer';

const answers = await inquirer.prompt([
  {
    type: 'confirm',
    name: 'approve',
    message: 'Execute this tool call?',
    default: false
  },
  {
    type: 'list',
    name: 'provider',
    message: 'Select AI provider:',
    choices: ['Ollama', 'OpenAI', 'Anthropic', 'Google']
  }
]);