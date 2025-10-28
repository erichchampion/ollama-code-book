$ ollama-code pr create

AI: [Analyzing 15 commits since main...]
    [Detecting theme: Authentication refactoring]

    Created PR #456:

    Title: Refactor authentication to support OAuth 2.0

    Description:
    ## Summary
    This PR refactors our authentication system to support OAuth 2.0
    flows alongside our existing JWT implementation.

    ## Changes
    - Add OAuth 2.0 provider interface
    - Implement Google and GitHub OAuth providers
    - Refactor token management for multi-provider support
    - Add comprehensive integration tests

    ## Testing
    - ✅ All existing tests pass
    - ✅ New OAuth tests added (95% coverage)
    - ✅ Manual testing with Google/GitHub

    ## Migration Guide
    [Auto-generated from code analysis]

✓ PR created and reviewers assigned