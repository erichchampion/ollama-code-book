$ ollama-code commit

AI: [Analyzing changes...]
    [Detected: 3 files changed, 47 additions, 12 deletions]
    [Type: Bug fix in authentication module]

    Generated commit message:

    fix(auth): resolve race condition in token refresh

    - Add mutex lock to prevent concurrent token refreshes
    - Update token expiration check to use UTC timestamps
    - Add integration test for concurrent refresh scenarios

    Fixes #234

✓ Commit created: a3f9d2e