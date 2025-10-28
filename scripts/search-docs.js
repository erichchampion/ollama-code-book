#!/usr/bin/env node

/**
 * Documentation Search and Indexing System
 * 
 * Comprehensive search and indexing system for documentation
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Search configuration
const SEARCH_CONFIG = {
  indexing: {
    enabled: true,
    autoIndex: true,
    updateInterval: 3600000, // 1 hour
    indexDir: 'docs/search-index',
    indexFile: 'search-index.json'
  },
  search: {
    enabled: true,
    fuzzySearch: true,
    caseSensitive: false,
    maxResults: 50,
    highlightMatches: true,
    searchFields: ['title', 'content', 'headings', 'code', 'tags']
  },
  features: {
    fullTextSearch: true,
    semanticSearch: true,
    codeSearch: true,
    tagSearch: true,
    categorySearch: true,
    dateSearch: true,
    authorSearch: true
  },
  performance: {
    cacheResults: true,
    cacheSize: 1000,
    cacheTimeout: 300000, // 5 minutes
    parallelSearch: true,
    maxConcurrent: 5
  }
};

// Search index structure
const searchIndex = {
  metadata: {
    version: '1.0.0',
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    totalDocuments: 0,
    totalTerms: 0
  },
  documents: new Map(),
  terms: new Map(),
  categories: new Map(),
  tags: new Map(),
  authors: new Map(),
  dates: new Map()
};

// Search results
const searchResults = {
  query: '',
  totalResults: 0,
  results: [],
  suggestions: [],
  facets: {
    categories: new Map(),
    tags: new Map(),
    authors: new Map(),
    dates: new Map()
  },
  performance: {
    searchTime: 0,
    indexTime: 0,
    cacheHit: false
  }
};

// Documentation search class
class DocumentationSearch {
  constructor(config = SEARCH_CONFIG) {
    this.config = config;
    this.index = searchIndex;
    this.results = searchResults;
    this.cache = new Map();
    this.startTime = Date.now();
  }

  // Initialize search system
  async initialize() {
    console.log('🔍 Initializing documentation search system...');
    
    try {
      // Create index directory
      await this.createIndexDirectory();
      
      // Load existing index
      await this.loadExistingIndex();
      
      // Build search index
      await this.buildIndex();
      
      // Start auto-indexing
      if (this.config.indexing.autoIndex) {
        await this.startAutoIndexing();
      }
      
      console.log('✅ Search system initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      return false;
    }
  }

  // Create index directory
  async createIndexDirectory() {
    const indexDir = join(projectRoot, this.config.indexing.indexDir);
    if (!existsSync(indexDir)) {
      mkdirSync(indexDir, { recursive: true });
      console.log(`  📁 Created index directory: ${indexDir}`);
    }
  }

  // Load existing index
  async loadExistingIndex() {
    const indexPath = join(projectRoot, this.config.indexing.indexDir, this.config.indexing.indexFile);
    
    if (existsSync(indexPath)) {
      try {
        const existingIndex = JSON.parse(readFileSync(indexPath, 'utf8'));
        this.index = { ...this.index, ...existingIndex };
        console.log(`  📊 Loaded existing index: ${this.index.documents.size} documents`);
      } catch (error) {
        console.warn('⚠️  Could not load existing index:', error.message);
      }
    }
  }

  // Build search index
  async buildIndex() {
    console.log('  🏗️  Building search index...');
    
    const files = this.getDocumentationFiles();
    let processedFiles = 0;
    
    for (const file of files) {
      try {
        await this.indexDocument(file);
        processedFiles++;
      } catch (error) {
        console.warn(`⚠️  Could not index ${file}: ${error.message}`);
      }
    }
    
    // Update index metadata
    this.index.metadata.totalDocuments = processedFiles;
    this.index.metadata.lastUpdated = new Date().toISOString();
    
    // Save index
    await this.saveIndex();
    
    console.log(`    ✅ Indexed ${processedFiles} documents`);
  }

  // Index individual document
  async indexDocument(filePath) {
    const content = readFileSync(filePath, 'utf8');
    const relativePath = filePath.replace(projectRoot, '');
    const fileName = relativePath.split('/').pop().replace('.md', '');
    
    // Extract document information
    const document = {
      id: this.generateDocumentId(relativePath),
      path: relativePath,
      fileName: fileName,
      title: this.extractTitle(content),
      content: content,
      headings: this.extractHeadings(content),
      code: this.extractCode(content),
      tags: this.extractTags(content),
      category: this.determineCategory(relativePath),
      author: this.extractAuthor(content),
      date: this.extractDate(content),
      size: content.length,
      wordCount: this.countWords(content),
      lastModified: statSync(filePath).mtime.toISOString()
    };
    
    // Add to documents map
    this.index.documents.set(document.id, document);
    
    // Index terms
    await this.indexTerms(document);
    
    // Index categories
    this.indexCategories(document);
    
    // Index tags
    this.indexTags(document);
    
    // Index authors
    this.indexAuthors(document);
    
    // Index dates
    this.indexDates(document);
  }

  // Extract title
  extractTitle(content) {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1].trim() : 'Untitled';
  }

  // Extract headings
  extractHeadings(content) {
    const headings = content.match(/^#+\s+(.+)$/gm) || [];
    return headings.map(h => h.replace(/^#+\s+/, '').trim());
  }

  // Extract code
  extractCode(content) {
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    return codeBlocks.map(block => block.replace(/```\w*\n?/, '').replace(/```$/, '').trim());
  }

  // Extract tags
  extractTags(content) {
    const tagMatches = content.match(/#\w+/g) || [];
    return [...new Set(tagMatches.map(tag => tag.substring(1)))];
  }

  // Determine category
  determineCategory(relativePath) {
    if (relativePath.includes('docs/')) {
      return 'module';
    } else if (relativePath.includes('README')) {
      return 'overview';
    } else if (relativePath.includes('TECHNICAL_SPECIFICATION')) {
      return 'specification';
    } else if (relativePath.includes('ARCHITECTURE')) {
      return 'architecture';
    } else if (relativePath.includes('DEVELOPMENT')) {
      return 'development';
    } else {
      return 'general';
    }
  }

  // Extract author
  extractAuthor(content) {
    const authorMatch = content.match(/author\s*[:=]\s*['"]([^'"]+)['"]/i);
    return authorMatch ? authorMatch[1] : 'Unknown';
  }

  // Extract date
  extractDate(content) {
    const dateMatch = content.match(/(\d{4}-\d{2}-\d{2})/);
    return dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
  }

  // Count words
  countWords(content) {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }

  // Generate document ID
  generateDocumentId(relativePath) {
    return relativePath.replace(/[^a-zA-Z0-9]/g, '_');
  }

  // Index terms
  async indexTerms(document) {
    const terms = this.extractTerms(document.content);
    
    for (const term of terms) {
      if (!this.index.terms.has(term)) {
        this.index.terms.set(term, new Set());
      }
      this.index.terms.get(term).add(document.id);
    }
    
    this.index.metadata.totalTerms = this.index.terms.size;
  }

  // Extract terms
  extractTerms(content) {
    // Simple term extraction
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
    
    return [...new Set(words)];
  }

  // Check if word is stop word
  isStopWord(word) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);
    return stopWords.has(word);
  }

  // Index categories
  indexCategories(document) {
    const category = document.category;
    if (!this.index.categories.has(category)) {
      this.index.categories.set(category, new Set());
    }
    this.index.categories.get(category).add(document.id);
  }

  // Index tags
  indexTags(document) {
    for (const tag of document.tags) {
      if (!this.index.tags.has(tag)) {
        this.index.tags.set(tag, new Set());
      }
      this.index.tags.get(tag).add(document.id);
    }
  }

  // Index authors
  indexAuthors(document) {
    const author = document.author;
    if (!this.index.authors.has(author)) {
      this.index.authors.set(author, new Set());
    }
    this.index.authors.get(author).add(document.id);
  }

  // Index dates
  indexDates(document) {
    const date = document.date;
    if (!this.index.dates.has(date)) {
      this.index.dates.set(date, new Set());
    }
    this.index.dates.get(date).add(document.id);
  }

  // Start auto-indexing
  async startAutoIndexing() {
    setInterval(async () => {
      console.log('🔄 Auto-indexing documentation...');
      await this.buildIndex();
    }, this.config.indexing.updateInterval);
  }

  // Search documents
  async search(query, options = {}) {
    console.log(`🔍 Searching for: "${query}"`);
    
    const startTime = Date.now();
    this.results.query = query;
    this.results.results = [];
    this.results.suggestions = [];
    this.results.facets = {
      categories: new Map(),
      tags: new Map(),
      authors: new Map(),
      dates: new Map()
    };
    
    try {
      // Check cache first
      if (this.config.performance.cacheResults) {
        const cachedResult = this.cache.get(query);
        if (cachedResult && Date.now() - cachedResult.timestamp < this.config.performance.cacheTimeout) {
          this.results = { ...cachedResult, performance: { ...cachedResult.performance, cacheHit: true } };
          console.log('  📦 Cache hit');
          return this.results;
        }
      }
      
      // Perform search
      await this.performSearch(query, options);
      
      // Generate suggestions
      this.generateSuggestions(query);
      
      // Update performance metrics
      this.results.performance.searchTime = Date.now() - startTime;
      this.results.performance.cacheHit = false;
      
      // Cache results
      if (this.config.performance.cacheResults) {
        this.cache.set(query, { ...this.results, timestamp: Date.now() });
        
        // Limit cache size
        if (this.cache.size > this.config.performance.cacheSize) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
      }
      
      console.log(`  ✅ Found ${this.results.totalResults} results in ${this.results.performance.searchTime}ms`);
      return this.results;
      
    } catch (error) {
      console.error('❌ Search failed:', error.message);
      return this.results;
    }
  }

  // Perform search
  async performSearch(query, options) {
    const searchTerms = this.extractTerms(query);
    const results = new Map();
    
    // Search in different fields
    for (const [docId, document] of this.index.documents) {
      let score = 0;
      const matches = [];
      
      // Title matches (highest weight)
      for (const term of searchTerms) {
        if (document.title.toLowerCase().includes(term)) {
          score += 10;
          matches.push({ field: 'title', term, context: document.title });
        }
      }
      
      // Heading matches (high weight)
      for (const heading of document.headings) {
        for (const term of searchTerms) {
          if (heading.toLowerCase().includes(term)) {
            score += 5;
            matches.push({ field: 'heading', term, context: heading });
          }
        }
      }
      
      // Content matches (medium weight)
      for (const term of searchTerms) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const contentMatches = document.content.match(regex);
        if (contentMatches) {
          score += contentMatches.length;
          matches.push({ field: 'content', term, context: this.getContext(document.content, term) });
        }
      }
      
      // Code matches (low weight)
      for (const codeBlock of document.code) {
        for (const term of searchTerms) {
          if (codeBlock.toLowerCase().includes(term)) {
            score += 1;
            matches.push({ field: 'code', term, context: codeBlock.substring(0, 100) });
          }
        }
      }
      
      // Tag matches (medium weight)
      for (const tag of document.tags) {
        for (const term of searchTerms) {
          if (tag.toLowerCase().includes(term)) {
            score += 3;
            matches.push({ field: 'tag', term, context: tag });
          }
        }
      }
      
      if (score > 0) {
        results.set(docId, {
          document,
          score,
          matches,
          relevance: this.calculateRelevance(score, document)
        });
      }
    }
    
    // Sort results by score
    const sortedResults = Array.from(results.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, options.maxResults || this.config.search.maxResults);
    
    this.results.results = sortedResults;
    this.results.totalResults = sortedResults.length;
    
    // Update facets
    this.updateFacets(sortedResults);
  }

  // Get context
  getContext(content, term, contextLength = 100) {
    const index = content.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) return '';
    
    const start = Math.max(0, index - contextLength / 2);
    const end = Math.min(content.length, index + term.length + contextLength / 2);
    
    return content.substring(start, end);
  }

  // Calculate relevance
  calculateRelevance(score, document) {
    // Normalize score based on document size and word count
    const normalizedScore = score / Math.log(document.wordCount + 1);
    return Math.min(1, normalizedScore / 10);
  }

  // Update facets
  updateFacets(results) {
    for (const result of results) {
      const doc = result.document;
      
      // Category facet
      const category = doc.category;
      this.results.facets.categories.set(category, (this.results.facets.categories.get(category) || 0) + 1);
      
      // Tag facets
      for (const tag of doc.tags) {
        this.results.facets.tags.set(tag, (this.results.facets.tags.get(tag) || 0) + 1);
      }
      
      // Author facet
      const author = doc.author;
      this.results.facets.authors.set(author, (this.results.facets.authors.get(author) || 0) + 1);
      
      // Date facet
      const date = doc.date;
      this.results.facets.dates.set(date, (this.results.facets.dates.get(date) || 0) + 1);
    }
  }

  // Generate suggestions
  generateSuggestions(query) {
    const suggestions = [];
    const queryTerms = this.extractTerms(query);
    
    // Find similar terms
    for (const [term, docIds] of this.index.terms) {
      for (const queryTerm of queryTerms) {
        if (term.includes(queryTerm) || queryTerm.includes(term)) {
          suggestions.push(term);
        }
      }
    }
    
    // Find similar documents
    for (const [docId, document] of this.index.documents) {
      const titleWords = this.extractTerms(document.title);
      for (const queryTerm of queryTerms) {
        for (const titleWord of titleWords) {
          if (titleWord.includes(queryTerm) || queryTerm.includes(titleWord)) {
            suggestions.push(document.title);
          }
        }
      }
    }
    
    this.results.suggestions = [...new Set(suggestions)].slice(0, 10);
  }

  // Save index
  async saveIndex() {
    const indexPath = join(projectRoot, this.config.indexing.indexDir, this.config.indexing.indexFile);
    
    // Convert Maps to Objects for JSON serialization
    const serializableIndex = {
      ...this.index,
      documents: Object.fromEntries(this.index.documents),
      terms: Object.fromEntries(
        Array.from(this.index.terms.entries()).map(([term, docIds]) => [term, Array.from(docIds)])
      ),
      categories: Object.fromEntries(
        Array.from(this.index.categories.entries()).map(([category, docIds]) => [category, Array.from(docIds)])
      ),
      tags: Object.fromEntries(
        Array.from(this.index.tags.entries()).map(([tag, docIds]) => [tag, Array.from(docIds)])
      ),
      authors: Object.fromEntries(
        Array.from(this.index.authors.entries()).map(([author, docIds]) => [author, Array.from(docIds)])
      ),
      dates: Object.fromEntries(
        Array.from(this.index.dates.entries()).map(([date, docIds]) => [date, Array.from(docIds)])
      )
    };
    
    writeFileSync(indexPath, JSON.stringify(serializableIndex, null, 2));
    console.log(`  💾 Index saved: ${indexPath}`);
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

  // Generate search interface
  async generateSearchInterface() {
    console.log('🌐 Generating search interface...');
    
    const searchHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation Search</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .search-box { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px; }
        .search-box:focus { outline: none; border-color: #007bff; }
        .results { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .result { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
        .result:last-child { border-bottom: none; }
        .result-title { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
        .result-title a { color: #007bff; text-decoration: none; }
        .result-title a:hover { text-decoration: underline; }
        .result-path { color: #666; font-size: 14px; margin-bottom: 8px; }
        .result-excerpt { color: #333; line-height: 1.5; }
        .result-meta { color: #666; font-size: 12px; margin-top: 8px; }
        .facets { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .facet { margin-bottom: 15px; }
        .facet-title { font-weight: bold; margin-bottom: 8px; }
        .facet-item { display: inline-block; margin: 2px 4px; padding: 4px 8px; background: #f0f0f0; border-radius: 4px; font-size: 12px; }
        .suggestions { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .suggestion { display: inline-block; margin: 2px 4px; padding: 4px 8px; background: #e3f2fd; border-radius: 4px; font-size: 12px; cursor: pointer; }
        .suggestion:hover { background: #bbdefb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Documentation Search</h1>
            <input type="text" class="search-box" placeholder="Search documentation..." id="searchInput">
        </div>
        
        <div id="results" class="results" style="display: none;">
            <h2>Search Results</h2>
            <div id="resultsList"></div>
        </div>
        
        <div id="facets" class="facets" style="display: none;">
            <h3>Filters</h3>
            <div id="facetsList"></div>
        </div>
        
        <div id="suggestions" class="suggestions" style="display: none;">
            <h3>Suggestions</h3>
            <div id="suggestionsList"></div>
        </div>
    </div>
    
    <script>
        // Search functionality would be implemented here
        document.getElementById('searchInput').addEventListener('input', function(e) {
            const query = e.target.value;
            if (query.length > 2) {
                // Perform search
                console.log('Searching for:', query);
            }
        });
    </script>
</body>
</html>`;
    
    const interfacePath = join(projectRoot, 'docs/search-interface.html');
    writeFileSync(interfacePath, searchHTML);
    
    console.log(`  🌐 Search interface generated: ${interfacePath}`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const search = new DocumentationSearch();
  
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command) {
    case 'init':
      search.initialize();
      break;
    case 'index':
      search.buildIndex();
      break;
    case 'search':
      if (args.length > 0) {
        search.search(args.join(' '));
      } else {
        console.error('Usage: search-docs.js search <query>');
      }
      break;
    case 'interface':
      search.generateSearchInterface();
      break;
    default:
      console.log('Usage: search-docs.js <command> [args]');
      console.log('Commands:');
      console.log('  init                    Initialize search system');
      console.log('  index                   Build search index');
      console.log('  search <query>          Search documentation');
      console.log('  interface               Generate search interface');
      break;
  }
}

export default DocumentationSearch;

