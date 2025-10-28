#!/usr/bin/env node

/**
 * Automated Content Update Scripts
 * 
 * Scripts for automated content updates including version numbers, dependency lists, and more
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Content update configuration
const UPDATE_CONFIG = {
  version: {
    files: ['package.json', 'README.md', 'TECHNICAL_SPECIFICATION.md'],
    patterns: [
      /"version":\s*"[^"]+"/g,
      /version:\s*[0-9]+\.[0-9]+\.[0-9]+/g,
      /v[0-9]+\.[0-9]+\.[0-9]+/g
    ]
  },
  dependencies: {
    files: ['package.json', 'README.md', 'DEVELOPMENT.md'],
    patterns: [
      /"dependencies":\s*\{[^}]+\}/g,
      /"devDependencies":\s*\{[^}]+\}/g
    ]
  },
  dates: {
    files: ['README.md', 'TECHNICAL_SPECIFICATION.md', 'docs/**/*.md'],
    patterns: [
      /Last updated:\s*[0-9]{4}-[0-9]{2}-[0-9]{2}/g,
      /Updated:\s*[0-9]{4}-[0-9]{2}-[0-9]{2}/g
    ]
  },
  links: {
    files: ['README.md', 'docs/**/*.md'],
    patterns: [
      /\[([^\]]+)\]\(([^)]+)\)/g
    ]
  }
};

// Content update class
class ContentUpdater {
  constructor(config = UPDATE_CONFIG) {
    this.config = config;
    this.updates = [];
  }

  // Update version numbers
  updateVersions(newVersion) {
    console.log(`🔄 Updating version numbers to ${newVersion}...`);
    
    for (const file of this.config.version.files) {
      this.updateFileVersion(file, newVersion);
    }
    
    // Update package.json version
    this.updatePackageVersion(newVersion);
    
    console.log('✅ Version numbers updated');
  }

  updateFileVersion(filePath, newVersion) {
    try {
      const fullPath = join(projectRoot, filePath);
      if (!statSync(fullPath)) return;
      
      let content = readFileSync(fullPath, 'utf8');
      let updated = false;
      
      for (const pattern of this.config.version.patterns) {
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches) {
            const newMatch = match.replace(/[0-9]+\.[0-9]+\.[0-9]+/g, newVersion);
            content = content.replace(match, newMatch);
            updated = true;
          }
        }
      }
      
      if (updated) {
        writeFileSync(fullPath, content);
        this.updates.push({ file: filePath, type: 'version', version: newVersion });
        console.log(`  📝 Updated ${filePath}`);
      }
    } catch (error) {
      console.warn(`  ⚠️  Could not update ${filePath}: ${error.message}`);
    }
  }

  updatePackageVersion(newVersion) {
    try {
      const packagePath = join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      packageJson.version = newVersion;
      
      writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
      this.updates.push({ file: 'package.json', type: 'version', version: newVersion });
      console.log(`  📝 Updated package.json version to ${newVersion}`);
    } catch (error) {
      console.warn(`  ⚠️  Could not update package.json: ${error.message}`);
    }
  }

  // Update dependency lists
  updateDependencies() {
    console.log('🔄 Updating dependency lists...');
    
    try {
      // Get current dependencies
      const packagePath = join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      const dependencies = packageJson.dependencies || {};
      const devDependencies = packageJson.devDependencies || {};
      
      // Update dependency documentation
      this.updateDependencyDocs(dependencies, devDependencies);
      
      console.log('✅ Dependency lists updated');
    } catch (error) {
      console.warn(`⚠️  Could not update dependencies: ${error.message}`);
    }
  }

  updateDependencyDocs(dependencies, devDependencies) {
    const docsFiles = ['README.md', 'DEVELOPMENT.md', 'TECHNICAL_SPECIFICATION.md'];
    
    for (const file of docsFiles) {
      try {
        const fullPath = join(projectRoot, file);
        if (!statSync(fullPath)) continue;
        
        let content = readFileSync(fullPath, 'utf8');
        let updated = false;
        
        // Update dependencies section
        if (content.includes('## Dependencies') || content.includes('### Dependencies')) {
          const depsSection = this.generateDependenciesSection(dependencies, devDependencies);
          content = content.replace(
            /## Dependencies[\s\S]*?(?=##|$)/g,
            depsSection
          );
          updated = true;
        }
        
        if (updated) {
          writeFileSync(fullPath, content);
          this.updates.push({ file, type: 'dependencies' });
          console.log(`  📝 Updated ${file}`);
        }
      } catch (error) {
        console.warn(`  ⚠️  Could not update ${file}: ${error.message}`);
      }
    }
  }

  generateDependenciesSection(dependencies, devDependencies) {
    let section = '## Dependencies\n\n';
    
    if (Object.keys(dependencies).length > 0) {
      section += '### Production Dependencies\n\n';
      for (const [name, version] of Object.entries(dependencies)) {
        section += `- **${name}**: ${version}\n`;
      }
      section += '\n';
    }
    
    if (Object.keys(devDependencies).length > 0) {
      section += '### Development Dependencies\n\n';
      for (const [name, version] of Object.entries(devDependencies)) {
        section += `- **${name}**: ${version}\n`;
      }
      section += '\n';
    }
    
    return section;
  }

  // Update dates
  updateDates() {
    console.log('🔄 Updating dates...');
    
    const currentDate = new Date().toISOString().split('T')[0];
    
    for (const file of this.config.dates.files) {
      this.updateFileDates(file, currentDate);
    }
    
    console.log('✅ Dates updated');
  }

  updateFileDates(filePath, currentDate) {
    try {
      const fullPath = join(projectRoot, filePath);
      if (!statSync(fullPath)) return;
      
      let content = readFileSync(fullPath, 'utf8');
      let updated = false;
      
      for (const pattern of this.config.dates.patterns) {
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches) {
            const newMatch = match.replace(/[0-9]{4}-[0-9]{2}-[0-9]{2}/g, currentDate);
            content = content.replace(match, newMatch);
            updated = true;
          }
        }
      }
      
      if (updated) {
        writeFileSync(fullPath, content);
        this.updates.push({ file: filePath, type: 'date', date: currentDate });
        console.log(`  📝 Updated ${filePath}`);
      }
    } catch (error) {
      console.warn(`  ⚠️  Could not update ${filePath}: ${error.message}`);
    }
  }

  // Update links
  updateLinks() {
    console.log('🔄 Updating links...');
    
    for (const file of this.config.links.files) {
      this.updateFileLinks(file);
    }
    
    console.log('✅ Links updated');
  }

  updateFileLinks(filePath) {
    try {
      const fullPath = join(projectRoot, filePath);
      if (!statSync(fullPath)) return;
      
      let content = readFileSync(fullPath, 'utf8');
      let updated = false;
      
      // Update relative links to use proper paths
      const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      
      while ((match = linkPattern.exec(content)) !== null) {
        const [, linkText, linkUrl] = match;
        
        // Skip external links
        if (linkUrl.startsWith('http') || linkUrl.startsWith('mailto:')) {
          continue;
        }
        
        // Update relative links
        if (linkUrl.startsWith('./') || linkUrl.startsWith('../')) {
          const newUrl = this.normalizeLinkPath(filePath, linkUrl);
          if (newUrl !== linkUrl) {
            content = content.replace(match[0], `[${linkText}](${newUrl})`);
            updated = true;
          }
        }
      }
      
      if (updated) {
        writeFileSync(fullPath, content);
        this.updates.push({ file: filePath, type: 'links' });
        console.log(`  📝 Updated ${filePath}`);
      }
    } catch (error) {
      console.warn(`  ⚠️  Could not update ${filePath}: ${error.message}`);
    }
  }

  normalizeLinkPath(filePath, linkUrl) {
    // Simple link normalization - can be enhanced
    if (linkUrl.startsWith('./')) {
      return linkUrl.substring(2);
    }
    if (linkUrl.startsWith('../')) {
      return linkUrl;
    }
    return linkUrl;
  }

  // Update all content
  updateAll(newVersion) {
    console.log('🚀 Starting comprehensive content update...');
    
    if (newVersion) {
      this.updateVersions(newVersion);
    }
    
    this.updateDependencies();
    this.updateDates();
    this.updateLinks();
    
    this.generateReport();
    console.log('✅ Content update complete!');
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      updates: this.updates,
      summary: {
        total: this.updates.length,
        byType: this.updates.reduce((acc, update) => {
          acc[update.type] = (acc[update.type] || 0) + 1;
          return acc;
        }, {})
      }
    };
    
    const reportPath = join(projectRoot, 'content-update-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('');
    console.log('📊 Content Update Report:');
    console.log(`   Total updates: ${report.summary.total}`);
    for (const [type, count] of Object.entries(report.summary.byType)) {
      console.log(`   ${type}: ${count}`);
    }
    console.log(`   Report saved: ${reportPath}`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const updater = new ContentUpdater();
  const version = process.argv[2];
  
  if (version) {
    updater.updateAll(version);
  } else {
    updater.updateAll();
  }
}

export default ContentUpdater;

