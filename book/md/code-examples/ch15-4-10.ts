// src/index.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { DevOpsAssistant } from './assistant';

const program = new Command();

program
  .name('devops-ai')
  .description('AI-powered DevOps assistant')
  .version('1.0.0');

// Interactive mode
program
  .command('chat')
  .description('Start interactive chat')
  .action(async () => {
    const assistant = new DevOpsAssistant({
      models: {
        primary: 'codellama:34b',
        fallback: ['gpt-4-turbo']
      },
      integrations: {
        kubectl: true,
        helm: true,
        terraform: true
      }
    });

    console.log(chalk.blue('DevOps AI Assistant - Type "exit" to quit\n'));

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = () => {
      rl.question(chalk.green('You: '), async (input: string) => {
        if (input.toLowerCase() === 'exit') {
          rl.close();
          return;
        }

        try {
          const response = await assistant.processRequest(input);
          console.log(chalk.yellow(`\nAssistant: ${response}\n`));
        } catch (error) {
          console.error(chalk.red(`Error: ${error.message}`));
        }

        askQuestion();
      });
    };

    askQuestion();
  });

// Generate Kubernetes deployment
program
  .command('k8s:deployment')
  .description('Generate Kubernetes Deployment')
  .requiredOption('-n, --name <name>', 'Application name')
  .requiredOption('-i, --image <image>', 'Docker image')
  .option('-r, --replicas <replicas>', 'Number of replicas', '3')
  .option('-p, --port <port>', 'Container port', '8080')
  .action(async (options) => {
    const assistant = new DevOpsAssistant({
      models: { primary: 'codellama:34b' }
    });

    try {
      const yaml = await assistant.generateKubernetesDeployment(
        options.name,
        options.image,
        {
          replicas: parseInt(options.replicas),
          port: parseInt(options.port)
        }
      );

      console.log(chalk.green('Generated Deployment:\n'));
      console.log(yaml);
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Validate Kubernetes config
program
  .command('k8s:validate')
  .description('Validate Kubernetes configuration')
  .argument('<file>', 'YAML file to validate')
  .action(async (file) => {
    const fs = require('fs');
    const assistant = new DevOpsAssistant({
      models: { primary: 'codellama:34b' }
    });

    try {
      const yamlContent = fs.readFileSync(file, 'utf-8');
      const result = await assistant.validateKubernetesConfig(yamlContent);

      if (result.valid) {
        console.log(chalk.green('✓ Configuration is valid'));
      } else {
        console.log(chalk.red('✗ Configuration has errors:'));
        result.errors.forEach((error) => {
          console.log(chalk.red(`  - ${error}`));
        });
      }

      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\nWarnings:'));
        result.warnings.forEach((warning) => {
          console.log(chalk.yellow(`  - ${warning}`));
        });
      }

      if (result.suggestions.length > 0) {
        console.log(chalk.blue('\nSuggestions:'));
        result.suggestions.forEach((suggestion) => {
          console.log(chalk.blue(`  - ${suggestion}`));
        });
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();