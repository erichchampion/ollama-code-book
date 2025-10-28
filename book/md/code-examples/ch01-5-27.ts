import ora from 'ora';

const spinner = ora('Analyzing codebase...').start();

try {
  await analyzeProject();
  spinner.succeed('Analysis complete!');
} catch (error) {
  spinner.fail('Analysis failed');
}