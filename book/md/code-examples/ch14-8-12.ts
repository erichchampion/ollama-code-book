// src/server/server.ts
import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  Hover,
  CodeAction,
  CodeActionKind,
  CodeActionParams
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { AIClient } from '../client';

// Create LSP connection
const connection = createConnection(ProposedFeatures.all);

// Create document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Initialize AI client
let aiClient: AIClient;

connection.onInitialize((params: InitializeParams) => {
  aiClient = new AIClient({
    apiUrl: params.initializationOptions?.apiUrl || 'http://localhost:11434',
    model: params.initializationOptions?.model || 'codellama:7b',
    maxTokens: 2048
  });

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['.', '(', '<', '"', "'"]
      },
      hoverProvider: true,
      codeActionProvider: {
        codeActionKinds: [CodeActionKind.QuickFix, CodeActionKind.Refactor]
      }
    }
  };
});

// Completion handler
connection.onCompletion(
  async (params: TextDocumentPositionParams): Promise<CompletionItem[]> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return [];
    }

    const position = params.position;
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Get context before cursor
    const prefix = text.substring(Math.max(0, offset - 1000), offset);

    try {
      const response = await aiClient.complete({
        prompt: `Complete the following code:\n${prefix}`,
        temperature: 0.4,
        maxTokens: 128
      });

      return [
        {
          label: response.content,
          kind: CompletionItemKind.Snippet,
          insertText: response.content,
          documentation: 'AI-generated completion'
        }
      ];
    } catch (error) {
      connection.console.error(`Completion error: ${error.message}`);
      return [];
    }
  }
);

// Hover handler (show AI explanation on hover)
connection.onHover(
  async (params: TextDocumentPositionParams): Promise<Hover | null> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return null;
    }

    const position = params.position;
    const wordRange = getWordRangeAtPosition(document, position);
    if (!wordRange) {
      return null;
    }

    const word = document.getText(wordRange);

    try {
      const response = await aiClient.complete({
        prompt: `Explain what "${word}" does in this code context.`,
        temperature: 0.3,
        maxTokens: 256
      });

      return {
        contents: {
          kind: 'markdown',
          value: response.content
        },
        range: wordRange
      };
    } catch (error) {
      return null;
    }
  }
);

// Code Action handler
connection.onCodeAction(
  async (params: CodeActionParams): Promise<CodeAction[]> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return [];
    }

    const actions: CodeAction[] = [];

    // If there are diagnostics, offer AI fix
    if (params.context.diagnostics.length > 0) {
      actions.push({
        title: '✨ Fix with AI',
        kind: CodeActionKind.QuickFix,
        command: {
          command: 'ollamaCode.fixError',
          title: 'Fix with AI'
        }
      });
    }

    return actions;
  }
);

// Helper function to get word range at position
function getWordRangeAtPosition(
  document: TextDocument,
  position: { line: number; character: number }
): { start: { line: number; character: number }; end: { line: number; character: number } } | null {
  const lineText = document.getText({
    start: { line: position.line, character: 0 },
    end: { line: position.line + 1, character: 0 }
  });

  const wordPattern = /\b\w+\b/g;
  let match: RegExpExecArray | null;

  while ((match = wordPattern.exec(lineText)) !== null) {
    const startChar = match.index;
    const endChar = startChar + match[0].length;

    if (startChar <= position.character && position.character <= endChar) {
      return {
        start: { line: position.line, character: startChar },
        end: { line: position.line, character: endChar }
      };
    }
  }

  return null;
}

// Make the text document manager listen on the connection
documents.listen(connection);

// Start listening
connection.listen();