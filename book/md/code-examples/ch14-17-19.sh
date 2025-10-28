# Install vsce (Visual Studio Code Extension tool)
yarn global add @vscode/vsce

# Build extension
yarn run compile

# Package extension
vsce package

# This creates: ollama-code-vscode-1.0.0.vsix