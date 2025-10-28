#!/usr/bin/env node

/**
 * Documentation Deployment Pipeline
 * 
 * Automated deployment of documentation to various platforms
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Deployment configuration
const DEPLOY_CONFIG = {
  platforms: {
    githubPages: {
      enabled: true,
      branch: 'gh-pages',
      directory: 'docs-site',
      domain: null // Custom domain if configured
    },
    netlify: {
      enabled: false,
      siteId: process.env.NETLIFY_SITE_ID,
      accessToken: process.env.NETLIFY_ACCESS_TOKEN,
      directory: 'docs-site'
    },
    vercel: {
      enabled: false,
      projectId: process.env.VERCEL_PROJECT_ID,
      token: process.env.VERCEL_TOKEN,
      directory: 'docs-site'
    }
  },
  build: {
    output: 'docs-site',
    clean: true,
    optimize: true,
    minify: true
  },
  content: {
    include: [
      'README.md',
      'TECHNICAL_SPECIFICATION.md',
      'ARCHITECTURE.md',
      'DEVELOPMENT.md',
      'docs/**/*.md'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.git/**',
      'tests/**',
      'scripts/**'
    ]
  }
};

// Deployment class
class DocumentationDeployer {
  constructor(config = DEPLOY_CONFIG) {
    this.config = config;
    this.deploymentLog = [];
    this.startTime = Date.now();
  }

  // Run full deployment pipeline
  async deploy() {
    console.log('🚀 Starting documentation deployment...');
    
    try {
      // Pre-deployment checks
      await this.preDeploymentChecks();
      
      // Build documentation site
      await this.buildDocumentationSite();
      
      // Deploy to platforms
      await this.deployToPlatforms();
      
      // Post-deployment tasks
      await this.postDeploymentTasks();
      
      console.log('✅ Documentation deployment completed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      this.logError('Deployment failed', error);
      return false;
    }
  }

  // Pre-deployment checks
  async preDeploymentChecks() {
    console.log('  🔍 Running pre-deployment checks...');
    
    // Check if we're in a git repository
    try {
      execSync('git status', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error('Not in a git repository');
    }
    
    // Check if documentation is up to date
    try {
      execSync('npm run docs:validate', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error('Documentation validation failed');
    }
    
    // Check if build is successful
    try {
      execSync('npm run build', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error('Project build failed');
    }
    
    console.log('    ✅ Pre-deployment checks passed');
  }

  // Build documentation site
  async buildDocumentationSite() {
    console.log('  🏗️  Building documentation site...');
    
    const outputDir = join(projectRoot, this.config.build.output);
    
    // Clean output directory
    if (this.config.build.clean && existsSync(outputDir)) {
      execSync(`rm -rf ${outputDir}`, { cwd: projectRoot });
    }
    
    // Create output directory
    mkdirSync(outputDir, { recursive: true });
    
    // Copy documentation files
    await this.copyDocumentationFiles(outputDir);
    
    // Generate site structure
    await this.generateSiteStructure(outputDir);
    
    // Optimize content
    if (this.config.build.optimize) {
      await this.optimizeContent(outputDir);
    }
    
    // Generate index page
    await this.generateIndexPage(outputDir);
    
    // Generate sitemap
    await this.generateSitemap(outputDir);
    
    console.log('    ✅ Documentation site built');
  }

  // Copy documentation files
  async copyDocumentationFiles(outputDir) {
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      const relativePath = file.replace(projectRoot, '');
      const outputPath = join(outputDir, relativePath);
      const outputDirPath = dirname(outputPath);
      
      // Create directory if it doesn't exist
      mkdirSync(outputDirPath, { recursive: true });
      
      // Copy file
      copyFileSync(file, outputPath);
      
      this.logInfo(`Copied ${relativePath}`);
    }
  }

  // Generate site structure
  async generateSiteStructure(outputDir) {
    // Create navigation structure
    const navigation = this.generateNavigation();
    writeFileSync(join(outputDir, 'navigation.json'), JSON.stringify(navigation, null, 2));
    
    // Create search index
    const searchIndex = this.generateSearchIndex(outputDir);
    writeFileSync(join(outputDir, 'search-index.json'), JSON.stringify(searchIndex, null, 2));
    
    // Create metadata
    const metadata = this.generateMetadata();
    writeFileSync(join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  }

  // Generate navigation
  generateNavigation() {
    return {
      main: [
        { title: 'Home', url: '/README.html' },
        { title: 'Technical Specification', url: '/TECHNICAL_SPECIFICATION.html' },
        { title: 'Architecture', url: '/ARCHITECTURE.html' },
        { title: 'Development', url: '/DEVELOPMENT.html' },
        { title: 'API Reference', url: '/docs/API_REFERENCE.html' },
        { title: 'Configuration', url: '/docs/CONFIGURATION.html' }
      ],
      docs: [
        { title: 'AI Module', url: '/docs/ai-module.html' },
        { title: 'Commands Module', url: '/docs/commands-module.html' },
        { title: 'Config Module', url: '/docs/config-module.html' },
        { title: 'Auth Module', url: '/docs/auth-module.html' },
        { title: 'Terminal Module', url: '/docs/terminal-module.html' },
        { title: 'Errors Module', url: '/docs/errors-module.html' },
        { title: 'Utils Module', url: '/docs/utils-module.html' },
        { title: 'FS Module', url: '/docs/fs-module.html' },
        { title: 'Telemetry Module', url: '/docs/telemetry-module.html' }
      ]
    };
  }

  // Generate search index
  generateSearchIndex(outputDir) {
    const files = this.getDocumentationFiles();
    const index = [];
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      const relativePath = file.replace(projectRoot, '');
      
      // Extract headings
      const headings = content.match(/^#+\s+(.+)$/gm) || [];
      
      // Extract code blocks
      const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
      
      // Extract links
      const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
      
      index.push({
        file: relativePath,
        title: headings[0]?.replace(/^#+\s+/, '') || 'Untitled',
        headings: headings.map(h => h.replace(/^#+\s+/, '')),
        codeBlocks: codeBlocks.length,
        links: links.length,
        content: content.substring(0, 1000) // First 1000 characters
      });
    }
    
    return index;
  }

  // Generate metadata
  generateMetadata() {
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    
    return {
      title: packageJson.name,
      description: packageJson.description,
      version: packageJson.version,
      lastUpdated: new Date().toISOString(),
      buildTime: this.startTime,
      platform: process.platform,
      nodeVersion: process.version
    };
  }

  // Optimize content
  async optimizeContent(outputDir) {
    console.log('    🔧 Optimizing content...');
    
    const files = this.getMarkdownFiles(outputDir);
    
    for (const file of files) {
      let content = readFileSync(file, 'utf8');
      
      // Remove unnecessary whitespace
      content = content.replace(/\n{3,}/g, '\n\n');
      
      // Optimize links
      content = this.optimizeLinks(content);
      
      // Optimize images
      content = this.optimizeImages(content);
      
      writeFileSync(file, content);
    }
  }

  // Optimize links
  optimizeLinks(content) {
    // Convert relative links to absolute
    return content.replace(/\[([^\]]+)\]\(\.\/([^)]+)\)/g, '[$1]($2)');
  }

  // Optimize images
  optimizeImages(content) {
    // Add alt text to images without it
    return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      if (!alt) {
        return `![Image](${src})`;
      }
      return match;
    });
  }

  // Generate index page
  async generateIndexPage(outputDir) {
    const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ollama Code Documentation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .nav { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .nav-section { background: #f8f9fa; padding: 20px; border-radius: 8px; }
        .nav-section h3 { margin-top: 0; color: #333; }
        .nav-section ul { list-style: none; padding: 0; }
        .nav-section li { margin: 10px 0; }
        .nav-section a { text-decoration: none; color: #0066cc; }
        .nav-section a:hover { text-decoration: underline; }
        .footer { text-align: center; margin-top: 40px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Ollama Code Documentation</h1>
            <p>Comprehensive documentation for the Ollama Code CLI tool</p>
        </div>
        
        <div class="nav">
            <div class="nav-section">
                <h3>Getting Started</h3>
                <ul>
                    <li><a href="README.html">README</a> - Project overview and quick start</li>
                    <li><a href="TECHNICAL_SPECIFICATION.html">Technical Specification</a> - Detailed technical overview</li>
                    <li><a href="ARCHITECTURE.html">Architecture</a> - System design and components</li>
                    <li><a href="DEVELOPMENT.html">Development</a> - Setup and contribution guide</li>
                </ul>
            </div>
            
            <div class="nav-section">
                <h3>API Reference</h3>
                <ul>
                    <li><a href="docs/API_REFERENCE.html">API Reference</a> - Complete API documentation</li>
                    <li><a href="docs/CONFIGURATION.html">Configuration</a> - Configuration options</li>
                    <li><a href="docs/COMMAND_REFERENCE.html">Command Reference</a> - CLI commands</li>
                </ul>
            </div>
            
            <div class="nav-section">
                <h3>Modules</h3>
                <ul>
                    <li><a href="docs/ai-module.html">AI Module</a> - AI integration</li>
                    <li><a href="docs/commands-module.html">Commands Module</a> - Command system</li>
                    <li><a href="docs/config-module.html">Config Module</a> - Configuration management</li>
                    <li><a href="docs/auth-module.html">Auth Module</a> - Authentication</li>
                    <li><a href="docs/terminal-module.html">Terminal Module</a> - UI components</li>
                    <li><a href="docs/errors-module.html">Errors Module</a> - Error handling</li>
                    <li><a href="docs/utils-module.html">Utils Module</a> - Utilities</li>
                    <li><a href="docs/fs-module.html">FS Module</a> - File operations</li>
                    <li><a href="docs/telemetry-module.html">Telemetry Module</a> - Analytics</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p>Last updated: ${new Date().toLocaleDateString()}</p>
        </div>
    </div>
</body>
</html>`;
    
    writeFileSync(join(outputDir, 'index.html'), indexContent);
  }

  // Generate sitemap
  async generateSitemap(outputDir) {
    const files = this.getDocumentationFiles();
    const baseUrl = this.config.platforms.githubPages.domain || 'https://erichchampion.github.io/ollama-code';
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${files.map(file => {
  const relativePath = file.replace(projectRoot, '').replace(/\.md$/, '.html');
  return `    <url>
        <loc>${baseUrl}${relativePath}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
}).join('\n')}
</urlset>`;
    
    writeFileSync(join(outputDir, 'sitemap.xml'), sitemap);
  }

  // Deploy to platforms
  async deployToPlatforms() {
    console.log('  🚀 Deploying to platforms...');
    
    // Deploy to GitHub Pages
    if (this.config.platforms.githubPages.enabled) {
      await this.deployToGitHubPages();
    }
    
    // Deploy to Netlify
    if (this.config.platforms.netlify.enabled) {
      await this.deployToNetlify();
    }
    
    // Deploy to Vercel
    if (this.config.platforms.vercel.enabled) {
      await this.deployToVercel();
    }
  }

  // Deploy to GitHub Pages
  async deployToGitHubPages() {
    console.log('    📄 Deploying to GitHub Pages...');
    
    try {
      const outputDir = join(projectRoot, this.config.build.output);
      const branch = this.config.platforms.githubPages.branch;
      
      // Create or switch to gh-pages branch
      try {
        execSync(`git checkout ${branch}`, { cwd: projectRoot, stdio: 'pipe' });
      } catch (error) {
        execSync(`git checkout -b ${branch}`, { cwd: projectRoot, stdio: 'pipe' });
      }
      
      // Copy files to root
      execSync(`cp -r ${outputDir}/* .`, { cwd: projectRoot });
      
      // Add and commit
      execSync('git add .', { cwd: projectRoot });
      execSync('git commit -m "Update documentation"', { cwd: projectRoot });
      
      // Push to origin
      execSync(`git push origin ${branch}`, { cwd: projectRoot });
      
      // Switch back to main branch
      execSync('git checkout main', { cwd: projectRoot });
      
      this.logInfo('Deployed to GitHub Pages');
      
    } catch (error) {
      throw new Error(`GitHub Pages deployment failed: ${error.message}`);
    }
  }

  // Deploy to Netlify
  async deployToNetlify() {
    console.log('    🌐 Deploying to Netlify...');
    
    try {
      const outputDir = join(projectRoot, this.config.build.output);
      
      // Install Netlify CLI if not available
      try {
        execSync('netlify --version', { stdio: 'pipe' });
      } catch (error) {
        execSync('npm install -g netlify-cli', { stdio: 'pipe' });
      }
      
      // Deploy
      execSync(`netlify deploy --dir=${outputDir} --prod`, { 
        cwd: projectRoot,
        env: { ...process.env, NETLIFY_AUTH_TOKEN: this.config.platforms.netlify.accessToken }
      });
      
      this.logInfo('Deployed to Netlify');
      
    } catch (error) {
      throw new Error(`Netlify deployment failed: ${error.message}`);
    }
  }

  // Deploy to Vercel
  async deployToVercel() {
    console.log('    ⚡ Deploying to Vercel...');
    
    try {
      const outputDir = join(projectRoot, this.config.build.output);
      
      // Install Vercel CLI if not available
      try {
        execSync('vercel --version', { stdio: 'pipe' });
      } catch (error) {
        execSync('npm install -g vercel', { stdio: 'pipe' });
      }
      
      // Deploy
      execSync(`vercel --cwd=${outputDir} --prod`, { 
        cwd: projectRoot,
        env: { ...process.env, VERCEL_TOKEN: this.config.platforms.vercel.token }
      });
      
      this.logInfo('Deployed to Vercel');
      
    } catch (error) {
      throw new Error(`Vercel deployment failed: ${error.message}`);
    }
  }

  // Post-deployment tasks
  async postDeploymentTasks() {
    console.log('  🔧 Running post-deployment tasks...');
    
    // Generate deployment report
    await this.generateDeploymentReport();
    
    // Send notifications
    await this.sendNotifications();
    
    console.log('    ✅ Post-deployment tasks completed');
  }

  // Generate deployment report
  async generateDeploymentReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      platforms: Object.keys(this.config.platforms).filter(p => this.config.platforms[p].enabled),
      files: this.getDocumentationFiles().length,
      log: this.deploymentLog
    };
    
    const reportPath = join(projectRoot, 'docs/deployment-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.logInfo(`Deployment report saved: ${reportPath}`);
  }

  // Send notifications
  async sendNotifications() {
    // This would integrate with notification services
    // For now, just log the completion
    this.logInfo('Deployment completed successfully');
  }

  // Get documentation files
  getDocumentationFiles() {
    const files = [];
    const getMarkdownFiles = (dir) => {
      try {
        const items = require('fs').readdirSync(dir);
        
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = require('fs').statSync(fullPath);
          
          if (stat.isDirectory() && !['node_modules', 'dist', '.git', this.config.build.output].includes(item)) {
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

  // Get markdown files in directory
  getMarkdownFiles(dir) {
    const files = [];
    const getMarkdownFiles = (dir) => {
      try {
        const items = require('fs').readdirSync(dir);
        
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = require('fs').statSync(fullPath);
          
          if (stat.isDirectory()) {
            getMarkdownFiles(fullPath);
          } else if (stat.isFile() && item.endsWith('.md')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };
    
    getMarkdownFiles(dir);
    return files;
  }

  // Log info
  logInfo(message) {
    this.deploymentLog.push({ level: 'info', message, timestamp: new Date().toISOString() });
    console.log(`    ℹ️  ${message}`);
  }

  // Log error
  logError(message, error) {
    this.deploymentLog.push({ level: 'error', message, error: error.message, timestamp: new Date().toISOString() });
    console.error(`    ❌ ${message}: ${error.message}`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const deployer = new DocumentationDeployer();
  deployer.deploy().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export default DocumentationDeployer;

