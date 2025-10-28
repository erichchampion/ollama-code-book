/**
 * Performance Tests for Documentation Site Generation and Loading Times
 * 
 * Comprehensive tests for documentation performance, generation speed, and loading times
 */

const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');
const { readFileSync, readdirSync, statSync, writeFileSync, unlinkSync } = require('fs');
const { join, extname } = require('path');
const { execSync } = require('child_process');

const projectRoot = join(__dirname, '..', '..');

describe('Documentation Performance Tests', () => {
  let startTime;
  let endTime;
  let generationTime;
  let validationTime;
  let linkCheckTime;
  let lintTime;
  
  beforeAll(() => {
    startTime = Date.now();
  });
  
  afterAll(() => {
    endTime = Date.now();
    const totalTime = endTime - startTime;
    console.log(`Total test execution time: ${totalTime}ms`);
  });
  
  test('should generate documentation within acceptable time', async () => {
    const start = Date.now();
    
    try {
      execSync('npm run docs:generate', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      generationTime = Date.now() - start;
      
      // Should complete within 30 seconds
      expect(generationTime).toBeLessThan(30000);
      
      console.log(`Documentation generation time: ${generationTime}ms`);
    } catch (error) {
      fail(`Documentation generation failed: ${error.message}`);
    }
  });
  
  test('should validate documentation within acceptable time', async () => {
    const start = Date.now();
    
    try {
      execSync('npm run docs:validate', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      validationTime = Date.now() - start;
      
      // Should complete within 10 seconds
      expect(validationTime).toBeLessThan(10000);
      
      console.log(`Documentation validation time: ${validationTime}ms`);
    } catch (error) {
      fail(`Documentation validation failed: ${error.message}`);
    }
  });
  
  test('should check links within acceptable time', async () => {
    const start = Date.now();
    
    try {
      execSync('npm run docs:check-links', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      linkCheckTime = Date.now() - start;
      
      // Should complete within 20 seconds
      expect(linkCheckTime).toBeLessThan(20000);
      
      console.log(`Link checking time: ${linkCheckTime}ms`);
    } catch (error) {
      fail(`Link checking failed: ${error.message}`);
    }
  });
  
  test('should lint documentation within acceptable time', async () => {
    const start = Date.now();
    
    try {
      execSync('npm run docs:lint', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      lintTime = Date.now() - start;
      
      // Should complete within 5 seconds
      expect(lintTime).toBeLessThan(5000);
      
      console.log(`Markdown linting time: ${lintTime}ms`);
    } catch (error) {
      fail(`Markdown linting failed: ${error.message}`);
    }
  });
  
  test('should run all documentation checks within acceptable time', async () => {
    const start = Date.now();
    
    try {
      execSync('npm run docs:check-all', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      const totalCheckTime = Date.now() - start;
      
      // Should complete within 60 seconds
      expect(totalCheckTime).toBeLessThan(60000);
      
      console.log(`Total documentation check time: ${totalCheckTime}ms`);
    } catch (error) {
      fail(`Documentation checks failed: ${error.message}`);
    }
  });
  
  test('should maintain documentation within acceptable time', async () => {
    const start = Date.now();
    
    try {
      execSync('npm run docs:maintain', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      const maintenanceTime = Date.now() - start;
      
      // Should complete within 15 seconds
      expect(maintenanceTime).toBeLessThan(15000);
      
      console.log(`Documentation maintenance time: ${maintenanceTime}ms`);
    } catch (error) {
      fail(`Documentation maintenance failed: ${error.message}`);
    }
  });
  
  test('should update documentation within acceptable time', async () => {
    const start = Date.now();
    
    try {
      execSync('npm run docs:update', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      const updateTime = Date.now() - start;
      
      // Should complete within 20 seconds
      expect(updateTime).toBeLessThan(20000);
      
      console.log(`Documentation update time: ${updateTime}ms`);
    } catch (error) {
      fail(`Documentation update failed: ${error.message}`);
    }
  });
  
  test('should generate README within acceptable time', async () => {
    const start = Date.now();
    
    try {
      execSync('npm run docs:generate-readme', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      const readmeTime = Date.now() - start;
      
      // Should complete within 10 seconds
      expect(readmeTime).toBeLessThan(10000);
      
      console.log(`README generation time: ${readmeTime}ms`);
    } catch (error) {
      fail(`README generation failed: ${error.message}`);
    }
  });
  
  test('should have reasonable file sizes', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const stats = statSync(filePath);
        
        // File should not be too large (under 1MB)
        expect(stats.size).toBeLessThan(1024 * 1024);
        
        // File should have reasonable size (at least 1KB)
        expect(stats.size).toBeGreaterThan(1024);
        
        console.log(`${file}: ${stats.size} bytes`);
      }
    }
  });
  
  test('should have reasonable line counts', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, 'utf8');
        const lineCount = content.split('\n').length;
        
        // File should not be too long (under 1000 lines)
        expect(lineCount).toBeLessThan(1000);
        
        // File should have reasonable content (at least 50 lines)
        expect(lineCount).toBeGreaterThan(50);
        
        console.log(`${file}: ${lineCount} lines`);
      }
    }
  });
  
  test('should have reasonable word counts', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, 'utf8');
        const wordCount = content.split(/\s+/).length;
        
        // File should not be too long (under 10000 words)
        expect(wordCount).toBeLessThan(10000);
        
        // File should have reasonable content (at least 100 words)
        expect(wordCount).toBeGreaterThan(100);
        
        console.log(`${file}: ${wordCount} words`);
      }
    }
  });
  
  test('should have reasonable code block counts', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, 'utf8');
        
        // Count code blocks
        const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
        const codeBlocks = content.match(codeBlockPattern) || [];
        
        // Should have reasonable number of code blocks (at least 5, under 50)
        expect(codeBlocks.length).toBeGreaterThan(5);
        expect(codeBlocks.length).toBeLessThan(50);
        
        console.log(`${file}: ${codeBlocks.length} code blocks`);
      }
    }
  });
  
  test('should have reasonable link counts', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, 'utf8');
        
        // Count links
        const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
        const links = content.match(linkPattern) || [];
        
        // Should have reasonable number of links (at least 5, under 100)
        expect(links.length).toBeGreaterThan(5);
        expect(links.length).toBeLessThan(100);
        
        console.log(`${file}: ${links.length} links`);
      }
    }
  });
  
  test('should have reasonable header counts', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, 'utf8');
        
        // Count headers
        const headerPattern = /^#{1,6} .+$/gm;
        const headers = content.match(headerPattern) || [];
        
        // Should have reasonable number of headers (at least 5, under 50)
        expect(headers.length).toBeGreaterThan(5);
        expect(headers.length).toBeLessThan(50);
        
        console.log(`${file}: ${headers.length} headers`);
      }
    }
  });
  
  test('should have reasonable table counts', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, 'utf8');
        
        // Count tables
        const tablePattern = /^\|.*\|$/gm;
        const tables = content.match(tablePattern) || [];
        
        // Should have reasonable number of table rows (at least 0, under 100)
        expect(tables.length).toBeGreaterThan(0);
        expect(tables.length).toBeLessThan(100);
        
        console.log(`${file}: ${tables.length} table rows`);
      }
    }
  });
  
  test('should have reasonable list counts', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, 'utf8');
        
        // Count list items
        const listPattern = /^[\s]*[-*+]\s+.+$/gm;
        const listItems = content.match(listPattern) || [];
        
        // Should have reasonable number of list items (at least 5, under 200)
        expect(listItems.length).toBeGreaterThan(5);
        expect(listItems.length).toBeLessThan(200);
        
        console.log(`${file}: ${listItems.length} list items`);
      }
    }
  });
  
  test('should have reasonable image counts', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const content = readFileSync(filePath, 'utf8');
        
        // Count images
        const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
        const images = content.match(imagePattern) || [];
        
        // Should have reasonable number of images (at least 0, under 20)
        expect(images.length).toBeGreaterThan(0);
        expect(images.length).toBeLessThan(20);
        
        console.log(`${file}: ${images.length} images`);
      }
    }
  });
  
  test('should have reasonable performance characteristics', async () => {
    // Test multiple runs to check consistency
    const runs = 3;
    const times = [];
    
    for (let i = 0; i < runs; i++) {
      const start = Date.now();
      
      try {
        execSync('npm run docs:generate', { 
          cwd: projectRoot, 
          stdio: 'pipe' 
        });
        
        times.push(Date.now() - start);
      } catch (error) {
        fail(`Documentation generation failed on run ${i + 1}: ${error.message}`);
      }
    }
    
    // Calculate statistics
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const variance = times.reduce((acc, time) => acc + Math.pow(time - avgTime, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    
    console.log(`Performance statistics (${runs} runs):`);
    console.log(`  Average time: ${avgTime.toFixed(2)}ms`);
    console.log(`  Min time: ${minTime}ms`);
    console.log(`  Max time: ${maxTime}ms`);
    console.log(`  Standard deviation: ${stdDev.toFixed(2)}ms`);
    
    // Should have reasonable performance consistency
    expect(stdDev).toBeLessThan(avgTime * 0.5); // Standard deviation should be less than 50% of average
    
    // Should complete within reasonable time
    expect(avgTime).toBeLessThan(30000);
  });
  
  test('should have reasonable memory usage', async () => {
    const start = Date.now();
    
    try {
      // Run documentation generation and check memory usage
      const result = execSync('npm run docs:generate', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      const generationTime = Date.now() - start;
      
      // Should complete within reasonable time
      expect(generationTime).toBeLessThan(30000);
      
      // Check if we can read all generated files without memory issues
      const docsDir = join(projectRoot, 'docs');
      const files = readdirSync(docsDir);
      
      let totalSize = 0;
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = join(docsDir, file);
          const stats = statSync(filePath);
          totalSize += stats.size;
        }
      }
      
      // Total size should be reasonable (under 10MB)
      expect(totalSize).toBeLessThan(10 * 1024 * 1024);
      
      console.log(`Total documentation size: ${totalSize} bytes`);
    } catch (error) {
      fail(`Documentation generation failed: ${error.message}`);
    }
  });
  
  test('should have reasonable CPU usage', async () => {
    const start = Date.now();
    
    try {
      // Run documentation generation and check CPU usage
      execSync('npm run docs:generate', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      const generationTime = Date.now() - start;
      
      // Should complete within reasonable time
      expect(generationTime).toBeLessThan(30000);
      
      // Should not take too long (indicating high CPU usage)
      expect(generationTime).toBeLessThan(60000);
      
      console.log(`Documentation generation time: ${generationTime}ms`);
    } catch (error) {
      fail(`Documentation generation failed: ${error.message}`);
    }
  });
  
  test('should have reasonable disk usage', async () => {
    const docsDir = join(projectRoot, 'docs');
    const files = readdirSync(docsDir);
    
    let totalSize = 0;
    let fileCount = 0;
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(docsDir, file);
        const stats = statSync(filePath);
        totalSize += stats.size;
        fileCount++;
      }
    }
    
    // Should have reasonable number of files
    expect(fileCount).toBeGreaterThan(5);
    expect(fileCount).toBeLessThan(50);
    
    // Should have reasonable total size
    expect(totalSize).toBeGreaterThan(100 * 1024); // At least 100KB
    expect(totalSize).toBeLessThan(10 * 1024 * 1024); // Under 10MB
    
    // Should have reasonable average file size
    const avgSize = totalSize / fileCount;
    expect(avgSize).toBeGreaterThan(5 * 1024); // At least 5KB per file
    expect(avgSize).toBeLessThan(500 * 1024); // Under 500KB per file
    
    console.log(`Total documentation size: ${totalSize} bytes (${fileCount} files)`);
    console.log(`Average file size: ${avgSize.toFixed(2)} bytes`);
  });
});

