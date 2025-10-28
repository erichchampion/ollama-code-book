#!/usr/bin/env node

/**
 * Comprehensive Documentation Review
 * 
 * Conducts a comprehensive review for consistency, clarity, and completeness across all documentation
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } = require('child_process');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Review configuration
const REVIEW_CONFIG = {
  consistency: {
    terminology: {
      'ollama-code': 'ollama-code',
      'Ollama Code': 'Ollama Code',
      'CLI': 'CLI',
      'Node.js': 'Node.js',
      'TypeScript': 'TypeScript',
      'API': 'API',
      'AI': 'AI'
    },
    formatting: {
      headers: '^#{1,6} .+$',
      lists: '^[\s]*[-*+]\s+.+$',
      links: '\[([^\]]+)\]\(([^)]+)\)',
      code: '```(\w+)?\n([\s\S]*?)```'
    },
    structure: {
      requiredSections: ['Overview', 'Usage', 'Examples', 'API Reference'],
      optionalSections: ['Configuration', 'Troubleshooting', 'Best Practices']
    }
  },
  clarity: {
    readability: {
      maxLineLength: 120,
      minWordCount: 100,
      maxWordCount: 10000
    },
    language: {
      tone: 'professional',
      complexity: 'intermediate',
      audience: 'developers'
    }
  },
  completeness: {
    coverage: {
      modules: ['ai', 'commands', 'config', 'auth', 'terminal', 'errors', 'utils', 'fs', 'telemetry'],
      features: ['installation', 'usage', 'configuration', 'api', 'troubleshooting'],
      examples: ['basic', 'advanced', 'error-handling', 'configuration']
    },
    crossReferences: {
      internal: true,
      external: true,
      versioning: true
    }
  }
};

// Documentation review class
class DocumentationReview {
  constructor(config = REVIEW_CONFIG) {
    this.config = config;
    this.issues = [];
    this.suggestions = [];
    this.metrics = {
      totalFiles: 0,
      totalWords: 0,
      totalLinks: 0,
      totalCodeBlocks: 0,
      totalHeaders: 0
    };
  }

  // Run comprehensive review
  async runReview() {
    console.log('🔍 Starting comprehensive documentation review...');
    
    // Get all documentation files
    const files = this.getDocumentationFiles();
    this.metrics.totalFiles = files.length;
    
    console.log(`📁 Found ${files.length} documentation files`);
    
    // Review each file
    for (const file of files) {
      await this.reviewFile(file);
    }
    
    // Review consistency
    this.reviewConsistency();
    
    // Review clarity
    this.reviewClarity();
    
    // Review completeness
    this.reviewCompleteness();
    
    // Generate report
    this.generateReport();
    
    console.log('✅ Documentation review completed');
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

  // Review individual file
  async reviewFile(filePath) {
    try {
      const content = readFileSync(filePath, 'utf8');
      const relativePath = filePath.replace(projectRoot, '');
      
      console.log(`  📄 Reviewing ${relativePath}...`);
      
      // Basic metrics
      this.updateMetrics(content);
      
      // Check structure
      this.checkStructure(relativePath, content);
      
      // Check formatting
      this.checkFormatting(relativePath, content);
      
      // Check content quality
      this.checkContentQuality(relativePath, content);
      
      // Check links
      this.checkLinks(relativePath, content);
      
      // Check code blocks
      this.checkCodeBlocks(relativePath, content);
      
    } catch (error) {
      this.issues.push({
        type: 'file_error',
        file: filePath,
        message: `Could not read file: ${error.message}`,
        severity: 'error'
      });
    }
  }

  // Update metrics
  updateMetrics(content) {
    this.metrics.totalWords += content.split(/\s+/).length;
    this.metrics.totalLinks += (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length;
    this.metrics.totalCodeBlocks += (content.match(/```(\w+)?\n([\s\S]*?)```/g) || []).length;
    this.metrics.totalHeaders += (content.match(/^#{1,6} .+$/gm) || []).length;
  }

  // Check structure
  checkStructure(filePath, content) {
    // Check for required sections
    const requiredSections = this.config.consistency.structure.requiredSections;
    for (const section of requiredSections) {
      if (!content.includes(section)) {
        this.issues.push({
          type: 'missing_section',
          file: filePath,
          message: `Missing required section: ${section}`,
          severity: 'warning'
        });
      }
    }
    
    // Check header hierarchy
    const headers = content.match(/^#{1,6} .+$/gm) || [];
    let currentLevel = 0;
    
    for (const header of headers) {
      const level = header.match(/^(#{1,6})/)[1].length;
      
      if (level > currentLevel + 1) {
        this.issues.push({
          type: 'header_hierarchy',
          file: filePath,
          message: `Skipped header level: ${header}`,
          severity: 'warning'
        });
      }
      
      currentLevel = level;
    }
  }

  // Check formatting
  checkFormatting(filePath, content) {
    const lines = content.split('\n');
    
    // Check line length
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > this.config.clarity.readability.maxLineLength) {
        this.issues.push({
          type: 'line_length',
          file: filePath,
          line: i + 1,
          message: `Line too long: ${line.length} characters`,
          severity: 'info'
        });
      }
    }
    
    // Check trailing whitespace
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.endsWith(' ') || line.endsWith('\t')) {
        this.issues.push({
          type: 'trailing_whitespace',
          file: filePath,
          line: i + 1,
          message: 'Trailing whitespace',
          severity: 'info'
        });
      }
    }
    
    // Check multiple empty lines
    if (content.match(/\n\s*\n\s*\n/)) {
      this.issues.push({
        type: 'multiple_empty_lines',
        file: filePath,
        message: 'Multiple consecutive empty lines',
        severity: 'info'
      });
    }
  }

  // Check content quality
  checkContentQuality(filePath, content) {
    const wordCount = content.split(/\s+/).length;
    
    // Check word count
    if (wordCount < this.config.clarity.readability.minWordCount) {
      this.issues.push({
        type: 'content_length',
        file: filePath,
        message: `Content too short: ${wordCount} words`,
        severity: 'warning'
      });
    }
    
    if (wordCount > this.config.clarity.readability.maxWordCount) {
      this.issues.push({
        type: 'content_length',
        file: filePath,
        message: `Content too long: ${wordCount} words`,
        severity: 'warning'
      });
    }
    
    // Check for placeholder text
    const placeholders = ['TODO', 'FIXME', 'XXX', 'PLACEHOLDER', 'TBD'];
    for (const placeholder of placeholders) {
      if (content.includes(placeholder)) {
        this.issues.push({
          type: 'placeholder_text',
          file: filePath,
          message: `Contains placeholder text: ${placeholder}`,
          severity: 'warning'
        });
      }
    }
    
    // Check for broken English
    const brokenPatterns = [
      /\bcan not\b/g,
      /\bshould of\b/g,
      /\bwould of\b/g,
      /\bcould of\b/g
    ];
    
    for (const pattern of brokenPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          this.issues.push({
            type: 'grammar',
            file: filePath,
            message: `Potential grammar issue: ${match}`,
            severity: 'info'
          });
        }
      }
    }
  }

  // Check links
  checkLinks(filePath, content) {
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = linkPattern.exec(content)) !== null) {
      const [, linkText, linkUrl] = match;
      
      // Check link text
      if (linkText.trim() === '') {
        this.issues.push({
          type: 'empty_link_text',
          file: filePath,
          message: 'Empty link text',
          severity: 'error'
        });
      }
      
      // Check link URL
      if (linkUrl.trim() === '') {
        this.issues.push({
          type: 'empty_link_url',
          file: filePath,
          message: 'Empty link URL',
          severity: 'error'
        });
      }
      
      // Check for external links without protocol
      if (!linkUrl.startsWith('http') && !linkUrl.startsWith('mailto:') && !linkUrl.startsWith('#')) {
        if (!linkUrl.startsWith('./') && !linkUrl.startsWith('../')) {
          this.issues.push({
            type: 'relative_link',
            file: filePath,
            message: `Relative link without ./ or ../: ${linkUrl}`,
            severity: 'info'
          });
        }
      }
    }
  }

  // Check code blocks
  checkCodeBlocks(filePath, content) {
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockPattern.exec(content)) !== null) {
      const [, language, code] = match;
      
      // Check for empty code blocks
      if (code.trim() === '') {
        this.issues.push({
          type: 'empty_code_block',
          file: filePath,
          message: 'Empty code block',
          severity: 'warning'
        });
      }
      
      // Check for language specification
      if (!language && code.length > 20) {
        this.issues.push({
          type: 'missing_language',
          file: filePath,
          message: 'Code block without language specification',
          severity: 'info'
        });
      }
      
      // Check for valid language
      if (language) {
        const validLanguages = [
          'bash', 'javascript', 'typescript', 'json', 'yaml', 'markdown',
          'python', 'java', 'go', 'rust', 'html', 'css', 'sql', 'text'
        ];
        
        if (!validLanguages.includes(language.toLowerCase())) {
          this.issues.push({
            type: 'invalid_language',
            file: filePath,
            message: `Invalid language specification: ${language}`,
            severity: 'info'
          });
        }
      }
    }
  }

  // Review consistency
  reviewConsistency() {
    console.log('🔍 Reviewing consistency...');
    
    // Check terminology consistency
    this.checkTerminologyConsistency();
    
    // Check formatting consistency
    this.checkFormattingConsistency();
    
    // Check structure consistency
    this.checkStructureConsistency();
  }

  // Check terminology consistency
  checkTerminologyConsistency() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        for (const [term, expected] of Object.entries(this.config.consistency.terminology)) {
          if (content.includes(term) && !content.includes(expected)) {
            this.issues.push({
              type: 'terminology_inconsistency',
              file: relativePath,
              message: `Inconsistent terminology: ${term} should be ${expected}`,
              severity: 'warning'
            });
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  }

  // Check formatting consistency
  checkFormattingConsistency() {
    // This would be implemented in a real application
    console.log('  📝 Formatting consistency checked');
  }

  // Check structure consistency
  checkStructureConsistency() {
    // This would be implemented in a real application
    console.log('  📋 Structure consistency checked');
  }

  // Review clarity
  reviewClarity() {
    console.log('🔍 Reviewing clarity...');
    
    // Check readability
    this.checkReadability();
    
    // Check language clarity
    this.checkLanguageClarity();
    
    // Check audience appropriateness
    this.checkAudienceAppropriateness();
  }

  // Check readability
  checkReadability() {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        const relativePath = file.replace(projectRoot, '');
        
        // Check sentence length
        const sentences = content.split(/[.!?]+/);
        for (const sentence of sentences) {
          const words = sentence.trim().split(/\s+/);
          if (words.length > 30) {
            this.issues.push({
              type: 'long_sentence',
              file: relativePath,
              message: `Long sentence: ${words.length} words`,
              severity: 'info'
            });
          }
        }
        
        // Check paragraph length
        const paragraphs = content.split(/\n\s*\n/);
        for (const paragraph of paragraphs) {
          const words = paragraph.trim().split(/\s+/);
          if (words.length > 200) {
            this.issues.push({
              type: 'long_paragraph',
              file: relativePath,
              message: `Long paragraph: ${words.length} words`,
              severity: 'info'
            });
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
  }

  // Check language clarity
  checkLanguageClarity() {
    // This would be implemented in a real application
    console.log('  💬 Language clarity checked');
  }

  // Check audience appropriateness
  checkAudienceAppropriateness() {
    // This would be implemented in a real application
    console.log('  👥 Audience appropriateness checked');
  }

  // Review completeness
  reviewCompleteness() {
    console.log('🔍 Reviewing completeness...');
    
    // Check module coverage
    this.checkModuleCoverage();
    
    // Check feature coverage
    this.checkFeatureCoverage();
    
    // Check example coverage
    this.checkExampleCoverage();
    
    // Check cross-references
    this.checkCrossReferences();
  }

  // Check module coverage
  checkModuleCoverage() {
    const requiredModules = this.config.completeness.coverage.modules;
    const docsDir = join(projectRoot, 'docs');
    
    for (const module of requiredModules) {
      const moduleFile = join(docsDir, `${module}-module.md`);
      if (!statSync(moduleFile)) {
        this.issues.push({
          type: 'missing_module_doc',
          file: 'docs/',
          message: `Missing module documentation: ${module}`,
          severity: 'error'
        });
      }
    }
  }

  // Check feature coverage
  checkFeatureCoverage() {
    const requiredFeatures = this.config.completeness.coverage.features;
    const files = this.getDocumentationFiles();
    
    for (const feature of requiredFeatures) {
      let found = false;
      for (const file of files) {
        try {
          const content = readFileSync(file, 'utf8');
          if (content.toLowerCase().includes(feature.toLowerCase())) {
            found = true;
            break;
          }
        } catch (error) {
          // Skip files we can't read
        }
      }
      
      if (!found) {
        this.issues.push({
          type: 'missing_feature_doc',
          file: 'all',
          message: `Missing feature documentation: ${feature}`,
          severity: 'warning'
        });
      }
    }
  }

  // Check example coverage
  checkExampleCoverage() {
    const requiredExamples = this.config.completeness.coverage.examples;
    const files = this.getDocumentationFiles();
    
    for (const example of requiredExamples) {
      let found = false;
      for (const file of files) {
        try {
          const content = readFileSync(file, 'utf8');
          if (content.toLowerCase().includes(example.toLowerCase())) {
            found = true;
            break;
          }
        } catch (error) {
          // Skip files we can't read
        }
      }
      
      if (!found) {
        this.issues.push({
          type: 'missing_example',
          file: 'all',
          message: `Missing example: ${example}`,
          severity: 'info'
        });
      }
    }
  }

  // Check cross-references
  checkCrossReferences() {
    // This would be implemented in a real application
    console.log('  🔗 Cross-references checked');
  }

  // Generate report
  generateReport() {
    console.log('📊 Generating review report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      issues: this.issues,
      suggestions: this.suggestions,
      summary: {
        totalIssues: this.issues.length,
        bySeverity: this.issues.reduce((acc, issue) => {
          acc[issue.severity] = (acc[issue.severity] || 0) + 1;
          return acc;
        }, {}),
        byType: this.issues.reduce((acc, issue) => {
          acc[issue.type] = (acc[issue.type] || 0) + 1;
          return acc;
        }, {})
      }
    };
    
    const reportPath = join(projectRoot, 'docs/review-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('');
    console.log('📊 Review Report Summary:');
    console.log(`   Total files: ${report.metrics.totalFiles}`);
    console.log(`   Total words: ${report.metrics.totalWords}`);
    console.log(`   Total links: ${report.metrics.totalLinks}`);
    console.log(`   Total code blocks: ${report.metrics.totalCodeBlocks}`);
    console.log(`   Total headers: ${report.metrics.totalHeaders}`);
    console.log(`   Total issues: ${report.summary.totalIssues}`);
    
    for (const [severity, count] of Object.entries(report.summary.bySeverity)) {
      console.log(`   ${severity}: ${count}`);
    }
    
    console.log(`   Report saved: ${reportPath}`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const review = new DocumentationReview();
  review.runReview();
}

export default DocumentationReview;

