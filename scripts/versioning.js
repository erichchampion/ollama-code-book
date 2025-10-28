#!/usr/bin/env node

/**
 * Documentation Versioning System
 * 
 * Establishes a clear versioning system for documentation with semantic versioning
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from require('child_process');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Versioning configuration
const VERSIONING_CONFIG = {
  versioning: {
    scheme: 'semantic', // semantic, date, custom
    format: 'MAJOR.MINOR.PATCH', // MAJOR.MINOR.PATCH, YYYY.MM.DD, etc.
    autoIncrement: true,
    prerelease: false,
    build: false
  },
  files: {
    version: 'docs/VERSION.md',
    changelog: 'docs/CHANGELOG.md',
    history: 'docs/HISTORY.md',
    releases: 'docs/releases/'
  },
  git: {
    enabled: true,
    tagPrefix: 'docs-v',
    commitMessage: 'docs: update version to {version}',
    branch: 'main'
  },
  publishing: {
    enabled: false,
    platforms: ['github', 'gitlab', 'azure'],
    artifacts: ['docs/', 'docs/releases/']
  }
};

// Documentation versioning class
class DocumentationVersioning {
  constructor(config = VERSIONING_CONFIG) {
    this.config = config;
    this.currentVersion = this.getCurrentVersion();
    this.versionHistory = this.getVersionHistory();
  }

  // Get current version
  getCurrentVersion() {
    try {
      const packagePath = join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      return packageJson.version || '0.1.0';
    } catch (error) {
      return '0.1.0';
    }
  }

  // Get version history
  getVersionHistory() {
    try {
      const historyPath = join(projectRoot, this.config.files.history);
      if (statSync(historyPath)) {
        const content = readFileSync(historyPath, 'utf8');
        return this.parseVersionHistory(content);
      }
    } catch (error) {
      // History file doesn't exist yet
    }
    return [];
  }

  // Parse version history
  parseVersionHistory(content) {
    const versions = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('## ')) {
        const version = line.substring(3).trim();
        versions.push(version);
      }
    }
    
    return versions;
  }

  // Increment version
  incrementVersion(type = 'patch') {
    const [major, minor, patch] = this.currentVersion.split('.').map(Number);
    let newVersion;
    
    switch (type) {
      case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
      default:
        throw new Error(`Invalid version type: ${type}`);
    }
    
    return newVersion;
  }

  // Update version
  updateVersion(newVersion) {
    console.log(`🔄 Updating documentation version to ${newVersion}...`);
    
    // Update package.json
    this.updatePackageVersion(newVersion);
    
    // Update documentation files
    this.updateDocumentationVersion(newVersion);
    
    // Create version file
    this.createVersionFile(newVersion);
    
    // Update changelog
    this.updateChangelog(newVersion);
    
    // Update history
    this.updateHistory(newVersion);
    
    // Create release
    this.createRelease(newVersion);
    
    // Git operations
    if (this.config.git.enabled) {
      this.gitOperations(newVersion);
    }
    
    this.currentVersion = newVersion;
    console.log(`✅ Documentation version updated to ${newVersion}`);
  }

  // Update package.json version
  updatePackageVersion(newVersion) {
    try {
      const packagePath = join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      packageJson.version = newVersion;
      
      writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
      console.log(`  📝 Updated package.json version to ${newVersion}`);
    } catch (error) {
      console.warn(`  ⚠️  Could not update package.json: ${error.message}`);
    }
  }

  // Update documentation version
  updateDocumentationVersion(newVersion) {
    const files = [
      'README.md',
      'TECHNICAL_SPECIFICATION.md',
      'docs/README.md'
    ];
    
    for (const file of files) {
      try {
        const fullPath = join(projectRoot, file);
        if (!statSync(fullPath)) continue;
        
        let content = readFileSync(fullPath, 'utf8');
        let updated = false;
        
        // Update version patterns
        const patterns = [
          /version:\s*[0-9]+\.[0-9]+\.[0-9]+/g,
          /v[0-9]+\.[0-9]+\.[0-9]+/g,
          /"version":\s*"[^"]+"/g
        ];
        
        for (const pattern of patterns) {
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
          console.log(`  📝 Updated ${file}`);
        }
      } catch (error) {
        console.warn(`  ⚠️  Could not update ${file}: ${error.message}`);
      }
    }
  }

  // Create version file
  createVersionFile(newVersion) {
    const versionContent = `# Documentation Version

## Current Version
${newVersion}

## Version History
${this.versionHistory.map(v => `- ${v}`).join('\n')}

## Versioning Scheme
This documentation follows semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes to documentation structure or format
- **MINOR**: New features, sections, or significant content additions
- **PATCH**: Bug fixes, typos, or minor content updates

## Release Notes
See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

## History
See [HISTORY.md](HISTORY.md) for complete version history.
`;

    const versionPath = join(projectRoot, this.config.files.version);
    writeFileSync(versionPath, versionContent);
    console.log(`  📝 Created version file: ${versionPath}`);
  }

  // Update changelog
  updateChangelog(newVersion) {
    const changelogContent = `# Changelog

All notable changes to this documentation will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [${newVersion}] - ${new Date().toISOString().split('T')[0]}

### Added
- New documentation features and improvements

### Changed
- Updated existing documentation

### Fixed
- Fixed documentation issues

### Removed
- Removed outdated documentation

## [Unreleased]

### Added
- Future features and improvements

### Changed
- Planned changes

### Fixed
- Planned fixes

### Removed
- Planned removals
`;

    const changelogPath = join(projectRoot, this.config.files.changelog);
    writeFileSync(changelogPath, changelogContent);
    console.log(`  📝 Created changelog: ${changelogPath}`);
  }

  // Update history
  updateHistory(newVersion) {
    const historyContent = `# Documentation History

## ${newVersion} - ${new Date().toISOString().split('T')[0]}

### Changes
- Updated documentation version
- Improved content and structure
- Fixed various issues

## Previous Versions

${this.versionHistory.map(v => `## ${v}\n\n### Changes\n- Previous version changes\n`).join('\n')}
`;

    const historyPath = join(projectRoot, this.config.files.history);
    writeFileSync(historyPath, historyContent);
    console.log(`  📝 Updated history: ${historyPath}`);
  }

  // Create release
  createRelease(newVersion) {
    try {
      const releasesDir = join(projectRoot, this.config.files.releases);
      if (!statSync(releasesDir)) {
        mkdirSync(releasesDir, { recursive: true });
      }
      
      const releaseContent = `# Documentation Release ${newVersion}

## Release Information
- **Version**: ${newVersion}
- **Date**: ${new Date().toISOString()}
- **Type**: Documentation Release

## Changes
- Updated documentation version
- Improved content and structure
- Fixed various issues

## Files Changed
- README.md
- TECHNICAL_SPECIFICATION.md
- docs/ directory

## Installation
To use this version of the documentation:

\`\`\`bash
git checkout docs-v${newVersion}
\`\`\`

## Previous Versions
See [HISTORY.md](../HISTORY.md) for complete version history.
`;

      const releasePath = join(releasesDir, `v${newVersion}.md`);
      writeFileSync(releasePath, releaseContent);
      console.log(`  📝 Created release: ${releasePath}`);
    } catch (error) {
      console.warn(`  ⚠️  Could not create release: ${error.message}`);
    }
  }

  // Git operations
  gitOperations(newVersion) {
    try {
      // Add files
      execSync('git add .', { cwd: projectRoot, stdio: 'pipe' });
      
      // Commit changes
      const commitMessage = this.config.git.commitMessage.replace('{version}', newVersion);
      execSync(`git commit -m "${commitMessage}"`, { cwd: projectRoot, stdio: 'pipe' });
      
      // Create tag
      const tagName = `${this.config.git.tagPrefix}${newVersion}`;
      execSync(`git tag -a ${tagName} -m "Documentation version ${newVersion}"`, { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      
      console.log(`  🔄 Git operations completed for version ${newVersion}`);
    } catch (error) {
      console.warn(`  ⚠️  Git operations failed: ${error.message}`);
    }
  }

  // List versions
  listVersions() {
    console.log('📋 Documentation Versions:');
    console.log(`   Current: ${this.currentVersion}`);
    console.log(`   History: ${this.versionHistory.length} versions`);
    
    if (this.versionHistory.length > 0) {
      console.log('   Previous versions:');
      this.versionHistory.slice(0, 5).forEach(version => {
        console.log(`     - ${version}`);
      });
      
      if (this.versionHistory.length > 5) {
        console.log(`     ... and ${this.versionHistory.length - 5} more`);
      }
    }
  }

  // Compare versions
  compareVersions(version1, version2) {
    const v1 = version1.split('.').map(Number);
    const v2 = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const a = v1[i] || 0;
      const b = v2[i] || 0;
      
      if (a > b) return 1;
      if (a < b) return -1;
    }
    
    return 0;
  }

  // Get latest version
  getLatestVersion() {
    if (this.versionHistory.length === 0) {
      return this.currentVersion;
    }
    
    return this.versionHistory.reduce((latest, version) => {
      return this.compareVersions(version, latest) > 0 ? version : latest;
    });
  }

  // Check for updates
  checkForUpdates() {
    const latest = this.getLatestVersion();
    const current = this.currentVersion;
    
    if (this.compareVersions(latest, current) > 0) {
      console.log(`🔄 Update available: ${current} → ${latest}`);
      return true;
    } else {
      console.log('✅ Documentation is up to date');
      return false;
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const versioning = new DocumentationVersioning();
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'update':
      const newVersion = arg || versioning.incrementVersion('patch');
      versioning.updateVersion(newVersion);
      break;
    case 'increment':
      const type = arg || 'patch';
      const incrementedVersion = versioning.incrementVersion(type);
      versioning.updateVersion(incrementedVersion);
      break;
    case 'list':
      versioning.listVersions();
      break;
    case 'check':
      versioning.checkForUpdates();
      break;
    default:
      console.log('Usage: node versioning.js [update|increment|list|check] [version|type]');
      console.log('Commands:');
      console.log('  update [version]  - Update to specific version');
      console.log('  increment [type]  - Increment version (major|minor|patch)');
      console.log('  list             - List all versions');
      console.log('  check            - Check for updates');
  }
}

export default DocumentationVersioning;

