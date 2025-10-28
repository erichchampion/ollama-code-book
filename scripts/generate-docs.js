#!/usr/bin/env node
/**
 * Documentation Generation Script
 * 
 * Automatically generates documentation from:
 * - TypeScript source code (API references)
 * - Command definitions (command documentation)
 * - Configuration schemas (configuration documentation)
 * - Package.json (project metadata)
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { dirname as pathDirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathDirname(__filename);
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
 * Get all TypeScript files in src directory
 */
function getTypeScriptFiles(dir, files = []) {
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        getTypeScriptFiles(fullPath, files);
      } else if (stat.isFile() && extname(item) === '.ts') {
        files.push(fullPath);
      }
    }
  } catch (error) {
    logWarning(`Could not read directory ${dir}: ${error.message}`);
  }
  
  return files;
}

/**
 * Extract JSDoc comments and function signatures from TypeScript files
 */
function extractAPIDocumentation(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const relativePath = filePath.replace(projectRoot, '').replace(/^\//, '');
    
    const apiDocs = {
      file: relativePath,
      functions: [],
      classes: [],
      interfaces: [],
      types: [],
      exports: []
    };
    
    // Extract JSDoc comments and function signatures
    const functionPattern = /\/\*\*[\s\S]*?\*\/\s*(export\s+)?(async\s+)?function\s+(\w+)/g;
    const classPattern = /\/\*\*[\s\S]*?\*\/\s*export\s+class\s+(\w+)/g;
    const interfacePattern = /\/\*\*[\s\S]*?\*\/\s*export\s+interface\s+(\w+)/g;
    const typePattern = /\/\*\*[\s\S]*?\*\/\s*export\s+type\s+(\w+)/g;
    const exportPattern = /export\s+(?:const|let|var)\s+(\w+)/g;
    
    let match;
    
    // Extract functions
    while ((match = functionPattern.exec(content)) !== null) {
      const [fullMatch, , , functionName] = match;
      const jsdocMatch = fullMatch.match(/\/\*\*([\s\S]*?)\*\//);
      const description = jsdocMatch ? jsdocMatch[1].trim() : '';
      
      apiDocs.functions.push({
        name: functionName,
        description: description,
        signature: fullMatch
      });
    }
    
    // Extract classes
    while ((match = classPattern.exec(content)) !== null) {
      const [fullMatch, className] = match;
      const jsdocMatch = fullMatch.match(/\/\*\*([\s\S]*?)\*\//);
      const description = jsdocMatch ? jsdocMatch[1].trim() : '';
      
      apiDocs.classes.push({
        name: className,
        description: description,
        signature: fullMatch
      });
    }
    
    // Extract interfaces
    while ((match = interfacePattern.exec(content)) !== null) {
      const [fullMatch, interfaceName] = match;
      const jsdocMatch = fullMatch.match(/\/\*\*([\s\S]*?)\*\//);
      const description = jsdocMatch ? jsdocMatch[1].trim() : '';
      
      apiDocs.interfaces.push({
        name: interfaceName,
        description: description,
        signature: fullMatch
      });
    }
    
    // Extract types
    while ((match = typePattern.exec(content)) !== null) {
      const [fullMatch, typeName] = match;
      const jsdocMatch = fullMatch.match(/\/\*\*([\s\S]*?)\*\//);
      const description = jsdocMatch ? jsdocMatch[1].trim() : '';
      
      apiDocs.types.push({
        name: typeName,
        description: description,
        signature: fullMatch
      });
    }
    
    // Extract exports
    while ((match = exportPattern.exec(content)) !== null) {
      const [, exportName] = match;
      apiDocs.exports.push(exportName);
    }
    
    return apiDocs;
  } catch (error) {
    logWarning(`Could not process file ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Generate API documentation for a module
 */
function generateModuleAPIDoc(apiDocs) {
  if (!apiDocs || (!apiDocs.functions.length && !apiDocs.classes.length && !apiDocs.interfaces.length && !apiDocs.types.length)) {
    return '';
  }
  
  let doc = `## API Reference\n\n`;
  
  if (apiDocs.functions.length > 0) {
    doc += `### Functions\n\n`;
    for (const func of apiDocs.functions) {
      doc += `#### \`${func.name}()\`\n\n`;
      if (func.description) {
        doc += `${func.description}\n\n`;
      }
      doc += `\`\`\`typescript\n${func.signature}\n\`\`\`\n\n`;
    }
  }
  
  if (apiDocs.classes.length > 0) {
    doc += `### Classes\n\n`;
    for (const cls of apiDocs.classes) {
      doc += `#### \`${cls.name}\`\n\n`;
      if (cls.description) {
        doc += `${cls.description}\n\n`;
      }
      doc += `\`\`\`typescript\n${cls.signature}\n\`\`\`\n\n`;
    }
  }
  
  if (apiDocs.interfaces.length > 0) {
    doc += `### Interfaces\n\n`;
    for (const iface of apiDocs.interfaces) {
      doc += `#### \`${iface.name}\`\n\n`;
      if (iface.description) {
        doc += `${iface.description}\n\n`;
      }
      doc += `\`\`\`typescript\n${iface.signature}\n\`\`\`\n\n`;
    }
  }
  
  if (apiDocs.types.length > 0) {
    doc += `### Types\n\n`;
    for (const type of apiDocs.types) {
      doc += `#### \`${type.name}\`\n\n`;
      if (type.description) {
        doc += `${type.description}\n\n`;
      }
      doc += `\`\`\`typescript\n${type.signature}\n\`\`\`\n\n`;
    }
  }
  
  if (apiDocs.exports.length > 0) {
    doc += `### Exports\n\n`;
    doc += `- ${apiDocs.exports.join('\n- ')}\n\n`;
  }
  
  return doc;
}

/**
 * Generate command documentation from command registry
 */
function generateCommandDocumentation() {
  try {
    // Read the command registration file
    const registerPath = join(projectRoot, 'src', 'commands', 'register.ts');
    const content = readFileSync(registerPath, 'utf8');
    
    // Extract command definitions (simplified extraction)
    const commandPattern = /name:\s*['"`]([^'"`]+)['"`][\s\S]*?description:\s*['"`]([^'"`]+)['"`][\s\S]*?category:\s*['"`]([^'"`]+)['"`]/g;
    
    const commands = [];
    let match;
    
    while ((match = commandPattern.exec(content)) !== null) {
      const [, name, description, category] = match;
      commands.push({ name, description, category });
    }
    
    let doc = `## Command Reference\n\n`;
    
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
    
    return doc;
  } catch (error) {
    logWarning(`Could not generate command documentation: ${error.message}`);
    return '';
  }
}

/**
 * Generate configuration documentation from schema
 */
function generateConfigurationDocumentation() {
  try {
    const schemaPath = join(projectRoot, 'src', 'config', 'schema.ts');
    const content = readFileSync(schemaPath, 'utf8');
    
    // Extract Zod schema definitions
    const schemaPattern = /(\w+)Schema:\s*ZodSchema[\s\S]*?export\s+const\s+configSchema/g;
    
    let doc = `## Configuration Reference\n\n`;
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
    
    return doc;
  } catch (error) {
    logWarning(`Could not generate configuration documentation: ${error.message}`);
    return '';
  }
}

/**
 * Generate project metadata documentation
 */
function generateProjectMetadata() {
  try {
    const packagePath = join(projectRoot, 'package.json');
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    
    let doc = `## Project Information\n\n`;
    doc += `- **Name:** ${pkg.name}\n`;
    doc += `- **Version:** ${pkg.version}\n`;
    doc += `- **Description:** ${pkg.description}\n`;
    doc += `- **License:** ${pkg.license}\n`;
    doc += `- **Node.js:** ${pkg.engines?.node || 'Not specified'}\n\n`;
    
    doc += `### Dependencies\n\n`;
    doc += `#### Core Dependencies\n\n`;
    for (const [name, version] of Object.entries(pkg.dependencies || {})) {
      doc += `- **${name}:** ${version}\n`;
    }
    
    doc += `\n#### Development Dependencies\n\n`;
    for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
      doc += `- **${name}:** ${version}\n`;
    }
    
    return doc;
  } catch (error) {
    logWarning(`Could not generate project metadata: ${error.message}`);
    return '';
  }
}

/**
 * Generate module documentation
 */
function generateModuleDocumentation(modulePath) {
  const moduleName = basename(modulePath);
  const moduleDir = dirname(modulePath);
  const relativePath = modulePath.replace(projectRoot, '').replace(/^\//, '');
  
  // Extract API documentation
  const apiDocs = extractAPIDocumentation(modulePath);
  
  let doc = `# ${moduleName} Module\n\n`;
  doc += `**Path:** \`${relativePath}\`\n\n`;
  
  // Add module description based on directory
  const moduleDescriptions = {
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
  
  const description = moduleDescriptions[moduleName] || 'Module functionality';
  doc += `**Description:** ${description}\n\n`;
  
  // Add API documentation
  const apiDoc = generateModuleAPIDoc(apiDocs);
  if (apiDoc) {
    doc += apiDoc;
  } else {
    doc += `## Overview\n\n`;
    doc += `This module provides ${description.toLowerCase()}.\n\n`;
  }
  
  // Add usage examples
  doc += `## Usage Examples\n\n`;
  doc += `\`\`\`typescript\n`;
  doc += `import { /* exports */ } from './${moduleName}';\n`;
  doc += `\`\`\`\n\n`;
  
  return doc;
}

/**
 * Main generation function
 */
async function main() {
  log(`${colors.bold}Documentation Generation${colors.reset}`);
  log('='.repeat(50));
  
  // Get all TypeScript files
  const srcDir = join(projectRoot, 'src');
  const tsFiles = getTypeScriptFiles(srcDir);
  logInfo(`Found ${tsFiles.length} TypeScript files to process`);
  
  // Create docs directory
  const docsDir = join(projectRoot, 'docs');
  try {
    execSync(`mkdir -p "${docsDir}"`, { cwd: projectRoot });
  } catch (error) {
    // Directory might already exist
  }
  
  // Generate module documentation
  const moduleDirs = new Set();
  for (const file of tsFiles) {
    const moduleDir = dirname(file);
    if (moduleDir !== srcDir && !moduleDirs.has(moduleDir)) {
      moduleDirs.add(moduleDir);
      
      // Find the main index.ts file for each module
      const indexFile = join(moduleDir, 'index.ts');
      if (tsFiles.includes(indexFile)) {
        const moduleName = basename(moduleDir);
        logInfo(`Generating documentation for ${moduleName} module`);
        
        const moduleDoc = generateModuleDocumentation(indexFile);
        const outputPath = join(docsDir, `${moduleName}.md`);
        writeFileSync(outputPath, moduleDoc);
        
        logSuccess(`Generated ${outputPath}`);
      }
    }
  }
  
  // Generate command documentation
  logInfo('Generating command documentation');
  const commandDoc = generateCommandDocumentation();
  if (commandDoc) {
    const commandDocPath = join(docsDir, 'commands.md');
    writeFileSync(commandDocPath, commandDoc);
    logSuccess(`Generated ${commandDocPath}`);
  }
  
  // Generate configuration documentation
  logInfo('Generating configuration documentation');
  const configDoc = generateConfigurationDocumentation();
  if (configDoc) {
    const configDocPath = join(docsDir, 'configuration.md');
    writeFileSync(configDocPath, configDoc);
    logSuccess(`Generated ${configDocPath}`);
  }
  
  // Generate project metadata
  logInfo('Generating project metadata');
  const metadataDoc = generateProjectMetadata();
  if (metadataDoc) {
    const metadataDocPath = join(docsDir, 'project-info.md');
    writeFileSync(metadataDocPath, metadataDoc);
    logSuccess(`Generated ${metadataDocPath}`);
  }
  
  log('\n' + '='.repeat(50));
  logSuccess('Documentation generation completed!');
  logInfo(`Generated files in: ${docsDir}`);
}

// Run the generation
main().catch(error => {
  logError(`Generation failed: ${error.message}`);
  process.exit(1);
});
