#!/bin/bash

echo "Testing devstral tool calling support..."
echo ""

curl -s http://localhost:11434/api/chat -d '{
  "model": "devstral:latest",
  "messages": [
    {
      "role": "system",
      "content": "You have access to tools. Use them to complete tasks. Call the create_file tool to create files."
    },
    {
      "role": "user",
      "content": "Create a file called hello.txt with the content: Hello World"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "create_file",
        "description": "Create a new file with specified content",
        "parameters": {
          "type": "object",
          "properties": {
            "filename": {
              "type": "string",
              "description": "The name of the file to create"
            },
            "content": {
              "type": "string",
              "description": "The content to write to the file"
            }
          },
          "required": ["filename", "content"]
        }
      }
    }
  ],
  "stream": false
}' | python3 -c "
import json
import sys

data = json.load(sys.stdin)
msg = data.get('message', {})

print('=== Response ===')
print('Role:', msg.get('role'))
print('Content:', msg.get('content', '(none)')[:200])

tool_calls = msg.get('tool_calls', [])
if tool_calls:
    print('\n✓ SUCCESS: Model made tool calls!')
    print('Tool calls:', json.dumps(tool_calls, indent=2))
else:
    print('\n✗ FAIL: Model did not make any tool calls')
    print('This suggests devstral may not support tool calling properly')
    print('\nFull response:')
    print(json.dumps(msg, indent=2))
"

echo ""
echo "Done!"
