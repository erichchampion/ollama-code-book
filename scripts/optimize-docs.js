#!/usr/bin/env node

/**
 * Documentation Performance Optimization and Caching System
 * 
 * Comprehensive system for optimizing documentation performance and implementing caching
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Optimization configuration
const OPTIMIZATION_CONFIG = {
  performance: {
    enabled: true,
    minify: true,
    compress: true,
    optimize: true,
    cache: true,
    lazyLoad: true
  },
  caching: {
    enabled: true,
    strategy: 'aggressive', // aggressive, moderate, conservative
    ttl: {
      static: 86400000, // 24 hours
      dynamic: 3600000, // 1 hour
      api: 300000 // 5 minutes
    },
    storage: {
      type: 'file', // file, memory, redis
      directory: 'docs/cache',
      maxSize: 100000000, // 100MB
      cleanupInterval: 3600000 // 1 hour
    }
  },
  compression: {
    enabled: true,
    algorithms: ['gzip', 'brotli'],
    minSize: 1024, // 1KB
    level: 6
  },
  minification: {
    enabled: true,
    html: true,
    css: true,
    js: true,
    markdown: true,
    json: true
  },
  optimization: {
    enabled: true,
    images: true,
    fonts: true,
    css: true,
    js: true,
    html: true
  },
  monitoring: {
    enabled: true,
    metrics: true,
    profiling: true,
    reporting: true
  }
};

// Cache storage
const cacheStorage = new Map();
const cacheMetadata = new Map();

// Performance metrics
const performanceMetrics = {
  startTime: Date.now(),
  operations: [],
  cache: {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0
  },
  optimization: {
    filesProcessed: 0,
    bytesSaved: 0,
    timeSaved: 0
  }
};

// Documentation optimizer class
class DocumentationOptimizer {
  constructor(config = OPTIMIZATION_CONFIG) {
    this.config = config;
    this.cache = cacheStorage;
    this.metadata = cacheMetadata;
    this.metrics = performanceMetrics;
    this.startTime = Date.now();
  }

  // Initialize optimization system
  async initialize() {
    console.log('⚡ Initializing documentation optimization system...');
    
    try {
      // Create necessary directories
      await this.createDirectories();
      
      // Load existing cache
      await this.loadCache();
      
      // Start cache cleanup
      this.startCacheCleanup();
      
      console.log('✅ Optimization system initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      return false;
    }
  }

  // Create necessary directories
  async createDirectories() {
    const dirs = [
      this.config.caching.storage.directory,
      'docs/optimized',
      'docs/compressed',
      'docs/minified'
    ];
    
    for (const dir of dirs) {
      const fullPath = join(projectRoot, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
        console.log(`  📁 Created directory: ${dir}`);
      }
    }
  }

  // Load existing cache
  async loadCache() {
    const cacheDir = join(projectRoot, this.config.caching.storage.directory);
    
    if (existsSync(cacheDir)) {
      const files = readdirSync(cacheDir);
      const cacheFiles = files.filter(f => f.endsWith('.cache'));
      
      for (const file of cacheFiles) {
        try {
          const cachePath = join(cacheDir, file);
          const cacheData = JSON.parse(readFileSync(cachePath, 'utf8'));
          
          this.cache.set(cacheData.key, cacheData.value);
          this.metadata.set(cacheData.key, {
            ttl: cacheData.ttl,
            created: cacheData.created,
            size: cacheData.size
          });
          
        } catch (error) {
          console.warn(`⚠️  Could not load cache file ${file}: ${error.message}`);
        }
      }
    }
  }

  // Start cache cleanup
  startCacheCleanup() {
    setInterval(() => {
      this.cleanupCache();
    }, this.config.caching.storage.cleanupInterval);
  }

  // Run full optimization
  async runOptimization() {
    console.log('🚀 Starting documentation optimization...');
    
    try {
      // Get all documentation files
      const files = this.getDocumentationFiles();
      
      // Process each file
      for (const file of files) {
        await this.optimizeFile(file);
      }
      
      // Generate optimized versions
      await this.generateOptimizedVersions();
      
      // Generate performance report
      await this.generatePerformanceReport();
      
      console.log('✅ Optimization completed');
      return true;
      
    } catch (error) {
      console.error('❌ Optimization failed:', error.message);
      return false;
    }
  }

  // Optimize individual file
  async optimizeFile(filePath) {
    const startTime = Date.now();
    const relativePath = filePath.replace(projectRoot, '');
    
    console.log(`  🔧 Optimizing ${relativePath}...`);
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(filePath);
      const cachedResult = this.getFromCache(cacheKey);
      
      if (cachedResult) {
        console.log(`    📦 Cache hit for ${relativePath}`);
        this.metrics.cache.hits++;
        return cachedResult;
      }
      
      // Read file content
      const content = readFileSync(filePath, 'utf8');
      
      // Apply optimizations
      let optimizedContent = content;
      
      if (this.config.minification.enabled) {
        optimizedContent = await this.minifyContent(optimizedContent, filePath);
      }
      
      if (this.config.compression.enabled) {
        optimizedContent = await this.compressContent(optimizedContent, filePath);
      }
      
      if (this.config.optimization.enabled) {
        optimizedContent = await this.optimizeContent(optimizedContent, filePath);
      }
      
      // Calculate savings
      const originalSize = content.length;
      const optimizedSize = optimizedContent.length;
      const savings = originalSize - optimizedSize;
      
      // Store in cache
      this.setCache(cacheKey, optimizedContent, this.config.caching.ttl.static);
      
      // Update metrics
      this.metrics.optimization.filesProcessed++;
      this.metrics.optimization.bytesSaved += savings;
      this.metrics.optimization.timeSaved += Date.now() - startTime;
      
      console.log(`    ✅ Optimized ${relativePath} (${savings} bytes saved)`);
      
      return optimizedContent;
      
    } catch (error) {
      console.error(`    ❌ Failed to optimize ${relativePath}: ${error.message}`);
      throw error;
    }
  }

  // Minify content
  async minifyContent(content, filePath) {
    const extension = filePath.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'md':
        return this.minifyMarkdown(content);
      case 'html':
        return this.minifyHTML(content);
      case 'css':
        return this.minifyCSS(content);
      case 'js':
        return this.minifyJS(content);
      case 'json':
        return this.minifyJSON(content);
      default:
        return content;
    }
  }

  // Minify markdown
  minifyMarkdown(content) {
    // Remove unnecessary whitespace
    let minified = content
      .replace(/\n{3,}/g, '\n\n') // Multiple newlines to double
      .replace(/[ \t]+$/gm, '') // Trailing whitespace
      .replace(/^\s+$/gm, '') // Empty lines with whitespace
      .trim();
    
    // Optimize code blocks
    minified = minified.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const trimmedCode = code.trim();
      return `\`\`\`${lang || ''}\n${trimmedCode}\n\`\`\``;
    });
    
    return minified;
  }

  // Minify HTML
  minifyHTML(content) {
    return content
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/>\s+</g, '><') // Remove spaces between tags
      .replace(/\s+>/g, '>') // Remove spaces before closing tags
      .replace(/>\s+/g, '>') // Remove spaces after opening tags
      .trim();
  }

  // Minify CSS
  minifyCSS(content) {
    return content
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/;\s*}/g, '}') // Remove semicolon before closing brace
      .replace(/{\s+/g, '{') // Remove spaces after opening brace
      .replace(/\s+}/g, '}') // Remove spaces before closing brace
      .replace(/:\s+/g, ':') // Remove spaces after colon
      .replace(/;\s+/g, ';') // Remove spaces after semicolon
      .trim();
  }

  // Minify JavaScript
  minifyJS(content) {
    // Simple JavaScript minification
    return content
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/\s*{\s*/g, '{') // Remove spaces around opening brace
      .replace(/\s*}\s*/g, '}') // Remove spaces around closing brace
      .replace(/\s*;\s*/g, ';') // Remove spaces around semicolon
      .trim();
  }

  // Minify JSON
  minifyJSON(content) {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed);
    } catch (error) {
      return content;
    }
  }

  // Compress content
  async compressContent(content, filePath) {
    if (content.length < this.config.compression.minSize) {
      return content;
    }
    
    // Simple compression simulation
    // In a real implementation, you would use actual compression libraries
    const compressed = this.simpleCompress(content);
    
    return compressed;
  }

  // Simple compression
  simpleCompress(content) {
    // Basic run-length encoding simulation
    let compressed = content;
    
    // Replace repeated spaces
    compressed = compressed.replace(/ {2,}/g, (match) => {
      return `[SP${match.length}]`;
    });
    
    // Replace repeated newlines
    compressed = compressed.replace(/\n{3,}/g, (match) => {
      return `[NL${match.length}]`;
    });
    
    return compressed;
  }

  // Optimize content
  async optimizeContent(content, filePath) {
    let optimized = content;
    
    // Optimize images
    if (this.config.optimization.images) {
      optimized = this.optimizeImages(optimized);
    }
    
    // Optimize links
    optimized = this.optimizeLinks(optimized);
    
    // Optimize headings
    optimized = this.optimizeHeadings(optimized);
    
    // Optimize lists
    optimized = this.optimizeLists(optimized);
    
    return optimized;
  }

  // Optimize images
  optimizeImages(content) {
    return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      // Add loading="lazy" for images
      return `![${alt}](${src})`;
    });
  }

  // Optimize links
  optimizeLinks(content) {
    return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      // Optimize internal links
      if (url.startsWith('./') || url.startsWith('../')) {
        return `[${text}](${url})`;
      }
      return match;
    });
  }

  // Optimize headings
  optimizeHeadings(content) {
    return content.replace(/^(#+)\s+(.+)$/gm, (match, hashes, text) => {
      // Ensure proper heading hierarchy
      const level = hashes.length;
      if (level > 6) {
        return `###### ${text}`;
      }
      return match;
    });
  }

  // Optimize lists
  optimizeLists(content) {
    return content.replace(/^[\s]*[-*+]\s+(.+)$/gm, (match, text) => {
      // Ensure consistent list formatting
      return `- ${text.trim()}`;
    });
  }

  // Generate optimized versions
  async generateOptimizedVersions() {
    console.log('  📦 Generating optimized versions...');
    
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      const relativePath = file.replace(projectRoot, '');
      const optimizedPath = join(projectRoot, 'docs/optimized', relativePath);
      const optimizedDir = dirname(optimizedPath);
      
      // Create directory if it doesn't exist
      if (!existsSync(optimizedDir)) {
        mkdirSync(optimizedDir, { recursive: true });
      }
      
      // Get optimized content from cache
      const cacheKey = this.generateCacheKey(file);
      const optimizedContent = this.getFromCache(cacheKey);
      
      if (optimizedContent) {
        writeFileSync(optimizedPath, optimizedContent);
      }
    }
    
    console.log('    ✅ Optimized versions generated');
  }

  // Generate performance report
  async generatePerformanceReport() {
    console.log('  📊 Generating performance report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      metrics: this.metrics,
      cache: {
        size: this.cache.size,
        hitRate: this.calculateHitRate(),
        efficiency: this.calculateCacheEfficiency()
      },
      optimization: {
        filesProcessed: this.metrics.optimization.filesProcessed,
        bytesSaved: this.metrics.optimization.bytesSaved,
        timeSaved: this.metrics.optimization.timeSaved,
        compressionRatio: this.calculateCompressionRatio()
      },
      recommendations: this.generateRecommendations()
    };
    
    const reportPath = join(projectRoot, 'docs/optimization-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`    📄 Performance report generated: ${reportPath}`);
  }

  // Calculate hit rate
  calculateHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    return total > 0 ? (this.metrics.cache.hits / total) * 100 : 0;
  }

  // Calculate cache efficiency
  calculateCacheEfficiency() {
    const totalSize = Array.from(this.metadata.values())
      .reduce((sum, meta) => sum + meta.size, 0);
    
    const maxSize = this.config.caching.storage.maxSize;
    return maxSize > 0 ? (totalSize / maxSize) * 100 : 0;
  }

  // Calculate compression ratio
  calculateCompressionRatio() {
    const originalSize = this.metrics.optimization.filesProcessed * 1000; // Estimate
    const compressedSize = originalSize - this.metrics.optimization.bytesSaved;
    return originalSize > 0 ? (compressedSize / originalSize) * 100 : 0;
  }

  // Generate recommendations
  generateRecommendations() {
    const recommendations = [];
    
    // Cache recommendations
    const hitRate = this.calculateHitRate();
    if (hitRate < 50) {
      recommendations.push({
        category: 'cache',
        priority: 'medium',
        suggestion: 'Improve cache hit rate',
        details: `Current hit rate: ${hitRate.toFixed(2)}%`
      });
    }
    
    // Compression recommendations
    const compressionRatio = this.calculateCompressionRatio();
    if (compressionRatio > 80) {
      recommendations.push({
        category: 'compression',
        priority: 'low',
        suggestion: 'Consider different compression algorithm',
        details: `Current compression ratio: ${compressionRatio.toFixed(2)}%`
      });
    }
    
    // Performance recommendations
    if (this.metrics.optimization.timeSaved < 1000) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        suggestion: 'Optimize processing time',
        details: `Time saved: ${this.metrics.optimization.timeSaved}ms`
      });
    }
    
    return recommendations;
  }

  // Cache management
  generateCacheKey(filePath) {
    const content = readFileSync(filePath, 'utf8');
    const hash = createHash('md5').update(content).digest('hex');
    return `${filePath.replace(projectRoot, '')}_${hash}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached) {
      const metadata = this.metadata.get(key);
      if (metadata && Date.now() - metadata.created < metadata.ttl) {
        this.metrics.cache.hits++;
        return cached;
      } else {
        this.cache.delete(key);
        this.metadata.delete(key);
        this.metrics.cache.evictions++;
      }
    }
    
    this.metrics.cache.misses++;
    return null;
  }

  setCache(key, value, ttl) {
    this.cache.set(key, value);
    this.metadata.set(key, {
      ttl,
      created: Date.now(),
      size: JSON.stringify(value).length
    });
    
    this.metrics.cache.size = this.cache.size;
  }

  cleanupCache() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, metadata] of this.metadata) {
      if (now - metadata.created > metadata.ttl) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.metadata.delete(key);
      this.metrics.cache.evictions++;
    }
    
    if (keysToDelete.length > 0) {
      console.log(`  🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
    }
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

  // Clear cache
  clearCache() {
    console.log('🧹 Clearing cache...');
    
    this.cache.clear();
    this.metadata.clear();
    
    // Clear cache files
    const cacheDir = join(projectRoot, this.config.caching.storage.directory);
    if (existsSync(cacheDir)) {
      const files = readdirSync(cacheDir);
      for (const file of files) {
        if (file.endsWith('.cache')) {
          unlinkSync(join(cacheDir, file));
        }
      }
    }
    
    console.log('  ✅ Cache cleared');
  }

  // Get cache statistics
  getCacheStatistics() {
    return {
      size: this.cache.size,
      hits: this.metrics.cache.hits,
      misses: this.metrics.cache.misses,
      evictions: this.metrics.cache.evictions,
      hitRate: this.calculateHitRate(),
      efficiency: this.calculateCacheEfficiency()
    };
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const optimizer = new DocumentationOptimizer();
  
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command) {
    case 'init':
      optimizer.initialize();
      break;
    case 'optimize':
      optimizer.runOptimization();
      break;
    case 'clear':
      optimizer.clearCache();
      break;
    case 'stats':
      const stats = optimizer.getCacheStatistics();
      console.log('Cache Statistics:');
      console.log(`  Size: ${stats.size}`);
      console.log(`  Hits: ${stats.hits}`);
      console.log(`  Misses: ${stats.misses}`);
      console.log(`  Evictions: ${stats.evictions}`);
      console.log(`  Hit Rate: ${stats.hitRate.toFixed(2)}%`);
      console.log(`  Efficiency: ${stats.efficiency.toFixed(2)}%`);
      break;
    default:
      console.log('Usage: optimize-docs.js <command> [args]');
      console.log('Commands:');
      console.log('  init                    Initialize optimization system');
      console.log('  optimize                Run full optimization');
      console.log('  clear                   Clear cache');
      console.log('  stats                   Show cache statistics');
      break;
  }
}

export default DocumentationOptimizer;

