#!/usr/bin/env node

/**
 * Comprehensive Documentation Review and Quality Assurance
 * 
 * Automated review process for documentation quality, consistency, and completeness
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Review configuration
const REVIEW_CONFIG = {
  quality: {
    readability: {
      maxLineLength: 120,
      maxParagraphLength: 1000,
      minSentenceLength: 10,
      maxSentenceLength: 200
    },
    completeness: {
      requiredSections: {
        'README.md': ['Installation', 'Usage', 'Configuration', 'Contributing'],
        'TECHNICAL_SPECIFICATION.md': ['Overview', 'Architecture', 'API', 'Security'],
        'ARCHITECTURE.md': ['System Overview', 'Components', 'Data Flow', 'Dependencies']
      },
      minWordCount: 100,
      minCodeExamples: 2
    },
    accuracy: {
      maxTodoComments: 3,
      allowPlaceholders: false,
      requireVersionInfo: true
    }
  },
  consistency: {
    terminology: {
      caseSensitive: true,
      allowVariations: false,
      requiredTerms: ['Ollama Code', 'CLI', 'TypeScript', 'Node.js']
    },
    formatting: {
      headingLevels: true,
      listFormatting: true,
      codeBlockFormatting: true,
      linkFormatting: true
    },
    crossReferences: {
      checkInternalLinks: true,
      checkExternalLinks: false,
      requireDescriptiveText: true
    }
  },
  structure: {
    navigation: {
      requireTableOfContents: true,
      maxDepth: 4,
      requireSectionNumbers: false
    },
    organization: {
      logicalFlow: true,
      relatedContent: true,
      avoidDuplication: true
    }
  }
};

// Review results
const reviewResults = {
  timestamp: new Date().toISOString(),
  summary: {
    totalFiles: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    score: 0
  },
  quality: {
    readability: { passed: 0, failed: 0, issues: [] },
    completeness: { passed: 0, failed: 0, issues: [] },
    accuracy: { passed: 0, failed: 0, issues: [] }
  },
  consistency: {
    terminology: { passed: 0, failed: 0, issues: [] },
    formatting: { passed: 0, failed: 0, issues: [] },
    crossReferences: { passed: 0, failed: 0, issues: [] }
  },
  structure: {
    navigation: { passed: 0, failed: 0, issues: [] },
    organization: { passed: 0, failed: 0, issues: [] }
  },
  recommendations: []
};

// Documentation review class
class DocumentationReviewer {
  constructor(config = REVIEW_CONFIG) {
    this.config = config;
    this.files = [];
    this.terms = new Map();
    this.links = new Map();
  }

  // Run comprehensive review
  async runReview() {
    console.log('🔍 Starting comprehensive documentation review...');
    
    try {
      // Get all documentation files
      this.files = this.getDocumentationFiles();
      reviewResults.summary.totalFiles = this.files.length;
      
      console.log(`📊 Reviewing ${this.files.length} documentation files`);
      
      // Run quality checks
      await this.runQualityChecks();
      
      // Run consistency checks
      await this.runConsistencyChecks();
      
      // Run structure checks
      await this.runStructureChecks();
      
      // Generate recommendations
      this.generateRecommendations();
      
      // Calculate overall score
      this.calculateScore();
      
      // Generate report
      this.generateReport();
      
      console.log('✅ Documentation review completed');
      return reviewResults.summary.score >= 80;
      
    } catch (error) {
      console.error('❌ Review failed:', error.message);
      return false;
    }
  }

  // Run quality checks
  async runQualityChecks() {
    console.log('  📝 Running quality checks...');
    
    for (const file of this.files) {
      const content = readFileSync(file, 'utf8');
      const relativePath = file.replace(projectRoot, '');
      
      // Readability checks
      await this.checkReadability(file, content, relativePath);
      
      // Completeness checks
      await this.checkCompleteness(file, content, relativePath);
      
      // Accuracy checks
      await this.checkAccuracy(file, content, relativePath);
    }
  }

  // Check readability
  async checkReadability(file, content, relativePath) {
    const config = this.config.quality.readability;
    const issues = [];
    
    // Check line length
    const lines = content.split('\n');
    const longLines = lines.filter(line => line.length > config.maxLineLength);
    
    if (longLines.length > 5) {
      issues.push(`Too many long lines (${longLines.length})`);
    }
    
    // Check paragraph length
    const paragraphs = content.split('\n\n');
    const longParagraphs = paragraphs.filter(p => p.length > config.maxParagraphLength);
    
    if (longParagraphs.length > 3) {
      issues.push(`Too many long paragraphs (${longParagraphs.length})`);
    }
    
    // Check sentence length
    const sentences = content.match(/[^.!?]+[.!?]/g) || [];
    const shortSentences = sentences.filter(s => s.length < config.minSentenceLength);
    const longSentences = sentences.filter(s => s.length > config.maxSentenceLength);
    
    if (shortSentences.length > sentences.length * 0.3) {
      issues.push(`Too many short sentences (${shortSentences.length})`);
    }
    
    if (longSentences.length > sentences.length * 0.2) {
      issues.push(`Too many long sentences (${longSentences.length})`);
    }
    
    // Check for passive voice
    const passiveVoice = content.match(/\b(is|are|was|were|be|been|being)\s+\w+ed\b/g) || [];
    if (passiveVoice.length > 10) {
      issues.push(`Too much passive voice (${passiveVoice.length} instances)`);
    }
    
    // Check for unclear language
    const unclearPatterns = [
      /\bit is important to note that\b/gi,
      /\bit should be noted that\b/gi,
      /\bit is worth noting that\b/gi,
      /\bas mentioned above\b/gi,
      /\bas stated previously\b/gi
    ];
    
    const unclearMatches = unclearPatterns.filter(pattern => pattern.test(content));
    if (unclearMatches.length > 2) {
      issues.push(`Unclear language patterns (${unclearMatches.length})`);
    }
    
    if (issues.length > 0) {
      reviewResults.quality.readability.failed++;
      reviewResults.quality.readability.issues.push({
        file: relativePath,
        issues: issues
      });
    } else {
      reviewResults.quality.readability.passed++;
    }
  }

  // Check completeness
  async checkCompleteness(file, content, relativePath) {
    const config = this.config.quality.completeness;
    const issues = [];
    
    // Check required sections
    const fileName = relativePath.split('/').pop();
    if (config.requiredSections[fileName]) {
      const requiredSections = config.requiredSections[fileName];
      const missingSections = requiredSections.filter(section => 
        !content.includes(section)
      );
      
      if (missingSections.length > 0) {
        issues.push(`Missing required sections: ${missingSections.join(', ')}`);
      }
    }
    
    // Check word count
    const wordCount = content.split(/\s+/).length;
    if (wordCount < config.minWordCount) {
      issues.push(`Content too short (${wordCount} words, minimum ${config.minWordCount})`);
    }
    
    // Check code examples
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    if (codeBlocks.length < config.minCodeExamples) {
      issues.push(`Insufficient code examples (${codeBlocks.length}, minimum ${config.minCodeExamples})`);
    }
    
    // Check for empty sections
    const sections = content.match(/^##\s+.+$/gm) || [];
    const emptySections = sections.filter(section => {
      const sectionContent = content.split(section)[1]?.split(/^##\s+/m)[0] || '';
      return sectionContent.trim().length < 50;
    });
    
    if (emptySections.length > 0) {
      issues.push(`Empty or underdeveloped sections: ${emptySections.length}`);
    }
    
    if (issues.length > 0) {
      reviewResults.quality.completeness.failed++;
      reviewResults.quality.completeness.issues.push({
        file: relativePath,
        issues: issues
      });
    } else {
      reviewResults.quality.completeness.passed++;
    }
  }

  // Check accuracy
  async checkAccuracy(file, content, relativePath) {
    const config = this.config.quality.accuracy;
    const issues = [];
    
    // Check TODO comments
    const todos = content.match(/TODO|FIXME|XXX/g) || [];
    if (todos.length > config.maxTodoComments) {
      issues.push(`Too many TODO comments (${todos.length}, maximum ${config.maxTodoComments})`);
    }
    
    // Check for placeholders
    if (!config.allowPlaceholders) {
      const placeholders = content.match(/\[PLACEHOLDER\]|\[TODO\]|\[FIXME\]/g) || [];
      if (placeholders.length > 0) {
        issues.push(`Placeholder text found: ${placeholders.length} instances`);
      }
    }
    
    // Check version information
    if (config.requireVersionInfo) {
      const versionInfo = content.match(/version|v\d+\.\d+\.\d+/gi) || [];
      if (versionInfo.length === 0) {
        issues.push('No version information found');
      }
    }
    
    // Check for outdated information
    const outdatedPatterns = [
      /\b(soon|coming soon|will be|planned)\b/gi,
      /\b(not yet|not implemented|not available)\b/gi
    ];
    
    const outdatedMatches = outdatedPatterns.filter(pattern => pattern.test(content));
    if (outdatedMatches.length > 5) {
      issues.push(`Potentially outdated information (${outdatedMatches.length} instances)`);
    }
    
    if (issues.length > 0) {
      reviewResults.quality.accuracy.failed++;
      reviewResults.quality.accuracy.issues.push({
        file: relativePath,
        issues: issues
      });
    } else {
      reviewResults.quality.accuracy.passed++;
    }
  }

  // Run consistency checks
  async runConsistencyChecks() {
    console.log('  🔄 Running consistency checks...');
    
    // Build term and link maps
    this.buildTermMap();
    this.buildLinkMap();
    
    for (const file of this.files) {
      const content = readFileSync(file, 'utf8');
      const relativePath = file.replace(projectRoot, '');
      
      // Terminology checks
      await this.checkTerminology(file, content, relativePath);
      
      // Formatting checks
      await this.checkFormatting(file, content, relativePath);
      
      // Cross-reference checks
      await this.checkCrossReferences(file, content, relativePath);
    }
  }

  // Build term map
  buildTermMap() {
    for (const file of this.files) {
      const content = readFileSync(file, 'utf8');
      const words = content.match(/\b[A-Z][a-z]+\b/g) || [];
      
      for (const word of words) {
        if (word.length > 3) {
          this.terms.set(word, (this.terms.get(word) || 0) + 1);
        }
      }
    }
  }

  // Build link map
  buildLinkMap() {
    for (const file of this.files) {
      const content = readFileSync(file, 'utf8');
      const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
      
      for (const link of links) {
        const [, text, url] = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
        this.links.set(url, (this.links.get(url) || 0) + 1);
      }
    }
  }

  // Check terminology
  async checkTerminology(file, content, relativePath) {
    const config = this.config.consistency.terminology;
    const issues = [];
    
    // Check required terms
    for (const term of config.requiredTerms) {
      if (!content.includes(term)) {
        issues.push(`Missing required term: ${term}`);
      }
    }
    
    // Check for inconsistent capitalization
    const words = content.match(/\b[A-Z][a-z]+\b/g) || [];
    const wordCounts = new Map();
    
    for (const word of words) {
      if (word.length > 3) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
    
    // Check for variations
    const variations = Array.from(wordCounts.entries())
      .filter(([word, count]) => count > 1)
      .map(([word, count]) => ({ word, count }));
    
    if (variations.length > 10) {
      issues.push(`Inconsistent terminology (${variations.length} variations)`);
    }
    
    if (issues.length > 0) {
      reviewResults.consistency.terminology.failed++;
      reviewResults.consistency.terminology.issues.push({
        file: relativePath,
        issues: issues
      });
    } else {
      reviewResults.consistency.terminology.passed++;
    }
  }

  // Check formatting
  async checkFormatting(file, content, relativePath) {
    const config = this.config.consistency.formatting;
    const issues = [];
    
    // Check heading levels
    if (config.headingLevels) {
      const headings = content.match(/^#+\s+.+$/gm) || [];
      const headingLevels = headings.map(h => h.match(/^#+/)[0].length);
      
      // Check for skipped heading levels
      for (let i = 1; i < headingLevels.length; i++) {
        if (headingLevels[i] > headingLevels[i-1] + 1) {
          issues.push('Skipped heading levels');
          break;
        }
      }
    }
    
    // Check list formatting
    if (config.listFormatting) {
      const lists = content.match(/^[\s]*[-*+]\s+.+$/gm) || [];
      const numberedLists = content.match(/^[\s]*\d+\.\s+.+$/gm) || [];
      
      // Check for mixed list types
      if (lists.length > 0 && numberedLists.length > 0) {
        issues.push('Mixed list formatting');
      }
    }
    
    // Check code block formatting
    if (config.codeBlockFormatting) {
      const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
      const unclosedBlocks = content.match(/```(?![\s\S]*?```)/g) || [];
      
      if (unclosedBlocks.length > 0) {
        issues.push('Unclosed code blocks');
      }
    }
    
    // Check link formatting
    if (config.linkFormatting) {
      const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
      const malformedLinks = links.filter(link => {
        const [, text, url] = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
        return !text || !url || text.length < 2 || url.length < 2;
      });
      
      if (malformedLinks.length > 0) {
        issues.push(`Malformed links: ${malformedLinks.length}`);
      }
    }
    
    if (issues.length > 0) {
      reviewResults.consistency.formatting.failed++;
      reviewResults.consistency.formatting.issues.push({
        file: relativePath,
        issues: issues
      });
    } else {
      reviewResults.consistency.formatting.passed++;
    }
  }

  // Check cross-references
  async checkCrossReferences(file, content, relativePath) {
    const config = this.config.consistency.crossReferences;
    const issues = [];
    
    if (config.checkInternalLinks) {
      const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
      
      for (const link of links) {
        const [, text, url] = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
        
        // Check internal links
        if (url.startsWith('./') || url.startsWith('../')) {
          const targetFile = join(projectRoot, url);
          if (!existsSync(targetFile)) {
            issues.push(`Broken internal link: ${url}`);
          }
        }
        
        // Check descriptive text
        if (config.requireDescriptiveText && text.length < 3) {
          issues.push(`Non-descriptive link text: "${text}"`);
        }
      }
    }
    
    if (issues.length > 0) {
      reviewResults.consistency.crossReferences.failed++;
      reviewResults.consistency.crossReferences.issues.push({
        file: relativePath,
        issues: issues
      });
    } else {
      reviewResults.consistency.crossReferences.passed++;
    }
  }

  // Run structure checks
  async runStructureChecks() {
    console.log('  🏗️  Running structure checks...');
    
    for (const file of this.files) {
      const content = readFileSync(file, 'utf8');
      const relativePath = file.replace(projectRoot, '');
      
      // Navigation checks
      await this.checkNavigation(file, content, relativePath);
      
      // Organization checks
      await this.checkOrganization(file, content, relativePath);
    }
  }

  // Check navigation
  async checkNavigation(file, content, relativePath) {
    const config = this.config.structure.navigation;
    const issues = [];
    
    // Check table of contents
    if (config.requireTableOfContents) {
      const toc = content.match(/^##\s+Table\s+of\s+Contents?/i) || [];
      if (toc.length === 0) {
        issues.push('Missing table of contents');
      }
    }
    
    // Check heading depth
    const headings = content.match(/^#+\s+.+$/gm) || [];
    const headingLevels = headings.map(h => h.match(/^#+/)[0].length);
    const maxDepth = Math.max(...headingLevels);
    
    if (maxDepth > config.maxDepth) {
      issues.push(`Heading depth too deep (${maxDepth}, maximum ${config.maxDepth})`);
    }
    
    if (issues.length > 0) {
      reviewResults.structure.navigation.failed++;
      reviewResults.structure.navigation.issues.push({
        file: relativePath,
        issues: issues
      });
    } else {
      reviewResults.structure.navigation.passed++;
    }
  }

  // Check organization
  async checkOrganization(file, content, relativePath) {
    const config = this.config.structure.organization;
    const issues = [];
    
    // Check logical flow
    if (config.logicalFlow) {
      const sections = content.match(/^##\s+.+$/gm) || [];
      const expectedOrder = ['Overview', 'Installation', 'Usage', 'Configuration', 'API', 'Examples', 'Contributing'];
      
      let orderScore = 0;
      for (let i = 0; i < expectedOrder.length; i++) {
        const section = expectedOrder[i];
        const sectionIndex = sections.findIndex(s => s.toLowerCase().includes(section.toLowerCase()));
        if (sectionIndex !== -1) {
          orderScore += (expectedOrder.length - i) * (sections.length - sectionIndex);
        }
      }
      
      if (orderScore < sections.length * 2) {
        issues.push('Poor logical flow of sections');
      }
    }
    
    // Check for duplication
    if (config.avoidDuplication) {
      const sections = content.match(/^##\s+(.+)$/gm) || [];
      const sectionTitles = sections.map(s => s.replace(/^##\s+/, '').toLowerCase());
      const duplicates = sectionTitles.filter((title, index) => 
        sectionTitles.indexOf(title) !== index
      );
      
      if (duplicates.length > 0) {
        issues.push(`Duplicate sections: ${duplicates.join(', ')}`);
      }
    }
    
    if (issues.length > 0) {
      reviewResults.structure.organization.failed++;
      reviewResults.structure.organization.issues.push({
        file: relativePath,
        issues: issues
      });
    } else {
      reviewResults.structure.organization.passed++;
    }
  }

  // Generate recommendations
  generateRecommendations() {
    const recommendations = [];
    
    // Quality recommendations
    if (reviewResults.quality.readability.failed > 0) {
      recommendations.push({
        category: 'Readability',
        priority: 'high',
        suggestion: 'Improve sentence structure and reduce passive voice usage'
      });
    }
    
    if (reviewResults.quality.completeness.failed > 0) {
      recommendations.push({
        category: 'Completeness',
        priority: 'medium',
        suggestion: 'Add missing sections and expand underdeveloped content'
      });
    }
    
    if (reviewResults.quality.accuracy.failed > 0) {
      recommendations.push({
        category: 'Accuracy',
        priority: 'high',
        suggestion: 'Remove TODO comments and update outdated information'
      });
    }
    
    // Consistency recommendations
    if (reviewResults.consistency.terminology.failed > 0) {
      recommendations.push({
        category: 'Terminology',
        priority: 'medium',
        suggestion: 'Standardize terminology usage across all documentation'
      });
    }
    
    if (reviewResults.consistency.formatting.failed > 0) {
      recommendations.push({
        category: 'Formatting',
        priority: 'low',
        suggestion: 'Standardize formatting and fix structural issues'
      });
    }
    
    // Structure recommendations
    if (reviewResults.structure.navigation.failed > 0) {
      recommendations.push({
        category: 'Navigation',
        priority: 'medium',
        suggestion: 'Improve navigation structure and add table of contents'
      });
    }
    
    reviewResults.recommendations = recommendations;
  }

  // Calculate overall score
  calculateScore() {
    const totalChecks = reviewResults.summary.totalFiles * 8; // 8 check categories
    const passedChecks = 
      reviewResults.quality.readability.passed +
      reviewResults.quality.completeness.passed +
      reviewResults.quality.accuracy.passed +
      reviewResults.consistency.terminology.passed +
      reviewResults.consistency.formatting.passed +
      reviewResults.consistency.crossReferences.passed +
      reviewResults.structure.navigation.passed +
      reviewResults.structure.organization.passed;
    
    reviewResults.summary.score = Math.round((passedChecks / totalChecks) * 100);
    reviewResults.summary.passed = passedChecks;
    reviewResults.summary.failed = totalChecks - passedChecks;
  }

  // Generate report
  generateReport() {
    const reportPath = join(projectRoot, 'docs/review-report.json');
    writeFileSync(reportPath, JSON.stringify(reviewResults, null, 2));
    
    console.log('');
    console.log('📊 Documentation Review Results:');
    console.log(`   Overall Score: ${reviewResults.summary.score}/100`);
    console.log(`   Files Reviewed: ${reviewResults.summary.totalFiles}`);
    console.log(`   Checks Passed: ${reviewResults.summary.passed}`);
    console.log(`   Checks Failed: ${reviewResults.summary.failed}`);
    
    if (reviewResults.recommendations.length > 0) {
      console.log('');
      console.log('💡 Recommendations:');
      for (const rec of reviewResults.recommendations) {
        console.log(`   [${rec.priority.toUpperCase()}] ${rec.category}: ${rec.suggestion}`);
      }
    }
    
    console.log(`   Report saved: ${reportPath}`);
  }

  // Get documentation files
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
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const reviewer = new DocumentationReviewer();
  reviewer.runReview().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export default DocumentationReviewer;

