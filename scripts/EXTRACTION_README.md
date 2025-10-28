# Book Content Extraction

This directory contains the markdown files for the technical book along with extracted code samples, exercises, and diagrams.

## Directory Structure

```
book/md/
├── *.md                    # Source markdown files (chapters and appendices)
├── code-examples/          # Extracted code samples from chapters
├── exercises/              # Extracted exercise code blocks
├── diagrams/               # Extracted ASCII diagrams
└── EXTRACTION_README.md    # This file
```

## Extraction Script

The extraction script (`scripts/extract-book-content.ts`) automatically parses all markdown files and extracts:

- **Code Samples**: All code blocks from regular chapter content
- **Exercises**: All code blocks from exercise sections
- **Diagrams**: ASCII art diagrams (box drawings, arrows, etc.)

### Running the Extraction

To extract content from all markdown files:

```bash
yarn book:extract
```

This will:
1. Process all `chapter-*.md` and `appendix-*.md` files
2. Extract code blocks, exercises, and diagrams
3. Save them to the respective directories with numbered filenames

### Output File Naming

Files are named using the following pattern:

**Code Samples:**
```
{prefix}-{section}-{number}.{extension}

Examples:
- ch01-2-01.ts      # Chapter 1, Section 2, Code block 1
- appa-3-05.json    # Appendix A, Section 3, Code block 5
```

**Exercises:**
```
{prefix}-exercise-{section}-{number}.{extension}

Examples:
- ch01-exercise-7.1-01.sh   # Chapter 1, Exercise section 7.1, Block 1
- ch02-exercise-11.2-02.ts  # Chapter 2, Exercise section 11.2, Block 2
```

**Diagrams:**
```
{prefix}-{section}-diagram-{number}.txt

Examples:
- ch01-3-diagram-01.txt     # Chapter 1, Section 3, Diagram 1
- ch08-10-diagram-02.txt    # Chapter 8, Section 10, Diagram 2
```

### File Extensions

The script automatically determines file extensions based on the code block language:

| Language    | Extension |
|-------------|-----------|
| typescript  | .ts       |
| javascript  | .js       |
| bash/shell  | .sh       |
| json        | .json     |
| yaml        | .yaml     |
| python      | .py       |
| rust        | .rs       |
| go          | .go       |
| markdown    | .md       |
| (unknown)   | .txt      |

## Extraction Statistics

Last extraction (run `yarn book:extract` to update):

- **Code samples**: 548
- **Exercises**: 33
- **Diagrams**: 23
- **Total files**: 604

## How It Works

The extraction script:

1. **Parses markdown files** line by line
2. **Tracks sections** using `##` and `###` headers
3. **Identifies code blocks** by triple backticks (\`\`\`)
4. **Categorizes content**:
   - Diagrams: Code blocks with box drawing characters (┌, ─, │, etc.)
   - Exercises: Code blocks within "Exercises" sections
   - Code samples: All other code blocks
5. **Writes to files** with consistent naming

## Examples

### Code Sample Example

From `chapter-01-introduction.md`:

```typescript
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || typeof email !== 'string') {
    return false;
  }

  if (email.length > 254) {
    return false;
  }

  return emailRegex.test(email);
}
```

Extracted to: `code-examples/ch01-2-01.ts`

### Exercise Example

From Exercise 2 in Chapter 1:

```typescript
class SimpleAIAssistant {
  private ollama: Ollama;

  constructor(config: AssistantConfig) {
    // TODO: Initialize Ollama client
  }

  async ask(prompt: string): Promise<void> {
    // TODO: Send prompt and stream response
  }
}
```

Extracted to: `exercises/ch01-exercise-7.2-05.ts`

### Diagram Example

Architecture diagram from Chapter 1:

```
┌────────────────────────────────────────────────────────────┐
│                    AI Coding Assistant                      │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │             User Interface Layer                      │  │
│  │  - Terminal Interface (CLI)                           │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

Extracted to: `diagrams/ch01-3-diagram-01.txt`

## Re-extracting Content

If you modify the markdown files and need to re-extract content:

1. The script will overwrite existing extracted files
2. Filenames remain consistent based on section numbers
3. No manual cleanup is needed - just run `yarn book:extract` again

## Source Files

The extraction processes these markdown files:

### Chapters
- chapter-01-introduction.md
- chapter-02-multi-provider.md
- chapter-03-dependency-injection.md
- chapter-04-tool-orchestration.md
- chapter-05-streaming.md
- chapter-06-conversation.md
- chapter-07-vcs-intelligence.md
- chapter-08-interactive-modes.md
- chapter-09-security.md
- chapter-10-testing.md
- chapter-11-performance.md
- chapter-12-monitoring.md
- chapter-13-plugin-architecture.md
- chapter-14-ide-integration.md
- chapter-15-building-your-own.md

### Appendices
- appendix-a-api-reference.md
- appendix-b-configuration.md
- appendix-c-troubleshooting.md
- appendix-d-benchmarks.md
- appendix-e-security-checklist.md

## Script Location

The extraction script is located at:
```
scripts/extract-book-content.ts
```

## Troubleshooting

**Q: The script isn't extracting a code block**

A: Make sure the code block is properly formatted with triple backticks (\`\`\`) and has a closing set of backticks.

**Q: A diagram isn't being detected**

A: The script looks for box drawing characters (┌, ─, │, etc.). Plain text diagrams without these characters may be extracted as code samples instead.

**Q: File numbering seems off**

A: File numbers are assigned based on the order of appearance within each section. If you add/remove code blocks, the numbering may change on re-extraction.

## License

Same as the main project (MIT)
