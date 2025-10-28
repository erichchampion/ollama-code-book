# Ollama Code VS Code Extension

AI-powered development assistant that brings comprehensive code analysis and generation capabilities directly into VS Code through integration with the Ollama Code CLI backend.

## 🚀 Features

### Core AI Assistance
- **Ask AI**: Get intelligent answers to development questions
- **Code Explanation**: Understand complex code with AI-generated explanations
- **Smart Refactoring**: AI-powered code refactoring with safety checks
- **Intelligent Code Fixes**: Automatic issue detection and resolution
- **Code Generation**: Generate code from natural language descriptions
- **Workspace Analysis**: Comprehensive security, performance, and quality analysis

### VS Code Integration
- **Inline Completions**: AI-powered code suggestions as you type
- **Code Actions**: Right-click context menu with AI-powered quick fixes
- **Hover Documentation**: AI-generated documentation on hover
- **Chat Interface**: Interactive AI chat panel in the sidebar
- **Command Palette**: Easy access to all AI functions via `Ctrl+Shift+P`
- **Keyboard Shortcuts**: Quick access to common operations

## 📋 Prerequisites

1. **Ollama Code CLI**: Install and configure the Ollama Code CLI backend
2. **VS Code**: Version 1.80.0 or higher
3. **Node.js**: Version 18.0.0 or higher (for development)

## 🛠️ Installation

### From Source (Development)

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/ollama-code/ollama-code.git
   cd ollama-code/extensions/vscode
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Build the Extension**:
   ```bash
   npm run compile
   ```

4. **Install in VS Code**:
   - Open VS Code
   - Go to Extensions (`Ctrl+Shift+X`)
   - Click the `...` menu → "Install from VSIX..."
   - Select the generated `.vsix` file

### From Marketplace (Coming Soon)
The extension will be available on the VS Code Marketplace once published.

## ⚙️ Configuration

The extension can be configured through VS Code settings:

### Server Settings
```json
{
  "ollama-code.serverPort": 3002,
  "ollama-code.autoStart": true,
  "ollama-code.connectionTimeout": 10000
}
```

### Feature Settings
```json
{
  "ollama-code.inlineCompletions": true,
  "ollama-code.codeActions": true,
  "ollama-code.diagnostics": true,
  "ollama-code.showChatView": true
}
```

### AI Settings
```json
{
  "ollama-code.contextLines": 20,
  "ollama-code.logLevel": "info"
}
```

## 🎯 Usage

### Getting Started

1. **Start the Backend Server**:
   - Use Command Palette (`Ctrl+Shift+P`) → "Ollama Code: Start Integration Server"
   - Or manually: `ollama-code ide-server start`

2. **Open a Project**:
   - Open any workspace in VS Code
   - The extension will automatically detect and analyze your project

### Core Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| Ask AI | `Ctrl+Shift+A` | Ask the AI assistant any question |
| Explain Code | `Ctrl+Shift+E` | Explain selected code |
| Refactor Code | `Ctrl+Shift+R` | AI-powered refactoring |
| Fix Code | `Ctrl+Shift+F` | Fix code issues automatically |
| Generate Code | - | Generate code from description |
| Analyze Workspace | - | Comprehensive code analysis |

### Interactive Features

#### AI Chat Panel
- Located in the Explorer sidebar
- Real-time chat with AI assistant
- Maintains conversation context
- Perfect for iterative development discussions

#### Context Menu Integration
Right-click on any code to access:
- **Explain Code**: Understand what the code does
- **Refactor with AI**: Improve code structure and quality
- **Fix Issues**: Automatically resolve detected problems
- **Generate Documentation**: Create inline documentation

#### Inline Completions
- AI-powered code suggestions appear as you type
- Context-aware completions based on your codebase
- Accepts completions with `Tab` or `Enter`

## 🔧 Architecture

### Communication Flow
```
VS Code Extension ←→ WebSocket (Port 3002) ←→ Ollama Code CLI Backend
                                              ↓
                                        Ollama Server (Local AI)
```

### Key Components

1. **Extension Host**: Main VS Code extension process
2. **WebSocket Client**: Real-time communication with CLI backend
3. **Language Providers**: Inline completions, code actions, hover info
4. **Command Handlers**: Process user commands and display results
5. **Chat Interface**: Interactive AI assistant panel

## 🛡️ Security & Privacy

- **Local Processing**: All AI processing happens locally via Ollama
- **No Data Transmission**: Your code never leaves your machine
- **Secure Communication**: WebSocket connection over localhost only
- **Permission-Based**: Respects VS Code's security model

## 🐛 Troubleshooting

### Connection Issues

**Problem**: "Not connected to Ollama Code backend"
**Solution**:
1. Ensure Ollama Code CLI is installed: `ollama-code --version`
2. Start the integration server: `ollama-code ide-server start`
3. Check server status: `ollama-code ide-server status`
4. Restart VS Code extension

### Performance Issues

**Problem**: Slow AI responses
**Solution**:
1. Reduce context lines: `"ollama-code.contextLines": 10`
2. Check Ollama server performance: `ollama list`
3. Ensure sufficient system resources (RAM/CPU)

### Feature Not Working

**Problem**: Code actions/completions not appearing
**Solution**:
1. Check feature settings: `"ollama-code.codeActions": true`
2. Verify file type is supported
3. Check extension output panel for errors
4. Reload VS Code window

## 📊 Supported Languages

The extension works with all programming languages supported by VS Code:
- JavaScript/TypeScript
- Python
- Java
- C/C++
- Go
- Rust
- PHP
- Ruby
- And many more...

## 🤝 Contributing

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Make Changes**: Implement your improvements
4. **Test Thoroughly**: Ensure all features work correctly
5. **Submit Pull Request**: Describe your changes clearly

### Development Setup

```bash
# Install dependencies
npm install

# Start development mode
npm run watch

# Run tests
npm test

# Package extension
npm run package
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/ollama-code/ollama-code/issues)
- **Documentation**: [Project Wiki](https://github.com/ollama-code/ollama-code/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/ollama-code/ollama-code/discussions)

## 🎉 Changelog

### Version 1.0.0
- Initial release
- Core AI assistance features
- VS Code integration
- WebSocket communication
- Interactive chat interface
- Comprehensive language support

---

**Built with ❤️ for developers who want AI assistance without compromising privacy**