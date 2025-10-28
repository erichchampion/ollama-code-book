#!/usr/bin/env node
/**
 * Documentation Update Script
 * 
 * Updates specific documentation files based on changes in the codebase:
 * - Updates API documentation when source files change
 * - Updates command documentation when commands change
 * - Updates configuration documentation when schemas change
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Update API documentation for a specific module
 */
async function updateModuleAPI(moduleName) {
  logInfo(`Updating API documentation for ${moduleName} module...`);
  
  try {
    const modulePath = join(projectRoot, 'src', moduleName, 'index.ts');
    const docPath = join(projectRoot, 'docs', `${moduleName}.md`);
    
    // Check if index.ts exists, otherwise look for other .ts files
    let actualModulePath = modulePath;
    try {
      statSync(modulePath);
    } catch {
      const moduleDir = join(projectRoot, 'src', moduleName);
      const files = readdirSync(moduleDir);
      const tsFiles = files.filter(f => f.endsWith('.ts'));
      if (tsFiles.length > 0) {
        actualModulePath = join(moduleDir, tsFiles[0]);
      } else {
        logWarning(`Module ${moduleName} not found`);
        return false;
      }
    }
    
    // Read the module file
    const moduleContent = readFileSync(actualModulePath, 'utf8');
    
    // Extract API information
    const apiInfo = extractAPIInfo(moduleContent, moduleName);
    
    // Update the documentation
    const docContent = generateModuleDoc(apiInfo);
    writeFileSync(docPath, docContent);
    
    logSuccess(`Updated ${moduleName}.md`);
    return true;
  } catch (error) {
    logError(`Failed to update ${moduleName} API: ${error.message}`);
    return false;
  }
}

/**
 * Extract API information from module content
 */
function extractAPIInfo(content, moduleName) {
  const apiInfo = {
    name: moduleName,
    functions: [],
    classes: [],
    interfaces: [],
    types: [],
    exports: []
  };
  
  // Extract functions
  const functionPattern = /export\s+(async\s+)?function\s+(\w+)/g;
  let match;
  while ((match = functionPattern.exec(content)) !== null) {
    const [, , functionName] = match;
    apiInfo.functions.push(functionName);
  }
  
  // Extract classes
  const classPattern = /export\s+class\s+(\w+)/g;
  while ((match = classPattern.exec(content)) !== null) {
    const [, className] = match;
    apiInfo.classes.push(className);
  }
  
  // Extract interfaces
  const interfacePattern = /export\s+interface\s+(\w+)/g;
  while ((match = interfacePattern.exec(content)) !== null) {
    const [, interfaceName] = match;
    apiInfo.interfaces.push(interfaceName);
  }
  
  // Extract types
  const typePattern = /export\s+type\s+(\w+)/g;
  while ((match = typePattern.exec(content)) !== null) {
    const [, typeName] = match;
    apiInfo.types.push(typeName);
  }
  
  // Extract exports
  const exportPattern = /export\s+(?:const|let|var)\s+(\w+)/g;
  while ((match = exportPattern.exec(content)) !== null) {
    const [, exportName] = match;
    apiInfo.exports.push(exportName);
  }
  
  return apiInfo;
}

/**
 * Generate module documentation
 */
function generateModuleDoc(apiInfo) {
  let doc = `# ${apiInfo.name} Module\n\n`;
  doc += `**Path:** \`src/${apiInfo.name}/\`\n\n`;
  
  // Add module description
  const descriptions = {
    'ai': 'AI integration and Ollama client functionality',
    'auth': 'Authentication and connection management',
    'commands': 'Command system and registration',
    'config': 'Configuration management and validation',
    'errors': 'Error handling and user-friendly messaging',
    'terminal': 'Terminal interface and formatting',
    'utils': 'Shared utilities and helper functions',
    'fs': 'File system operations',
    'telemetry': 'Telemetry and analytics'
  };
  
  const description = descriptions[apiInfo.name] || 'Module functionality';
  doc += `**Description:** ${description}\n\n`;
  
  // Add API information
  if (apiInfo.functions.length > 0) {
    doc += `## Functions\n\n`;
    for (const func of apiInfo.functions) {
      doc += `- \`${func}()\`\n`;
    }
    doc += '\n';
  }
  
  if (apiInfo.classes.length > 0) {
    doc += `## Classes\n\n`;
    for (const cls of apiInfo.classes) {
      doc += `- \`${cls}\`\n`;
    }
    doc += '\n';
  }
  
  if (apiInfo.interfaces.length > 0) {
    doc += `## Interfaces\n\n`;
    for (const iface of apiInfo.interfaces) {
      doc += `- \`${iface}\`\n`;
    }
    doc += '\n';
  }
  
  if (apiInfo.types.length > 0) {
    doc += `## Types\n\n`;
    for (const type of apiInfo.types) {
      doc += `- \`${type}\`\n`;
    }
    doc += '\n';
  }
  
  if (apiInfo.exports.length > 0) {
    doc += `## Exports\n\n`;
    for (const exp of apiInfo.exports) {
      doc += `- \`${exp}\`\n`;
    }
    doc += '\n';
  }
  
  // Add usage examples
  doc += `## Usage Examples\n\n`;
  doc += `\`\`\`typescript\n`;
  doc += `import { /* exports */ } from './${apiInfo.name}';\n`;
  doc += `\`\`\`\n\n`;
  
  // Add last updated timestamp
  doc += `---\n\n`;
  doc += `*Last updated: ${new Date().toISOString().split('T')[0]}*\n`;
  
  return doc;
}

/**
 * Update command documentation
 */
async function updateCommandDocs() {
  logInfo('Updating command documentation...');
  
  try {
    // Read the command registration file
    const registerPath = join(projectRoot, 'src', 'commands', 'register.ts');
    const content = readFileSync(registerPath, 'utf8');
    
    // Extract command information
    const commands = [];
    const commandPattern = /name:\s*['"`]([^'"`]+)['"`][\s\S]*?description:\s*['"`]([^'"`]+)['"`][\s\S]*?category:\s*['"`]([^'"`]+)['"`]/g;
    
    let match;
    while ((match = commandPattern.exec(content)) !== null) {
      const [, name, description, category] = match;
      commands.push({ name, description, category });
    }
    
    // Generate command documentation
    let doc = `# Commands Module\n\n`;
    doc += `**Path:** \`src/commands/\`\n\n`;
    doc += `**Description:** Command system and registration\n\n`;
    doc += `## Command Reference\n\n`;
    
    // Group commands by category
    const categories = {};
    for (const cmd of commands) {
      if (!categories[cmd.category]) {
        categories[cmd.category] = [];
      }
      categories[cmd.category].push(cmd);
    }
    
    for (const [category, categoryCommands] of Object.entries(categories)) {
      doc += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Commands\n\n`;
      
      for (const cmd of categoryCommands) {
        doc += `#### \`${cmd.name}\`\n\n`;
        doc += `${cmd.description}\n\n`;
        doc += `**Usage:** \`ollama-code ${cmd.name}\`\n\n`;
      }
    }
    
    // Write the documentation
    const docPath = join(projectRoot, 'docs', 'commands.md');
    writeFileSync(docPath, doc);
    
    logSuccess('Updated commands.md');
    return true;
  } catch (error) {
    logError(`Failed to update command documentation: ${error.message}`);
    return false;
  }
}

/**
 * Update configuration documentation
 */
async function updateConfigDocs() {
  logInfo('Updating configuration documentation...');
  
  try {
    // Read the configuration schema file
    const schemaPath = join(projectRoot, 'src', 'config', 'schema.ts');
    const content = readFileSync(schemaPath, 'utf8');
    
    // Generate configuration documentation
    let doc = `# Configuration Module\n\n`;
    doc += `**Path:** \`src/config/\`\n\n`;
    doc += `**Description:** Configuration management and validation\n\n`;
    doc += `## Configuration Reference\n\n`;
    doc += `The application uses Zod schemas for configuration validation.\n\n`;
    
    // Extract configuration sections
    const sections = [
      'ApiConfigSchema',
      'OllamaConfigSchema', 
      'AiConfigSchema',
      'TelemetryConfigSchema',
      'TerminalConfigSchema',
      'CodeAnalysisConfigSchema',
      'GitConfigSchema',
      'EditorConfigSchema',
      'PathsConfigSchema'
    ];
    
    for (const section of sections) {
      if (content.includes(section)) {
        doc += `### ${section.replace('Schema', '')}\n\n`;
        doc += `Configuration options for ${section.replace('Schema', '').toLowerCase()}.\n\n`;
      }
    }
    
    // Write the documentation
    const docPath = join(projectRoot, 'docs', 'configuration.md');
    writeFileSync(docPath, doc);
    
    logSuccess('Updated configuration.md');
    return true;
  } catch (error) {
    logError(`Failed to update configuration documentation: ${error.message}`);
    return false;
  }
}

/**
 * Main update function
 */
async function main() {
  log(`${colors.bold}Documentation Update${colors.reset}`);
  log('='.repeat(50));
  
  const results = {};
  
  // Update all module documentation
  const modules = ['ai', 'auth', 'commands', 'config', 'errors', 'terminal', 'utils', 'fs', 'telemetry'];
  
  for (const module of modules) {
    results[`update${module}API`] = await updateModuleAPI(module);
  }
  
  // Update command documentation
  results.updateCommandDocs = await updateCommandDocs();
  
  // Update configuration documentation
  results.updateConfigDocs = await updateConfigDocs();
  
  // Display summary
  log('\n' + '='.repeat(50));
  log(`${colors.bold}Update Summary${colors.reset}`);
  
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r === true).length;
  const failed = Object.values(results).filter(r => r === false).length;
  
  log(`Total tasks: ${total}`);
  log(`Passed: ${passed}`);
  log(`Failed: ${failed}`);
  
  if (failed > 0) {
    logError('Some update tasks failed');
    process.exit(1);
  } else {
    logSuccess('All update tasks completed successfully');
  }
}

// Run the update
main().catch(error => {
  logError(`Update failed: ${error.message}`);
  process.exit(1);
});
