User: "commit my authentication changes"
↓
[Intent Classifier]
↓
Intent: COMMIT
Confidence: 0.95
Parameters: { scope: "authentication", infer_files: true }
↓
[Command Router]
↓
Routes to: CommitCommand
↓
[Parameter Inference]
↓
Infers: { files: ["src/auth/"], message_style: "conventional" }
↓
[Execution]
↓
✓ Committed: "fix(auth): resolve token refresh race condition"