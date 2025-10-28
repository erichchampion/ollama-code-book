#!/usr/bin/env node
/**
 * Extract code samples, exercises, and diagrams from markdown files
 *
 * This script parses markdown files in ./book/md/ and extracts:
 * - Code samples → ./book/md/code-examples/
 * - Exercise code blocks → ./book/md/exercises/
 * - Diagrams → ./book/md/diagrams/
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const BOOK_MD_DIR = path.join(PROJECT_ROOT, 'book', 'md');
const CODE_EXAMPLES_DIR = path.join(BOOK_MD_DIR, 'code-examples');
const EXERCISES_DIR = path.join(BOOK_MD_DIR, 'exercises');
const DIAGRAMS_DIR = path.join(BOOK_MD_DIR, 'diagrams');

interface CodeBlock {
  language: string;
  content: string;
  section: string;
  lineNumber: number;
}

interface ExtractedContent {
  codeBlocks: CodeBlock[];
  exerciseBlocks: CodeBlock[];
  diagrams: CodeBlock[];
}

/**
 * Extract chapter number from filename
 * e.g., "chapter-01-introduction.md" → "01"
 */
function extractChapterNumber(filename: string): string | null {
  const match = filename.match(/chapter-(\d+)/);
  return match ? match[1] : null;
}

/**
 * Extract appendix identifier from filename
 * e.g., "appendix-a-api-reference.md" → "a"
 */
function extractAppendixId(filename: string): string | null {
  const match = filename.match(/appendix-([a-z])/);
  return match ? match[1] : null;
}

/**
 * Determine file extension based on language
 */
function getFileExtension(language: string): string {
  const extensions: Record<string, string> = {
    'typescript': 'ts',
    'javascript': 'js',
    'bash': 'sh',
    'shell': 'sh',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yml',
    'python': 'py',
    'rust': 'rs',
    'go': 'go',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'html': 'html',
    'css': 'css',
    'sql': 'sql',
    'markdown': 'md',
    'text': 'txt',
    'diagram': 'txt',
    '': 'txt', // Unknown/no language → txt
  };

  return extensions[language.toLowerCase()] || 'txt';
}

/**
 * Check if a code block is likely a diagram
 */
function isDiagram(block: CodeBlock): boolean {
  const diagramIndicators = [
    '┌', '└', '├', '│', '─', '┐', '┘', '┤', '┬', '┴', '┼', // Box drawing
    '→', '←', '↑', '↓', '↔', // Arrows
    '═', '║', '╔', '╗', '╚', '╝', // Double line box
  ];

  // No language specified and contains diagram characters
  if (!block.language || block.language === 'text') {
    return diagramIndicators.some(char => block.content.includes(char));
  }

  return block.language === 'diagram' || block.language === 'ascii';
}

/**
 * Parse a markdown file and extract code blocks
 */
async function parseMarkdownFile(filepath: string): Promise<ExtractedContent> {
  const content = await fs.readFile(filepath, 'utf-8');
  const lines = content.split('\n');

  const codeBlocks: CodeBlock[] = [];
  const exerciseBlocks: CodeBlock[] = [];
  const diagrams: CodeBlock[] = [];

  let inCodeBlock = false;
  let inExerciseSection = false;
  let currentLanguage = '';
  let currentBlock: string[] = [];
  let blockStartLine = 0;
  let currentSection = '';
  let sectionCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track current section (## or ###)
    if (line.startsWith('## ')) {
      const sectionTitle = line.substring(3).trim();
      sectionCounter++;
      currentSection = `${sectionCounter}`;

      // Check if we're entering an exercises section
      inExerciseSection = sectionTitle.toLowerCase().includes('exercise');
    } else if (line.startsWith('### ')) {
      const subsectionTitle = line.substring(4).trim();
      // Track subsection for exercises
      if (inExerciseSection && subsectionTitle.toLowerCase().includes('exercise')) {
        const exerciseMatch = subsectionTitle.match(/exercise\s+(\d+)/i);
        if (exerciseMatch) {
          currentSection = `${sectionCounter}.${exerciseMatch[1]}`;
        }
      }
    }

    // Detect code block start/end
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        const block: CodeBlock = {
          language: currentLanguage,
          content: currentBlock.join('\n'),
          section: currentSection,
          lineNumber: blockStartLine,
        };

        // Categorize the block
        if (isDiagram(block)) {
          diagrams.push(block);
        } else if (inExerciseSection) {
          exerciseBlocks.push(block);
        } else {
          codeBlocks.push(block);
        }

        // Reset
        inCodeBlock = false;
        currentBlock = [];
        currentLanguage = '';
      } else {
        // Start of code block
        inCodeBlock = true;
        currentLanguage = line.substring(3).trim();
        blockStartLine = i + 1;
      }
    } else if (inCodeBlock) {
      currentBlock.push(line);
    }
  }

  return { codeBlocks, exerciseBlocks, diagrams };
}

/**
 * Write extracted content to files
 */
async function writeExtractedContent(
  filename: string,
  content: ExtractedContent
): Promise<void> {
  const chapterNum = extractChapterNumber(filename);
  const appendixId = extractAppendixId(filename);
  const prefix = chapterNum ? `ch${chapterNum}` : appendixId ? `app${appendixId}` : 'misc';

  // Write code examples
  for (let i = 0; i < content.codeBlocks.length; i++) {
    const block = content.codeBlocks[i];
    const extension = getFileExtension(block.language);
    const outputPath = path.join(
      CODE_EXAMPLES_DIR,
      `${prefix}-${block.section}-${String(i + 1).padStart(2, '0')}.${extension}`
    );

    await fs.writeFile(outputPath, block.content, 'utf-8');
    console.log(`  ✓ Code sample: ${path.basename(outputPath)}`);
  }

  // Write exercises
  for (let i = 0; i < content.exerciseBlocks.length; i++) {
    const block = content.exerciseBlocks[i];
    const extension = getFileExtension(block.language);
    const outputPath = path.join(
      EXERCISES_DIR,
      `${prefix}-exercise-${block.section}-${String(i + 1).padStart(2, '0')}.${extension}`
    );

    await fs.writeFile(outputPath, block.content, 'utf-8');
    console.log(`  ✓ Exercise: ${path.basename(outputPath)}`);
  }

  // Write diagrams
  for (let i = 0; i < content.diagrams.length; i++) {
    const block = content.diagrams[i];
    const outputPath = path.join(
      DIAGRAMS_DIR,
      `${prefix}-${block.section}-diagram-${String(i + 1).padStart(2, '0')}.txt`
    );

    await fs.writeFile(outputPath, block.content, 'utf-8');
    console.log(`  ✓ Diagram: ${path.basename(outputPath)}`);
  }
}

/**
 * Main extraction process
 */
async function main() {
  console.log('🔍 Extracting content from markdown files...\n');

  // Ensure output directories exist
  await fs.mkdir(CODE_EXAMPLES_DIR, { recursive: true });
  await fs.mkdir(EXERCISES_DIR, { recursive: true });
  await fs.mkdir(DIAGRAMS_DIR, { recursive: true });

  // Get all markdown files
  const files = await fs.readdir(BOOK_MD_DIR);
  const markdownFiles = files.filter(f =>
    f.endsWith('.md') &&
    (f.startsWith('chapter-') || f.startsWith('appendix-'))
  );

  console.log(`Found ${markdownFiles.length} markdown files to process\n`);

  let totalCodeBlocks = 0;
  let totalExercises = 0;
  let totalDiagrams = 0;

  // Process each file
  for (const filename of markdownFiles) {
    console.log(`📄 Processing: ${filename}`);
    const filepath = path.join(BOOK_MD_DIR, filename);

    const content = await parseMarkdownFile(filepath);
    await writeExtractedContent(filename, content);

    totalCodeBlocks += content.codeBlocks.length;
    totalExercises += content.exerciseBlocks.length;
    totalDiagrams += content.diagrams.length;

    console.log(''); // Blank line between files
  }

  console.log('✅ Extraction complete!\n');
  console.log(`📊 Summary:`);
  console.log(`   - Code samples: ${totalCodeBlocks}`);
  console.log(`   - Exercises: ${totalExercises}`);
  console.log(`   - Diagrams: ${totalDiagrams}`);
  console.log(`   - Total: ${totalCodeBlocks + totalExercises + totalDiagrams}\n`);

  console.log(`📁 Output directories:`);
  console.log(`   - ${CODE_EXAMPLES_DIR}`);
  console.log(`   - ${EXERCISES_DIR}`);
  console.log(`   - ${DIAGRAMS_DIR}`);
}

// Run the script
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
