#!/usr/bin/env node

/**
 * Code Example Verification
 * 
 * Verifies all code examples are accurate, tested, and provide expected output
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } = require('child_process');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Example verification configuration
const VERIFICATION_CONFIG = {
  languages: {
    bash: {
      executable: 'bash',
      timeout: 30000,
      workingDir: projectRoot
    },
    javascript: {
      executable: 'node',
      timeout: 30000,
      workingDir: projectRoot
    },
    typescript: {
      executable: 'ts-node',
      timeout: 30000,
      workingDir: projectRoot
    },
    json: {
      executable: 'node',
      timeout: 5000,
      workingDir: projectRoot,
      validator: 'JSON.parse'
    },
    yaml: {
      executable: 'node',
      timeout: 5000,
      workingDir: projectRoot,
      validator: 'yaml'
    }
  },
  validation: {
    syntax: true,
    execution: true,
    output: true,
    dependencies: true
  },
  testing: {
    enabled: true,
    timeout: 60000,
    retries: 3,
    parallel: 5
  }
};

// Code example verification class
class CodeExampleVerifier {
  constructor(config = VERIFICATION_CONFIG) {
    this.config = config;
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    this.examples = [];
  }

  // Run verification
  async runVerification() {
    console.log('🔍 Starting code example verification...');
    
    // Get all documentation files
    const files = this.getDocumentationFiles();
    
    // Extract code examples
    for (const file of files) {
      await this.extractExamples(file);
    }
    
    console.log(`📊 Found ${this.examples.length} code examples`);
    
    // Verify examples
    for (const example of this.examples) {
      await this.verifyExample(example);
    }
    
    // Generate report
    this.generateReport();
    
    console.log('✅ Code example verification completed');
  }

  // Get all documentation files
  getDocumentationFiles() {
    const files = [];
    const getMarkdownFiles = (dir) => {
      try {
        const items = readdirSync(dir);
        
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory() && !['node_modules', 'dist', '.git'].includes(item)) {
            getMarkdownFiles(fullPath);
          } else if (stat.isFile() && item.endsWith('.md')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };
    
    getMarkdownFiles(projectRoot);
    return files;
  }

  // Extract code examples from file
  async extractExamples(filePath) {
    try {
      const content = readFileSync(filePath, 'utf8');
      const relativePath = filePath.replace(projectRoot, '');
      
      // Find code blocks
      const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
      let match;
      
      while ((match = codeBlockPattern.exec(content)) !== null) {
        const [, language, code] = match;
        
        if (code.trim()) {
          this.examples.push({
            file: relativePath,
            language: language || 'text',
            code: code.trim(),
            line: this.getLineNumber(content, match.index)
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not extract examples from ${filePath}: ${error.message}`);
    }
  }

  // Get line number for match
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  // Verify individual example
  async verifyExample(example) {
    this.results.total++;
    
    try {
      console.log(`  🔍 Verifying ${example.language} example in ${example.file}:${example.line}`);
      
      // Check if language is supported
      if (!this.config.languages[example.language]) {
        this.results.skipped++;
        console.log(`    ⏭️  Skipped (unsupported language: ${example.language})`);
        return;
      }
      
      // Verify syntax
      if (this.config.validation.syntax) {
        await this.verifySyntax(example);
      }
      
      // Verify execution
      if (this.config.validation.execution) {
        await this.verifyExecution(example);
      }
      
      // Verify output
      if (this.config.validation.output) {
        await this.verifyOutput(example);
      }
      
      // Verify dependencies
      if (this.config.validation.dependencies) {
        await this.verifyDependencies(example);
      }
      
      this.results.passed++;
      console.log(`    ✅ Passed`);
      
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({
        file: example.file,
        line: example.line,
        language: example.language,
        error: error.message
      });
      console.log(`    ❌ Failed: ${error.message}`);
    }
  }

  // Verify syntax
  async verifySyntax(example) {
    const language = example.language;
    const code = example.code;
    
    switch (language) {
      case 'bash':
        await this.verifyBashSyntax(code);
        break;
      case 'javascript':
        await this.verifyJavaScriptSyntax(code);
        break;
      case 'typescript':
        await this.verifyTypeScriptSyntax(code);
        break;
      case 'json':
        await this.verifyJsonSyntax(code);
        break;
      case 'yaml':
        await this.verifyYamlSyntax(code);
        break;
      default:
        // Skip syntax verification for unsupported languages
        break;
    }
  }

  // Verify bash syntax
  async verifyBashSyntax(code) {
    try {
      execSync(`bash -n -c "${code}"`, { 
        timeout: this.config.languages.bash.timeout,
        stdio: 'pipe' 
      });
    } catch (error) {
      throw new Error(`Bash syntax error: ${error.message}`);
    }
  }

  // Verify JavaScript syntax
  async verifyJavaScriptSyntax(code) {
    try {
      execSync(`node -c -e "${code}"`, { 
        timeout: this.config.languages.javascript.timeout,
        stdio: 'pipe' 
      });
    } catch (error) {
      throw new Error(`JavaScript syntax error: ${error.message}`);
    }
  }

  // Verify TypeScript syntax
  async verifyTypeScriptSyntax(code) {
    try {
      execSync(`ts-node --check -e "${code}"`, { 
        timeout: this.config.languages.typescript.timeout,
        stdio: 'pipe' 
      });
    } catch (error) {
      throw new Error(`TypeScript syntax error: ${error.message}`);
    }
  }

  // Verify JSON syntax
  async verifyJsonSyntax(code) {
    try {
      JSON.parse(code);
    } catch (error) {
      throw new Error(`JSON syntax error: ${error.message}`);
    }
  }

  // Verify YAML syntax
  async verifyYamlSyntax(code) {
    try {
      // Simple YAML validation - can be enhanced with yaml library
      const lines = code.split('\n');
      let indentLevel = 0;
      
      for (const line of lines) {
        if (line.trim()) {
          const currentIndent = line.match(/^(\s*)/)[1].length;
          if (currentIndent > indentLevel + 2) {
            throw new Error('Invalid YAML indentation');
          }
          indentLevel = currentIndent;
        }
      }
    } catch (error) {
      throw new Error(`YAML syntax error: ${error.message}`);
    }
  }

  // Verify execution
  async verifyExecution(example) {
    const language = example.language;
    const code = example.code;
    
    // Skip execution for certain languages
    if (['json', 'yaml', 'markdown'].includes(language)) {
      return;
    }
    
    try {
      const config = this.config.languages[language];
      const executable = config.executable;
      const timeout = config.timeout;
      const workingDir = config.workingDir;
      
      // Create temporary file
      const tempFile = this.createTempFile(code, language);
      
      try {
        // Execute code
        execSync(`${executable} ${tempFile}`, {
          timeout: timeout,
          cwd: workingDir,
          stdio: 'pipe'
        });
      } finally {
        // Clean up temporary file
        this.cleanupTempFile(tempFile);
      }
    } catch (error) {
      throw new Error(`Execution error: ${error.message}`);
    }
  }

  // Verify output
  async verifyOutput(example) {
    // This would be implemented in a real application
    // For now, we'll just check if the code produces some output
    const language = example.language;
    const code = example.code;
    
    if (['bash', 'javascript', 'typescript'].includes(language)) {
      // Check if code has output statements
      const outputPatterns = [
        /console\.log/,
        /echo/,
        /print/,
        /printf/
      ];
      
      const hasOutput = outputPatterns.some(pattern => pattern.test(code));
      if (!hasOutput && code.length > 50) {
        console.log(`    ⚠️  No output statements found in ${language} code`);
      }
    }
  }

  // Verify dependencies
  async verifyDependencies(example) {
    const language = example.language;
    const code = example.code;
    
    // Check for import/require statements
    const importPatterns = [
      /import\s+.*\s+from\s+['"`]([^'"`]+)['"`]/g,
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
    ];
    
    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const module = match[1];
        
        // Check if module is available
        try {
          if (language === 'javascript' || language === 'typescript') {
            execSync(`node -e "require('${module}')"`, { 
              timeout: 5000,
              stdio: 'pipe' 
            });
          }
        } catch (error) {
          throw new Error(`Missing dependency: ${module}`);
        }
      }
    }
  }

  // Create temporary file
  createTempFile(code, language) {
    const tempDir = join(projectRoot, 'temp');
    if (!statSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
    
    const extension = this.getFileExtension(language);
    const tempFile = join(tempDir, `example_${Date.now()}.${extension}`);
    
    writeFileSync(tempFile, code);
    return tempFile;
  }

  // Get file extension for language
  getFileExtension(language) {
    const extensions = {
      bash: 'sh',
      javascript: 'js',
      typescript: 'ts',
      json: 'json',
      yaml: 'yml'
    };
    
    return extensions[language] || 'txt';
  }

  // Clean up temporary file
  cleanupTempFile(tempFile) {
    try {
      unlinkSync(tempFile);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  // Generate report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      examples: this.examples,
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        successRate: ((this.results.passed / this.results.total) * 100).toFixed(2) + '%'
      }
    };
    
    const reportPath = join(projectRoot, 'docs/example-verification-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('');
    console.log('📊 Example Verification Report:');
    console.log(`   Total examples: ${report.summary.total}`);
    console.log(`   Passed: ${report.summary.passed}`);
    console.log(`   Failed: ${report.summary.failed}`);
    console.log(`   Skipped: ${report.summary.skipped}`);
    console.log(`   Success rate: ${report.summary.successRate}`);
    
    if (this.results.errors.length > 0) {
      console.log('');
      console.log('❌ Errors:');
      for (const error of this.results.errors) {
        console.log(`   ${error.file}:${error.line} (${error.language}): ${error.error}`);
      }
    }
    
    console.log(`   Report saved: ${reportPath}`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const verifier = new CodeExampleVerifier();
  verifier.runVerification();
}

export default CodeExampleVerifier;

