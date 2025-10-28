#!/usr/bin/env node

/**
 * Documentation Versioning and Change Tracking System
 * 
 * Comprehensive versioning system for documentation with change tracking
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Versioning configuration
const VERSION_CONFIG = {
  versioning: {
    scheme: 'semantic', // semantic, date, custom
    format: 'MAJOR.MINOR.PATCH',
    autoIncrement: true,
    tagPrefix: 'docs-v',
    branchPrefix: 'docs-'
  },
  tracking: {
    enabled: true,
    trackChanges: true,
    trackAuthors: true,
    trackTimestamps: true,
    trackDependencies: true
  },
  storage: {
    versionsDir: 'docs/versions',
    changesDir: 'docs/changes',
    archiveDir: 'docs/archive',
    backupDir: 'docs/backup'
  },
  git: {
    enabled: true,
    createTags: true,
    createBranches: true,
    commitMessage: 'docs: version {version}',
    tagMessage: 'Documentation version {version}'
  }
};

// Version information
const versionInfo = {
  current: null,
  previous: null,
  changes: [],
  authors: [],
  dependencies: [],
  metadata: {
    created: null,
    updated: null,
    size: 0,
    files: 0
  }
};

// Documentation versioning class
class DocumentationVersioner {
  constructor(config = VERSION_CONFIG) {
    this.config = config;
    this.versions = new Map();
    this.changes = [];
    this.authors = new Set();
  }

  // Initialize versioning system
  async initialize() {
    console.log('🔧 Initializing documentation versioning system...');
    
    try {
      // Create necessary directories
      await this.createDirectories();
      
      // Load existing versions
      await this.loadExistingVersions();
      
      // Initialize current version
      await this.initializeCurrentVersion();
      
      console.log('✅ Versioning system initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      return false;
    }
  }

  // Create necessary directories
  async createDirectories() {
    const dirs = [
      this.config.storage.versionsDir,
      this.config.storage.changesDir,
      this.config.storage.archiveDir,
      this.config.storage.backupDir
    ];
    
    for (const dir of dirs) {
      const fullPath = join(projectRoot, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
        console.log(`  📁 Created directory: ${dir}`);
      }
    }
  }

  // Load existing versions
  async loadExistingVersions() {
    const versionsDir = join(projectRoot, this.config.storage.versionsDir);
    
    if (existsSync(versionsDir)) {
      const files = readdirSync(versionsDir);
      const versionFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of versionFiles) {
        const versionPath = join(versionsDir, file);
        const versionData = JSON.parse(readFileSync(versionPath, 'utf8'));
        this.versions.set(versionData.version, versionData);
      }
    }
  }

  // Initialize current version
  async initializeCurrentVersion() {
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    const currentVersion = packageJson.version;
    
    versionInfo.current = currentVersion;
    versionInfo.metadata.created = new Date().toISOString();
    versionInfo.metadata.updated = new Date().toISOString();
    
    // Get file information
    const files = this.getDocumentationFiles();
    versionInfo.metadata.files = files.length;
    versionInfo.metadata.size = files.reduce((total, file) => {
      try {
        const stats = statSync(file);
        return total + stats.size;
      } catch (error) {
        return total;
      }
    }, 0);
    
    console.log(`  📋 Current version: ${currentVersion}`);
    console.log(`  📊 Files: ${versionInfo.metadata.files}, Size: ${this.formatBytes(versionInfo.metadata.size)}`);
  }

  // Create new version
  async createVersion(versionType = 'patch', message = '') {
    console.log(`🚀 Creating new documentation version (${versionType})...`);
    
    try {
      // Calculate new version
      const newVersion = this.calculateNewVersion(versionType);
      
      // Create backup
      await this.createBackup(newVersion);
      
      // Track changes
      await this.trackChanges(newVersion);
      
      // Create version record
      const versionRecord = await this.createVersionRecord(newVersion, message);
      
      // Save version
      await this.saveVersion(versionRecord);
      
      // Update package.json if needed
      await this.updatePackageVersion(newVersion);
      
      // Create git tag if enabled
      if (this.config.git.enabled && this.config.git.createTags) {
        await this.createGitTag(newVersion, message);
      }
      
      console.log(`✅ Version ${newVersion} created successfully`);
      return newVersion;
      
    } catch (error) {
      console.error('❌ Version creation failed:', error.message);
      return null;
    }
  }

  // Calculate new version
  calculateNewVersion(versionType) {
    const currentVersion = versionInfo.current;
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    let newVersion;
    switch (versionType) {
      case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
      default:
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
    }
    
    return newVersion;
  }

  // Create backup
  async createBackup(version) {
    const backupDir = join(projectRoot, this.config.storage.backupDir, version);
    mkdirSync(backupDir, { recursive: true });
    
    const files = this.getDocumentationFiles();
    
    for (const file of files) {
      const relativePath = file.replace(projectRoot, '');
      const backupPath = join(backupDir, relativePath);
      const backupDirPath = dirname(backupPath);
      
      mkdirSync(backupDirPath, { recursive: true });
      
      try {
        const content = readFileSync(file, 'utf8');
        writeFileSync(backupPath, content);
      } catch (error) {
        console.warn(`⚠️  Could not backup ${relativePath}: ${error.message}`);
      }
    }
    
    console.log(`  💾 Backup created: ${backupDir}`);
  }

  // Track changes
  async trackChanges(version) {
    console.log('  📝 Tracking changes...');
    
    const changes = {
      version: version,
      timestamp: new Date().toISOString(),
      changes: [],
      authors: [],
      dependencies: []
    };
    
    // Track file changes
    const files = this.getDocumentationFiles();
    for (const file of files) {
      const relativePath = file.replace(projectRoot, '');
      const stats = statSync(file);
      
      changes.changes.push({
        file: relativePath,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        type: 'modified'
      });
    }
    
    // Track authors
    if (this.config.tracking.trackAuthors) {
      try {
        const authors = execSync('git log --pretty=format:"%an" --since="1 week ago"', { 
          cwd: projectRoot, 
          stdio: 'pipe' 
        }).toString().split('\n').filter(Boolean);
        
        changes.authors = [...new Set(authors)];
      } catch (error) {
        console.warn('⚠️  Could not track authors:', error.message);
      }
    }
    
    // Track dependencies
    if (this.config.tracking.trackDependencies) {
      try {
        const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
        changes.dependencies = {
          dependencies: Object.keys(packageJson.dependencies || {}),
          devDependencies: Object.keys(packageJson.devDependencies || {})
        };
      } catch (error) {
        console.warn('⚠️  Could not track dependencies:', error.message);
      }
    }
    
    this.changes.push(changes);
    
    // Save changes
    const changesPath = join(projectRoot, this.config.storage.changesDir, `${version}.json`);
    writeFileSync(changesPath, JSON.stringify(changes, null, 2));
    
    console.log(`    📊 Changes tracked: ${changes.changes.length} files, ${changes.authors.length} authors`);
  }

  // Create version record
  async createVersionRecord(version, message) {
    const record = {
      version: version,
      previous: versionInfo.current,
      timestamp: new Date().toISOString(),
      message: message,
      metadata: {
        ...versionInfo.metadata,
        updated: new Date().toISOString()
      },
      changes: this.changes[this.changes.length - 1] || null,
      git: {
        commit: null,
        tag: null,
        branch: null
      }
    };
    
    // Get git information
    if (this.config.git.enabled) {
      try {
        record.git.commit = execSync('git rev-parse HEAD', { 
          cwd: projectRoot, 
          stdio: 'pipe' 
        }).toString().trim();
        
        record.git.branch = execSync('git branch --show-current', { 
          cwd: projectRoot, 
          stdio: 'pipe' 
        }).toString().trim();
      } catch (error) {
        console.warn('⚠️  Could not get git information:', error.message);
      }
    }
    
    return record;
  }

  // Save version
  async saveVersion(versionRecord) {
    const versionPath = join(projectRoot, this.config.storage.versionsDir, `${versionRecord.version}.json`);
    writeFileSync(versionPath, JSON.stringify(versionRecord, null, 2));
    
    // Update versions map
    this.versions.set(versionRecord.version, versionRecord);
    
    // Update current version
    versionInfo.current = versionRecord.version;
    versionInfo.previous = versionRecord.previous;
    
    console.log(`  💾 Version saved: ${versionPath}`);
  }

  // Update package version
  async updatePackageVersion(version) {
    const packagePath = join(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    
    packageJson.version = version;
    writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    
    console.log(`  📦 Package version updated to ${version}`);
  }

  // Create git tag
  async createGitTag(version, message) {
    try {
      const tagName = `${this.config.versioning.tagPrefix}${version}`;
      const tagMessage = this.config.git.tagMessage.replace('{version}', version);
      
      execSync(`git tag -a ${tagName} -m "${tagMessage}"`, { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      console.log(`  🏷️  Git tag created: ${tagName}`);
      
    } catch (error) {
      console.warn('⚠️  Could not create git tag:', error.message);
    }
  }

  // List versions
  async listVersions() {
    console.log('📋 Documentation Versions:');
    
    const versions = Array.from(this.versions.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    for (const version of versions) {
      console.log(`  ${version.version} - ${version.timestamp} (${version.metadata.files} files, ${this.formatBytes(version.metadata.size)})`);
      if (version.message) {
        console.log(`    ${version.message}`);
      }
    }
  }

  // Compare versions
  async compareVersions(version1, version2) {
    console.log(`🔍 Comparing versions ${version1} and ${version2}...`);
    
    const v1 = this.versions.get(version1);
    const v2 = this.versions.get(version2);
    
    if (!v1 || !v2) {
      console.error('❌ One or both versions not found');
      return;
    }
    
    const comparison = {
      version1: v1.version,
      version2: v2.version,
      changes: {
        files: {
          added: [],
          removed: [],
          modified: []
        },
        size: {
          before: v1.metadata.size,
          after: v2.metadata.size,
          difference: v2.metadata.size - v1.metadata.size
        },
        authors: {
          before: v1.changes?.authors || [],
          after: v2.changes?.authors || [],
          new: [],
          removed: []
        }
      }
    };
    
    // Compare files
    const files1 = new Set(v1.changes?.changes?.map(c => c.file) || []);
    const files2 = new Set(v2.changes?.changes?.map(c => c.file) || []);
    
    comparison.changes.files.added = [...files2].filter(f => !files1.has(f));
    comparison.changes.files.removed = [...files1].filter(f => !files2.has(f));
    comparison.changes.files.modified = [...files2].filter(f => files1.has(f));
    
    // Compare authors
    const authors1 = new Set(v1.changes?.authors || []);
    const authors2 = new Set(v2.changes?.authors || []);
    
    comparison.changes.authors.new = [...authors2].filter(a => !authors1.has(a));
    comparison.changes.authors.removed = [...authors1].filter(a => !authors2.has(a));
    
    console.log('📊 Comparison Results:');
    console.log(`  Files added: ${comparison.changes.files.added.length}`);
    console.log(`  Files removed: ${comparison.changes.files.removed.length}`);
    console.log(`  Files modified: ${comparison.changes.files.modified.length}`);
    console.log(`  Size change: ${this.formatBytes(comparison.changes.size.difference)}`);
    console.log(`  New authors: ${comparison.changes.authors.new.length}`);
    console.log(`  Removed authors: ${comparison.changes.authors.removed.length}`);
    
    return comparison;
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

  // Format bytes
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Generate changelog
  async generateChangelog() {
    console.log('📝 Generating changelog...');
    
    const versions = Array.from(this.versions.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    let changelog = '# Documentation Changelog\n\n';
    changelog += 'This file contains a record of all changes made to the documentation.\n\n';
    
    for (const version of versions) {
      changelog += `## [${version.version}] - ${version.timestamp.split('T')[0]}\n\n`;
      
      if (version.message) {
        changelog += `**${version.message}**\n\n`;
      }
      
      if (version.changes) {
        changelog += '### Changes\n\n';
        
        if (version.changes.changes.length > 0) {
          changelog += '#### Files\n\n';
          for (const change of version.changes.changes) {
            changelog += `- ${change.file} (${this.formatBytes(change.size)})\n`;
          }
          changelog += '\n';
        }
        
        if (version.changes.authors.length > 0) {
          changelog += '#### Contributors\n\n';
          for (const author of version.changes.authors) {
            changelog += `- ${author}\n`;
          }
          changelog += '\n';
        }
      }
      
      changelog += '---\n\n';
    }
    
    const changelogPath = join(projectRoot, 'docs/CHANGELOG.md');
    writeFileSync(changelogPath, changelog);
    
    console.log(`  📄 Changelog generated: ${changelogPath}`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const versioner = new DocumentationVersioner();
  
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command) {
    case 'init':
      versioner.initialize();
      break;
    case 'create':
      const versionType = args[0] || 'patch';
      const message = args[1] || '';
      versioner.createVersion(versionType, message);
      break;
    case 'list':
      versioner.listVersions();
      break;
    case 'compare':
      if (args.length >= 2) {
        versioner.compareVersions(args[0], args[1]);
      } else {
        console.error('Usage: version-docs.js compare <version1> <version2>');
      }
      break;
    case 'changelog':
      versioner.generateChangelog();
      break;
    default:
      console.log('Usage: version-docs.js <command> [args]');
      console.log('Commands:');
      console.log('  init                    Initialize versioning system');
      console.log('  create [type] [message]  Create new version (patch|minor|major)');
      console.log('  list                    List all versions');
      console.log('  compare <v1> <v2>       Compare two versions');
      console.log('  changelog               Generate changelog');
      break;
  }
}

export default DocumentationVersioner;

