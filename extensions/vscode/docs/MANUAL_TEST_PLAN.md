# Ollama Code VS Code Extension - Manual Test Plan

## Overview

This document provides comprehensive manual testing procedures for the Ollama Code VS Code extension. Tests are organized by functional categories to ensure all features work correctly across different scenarios.

## Prerequisites

- VS Code version 1.74.0 or higher
- Ollama Code CLI backend running
- Test workspace with various file types (TypeScript, JavaScript, Python, etc.)
- Network connectivity for server communication

## Test Categories

## 1. Extension Activation & Initialization

### Test 1.1: Extension Activation
**Objective:** Verify extension activates correctly on VS Code startup.

**Steps:**
1. Start VS Code with the extension installed
2. Check status bar for Ollama Code indicators
3. Verify no error notifications appear
4. Check VS Code Developer Tools console for errors

**Expected Results:**
- Extension activates without errors
- Status bar shows appropriate connection status
- All services initialize successfully
- Configuration is loaded with defaults

### Test 1.2: Auto-Start Connection
**Objective:** Verify automatic connection when `autoStart` is enabled.

**Steps:**
1. Ensure `ollama-code.autoStart` is set to `true` in settings
2. Restart VS Code
3. Observe connection status in status bar
4. Verify connection establishes automatically

**Expected Results:**
- Connection attempts automatically
- Status bar shows "Connected" when successful
- No manual connection required

### Test 1.3: Service Initialization Sequence
**Objective:** Verify all services initialize in correct order.

**Steps:**
1. Enable debug logging in settings
2. Restart VS Code
3. Check VS Code Output panel for initialization logs
4. Verify service startup order

**Expected Results:**
- WorkspaceAnalyzer initializes first
- NotificationService initializes second
- ProgressIndicatorService initializes third
- All providers register successfully

## 2. Connection Management

### Test 2.1: Manual Connection
**Objective:** Verify manual connection to Ollama Code server.

**Steps:**
1. Ensure server is running on configured port
2. Open Command Palette (Ctrl+Shift+P)
3. Run "Ollama Code: Connect to Server"
4. Observe connection status

**Expected Results:**
- Connection establishes successfully
- Status bar updates to show "Connected"
- No error messages appear

### Test 2.2: Connection with Custom Port
**Objective:** Verify connection works with non-default port.

**Steps:**
1. Configure `ollama-code.serverPort` to custom port (e.g., 3003)
2. Start server on custom port
3. Attempt connection
4. Verify successful connection

**Expected Results:**
- Extension connects to custom port
- All features work normally
- Port configuration is respected

### Test 2.3: Connection Timeout Handling
**Objective:** Verify proper handling when server is unreachable.

**Steps:**
1. Ensure server is not running
2. Attempt connection
3. Wait for timeout period
4. Check error handling

**Expected Results:**
- Connection fails gracefully after timeout
- User receives appropriate error notification
- Extension remains functional for offline features

### Test 2.4: Connection Recovery
**Objective:** Verify automatic reconnection after connection loss.

**Steps:**
1. Establish connection to server
2. Stop the server
3. Observe behavior during disconnection
4. Restart server
5. Check if connection recovers

**Expected Results:**
- Disconnection is detected and reported
- Automatic reconnection attempts occur
- Connection restores when server available

## 3. Workspace Analysis

### Test 3.1: Project Type Detection
**Objective:** Verify correct project type identification.

**Test Cases:**
- TypeScript project with tsconfig.json
- Node.js project with package.json only
- Python project with requirements.txt
- Mixed language project

**Steps:**
1. Open different project types
2. Run "Ollama Code: Analyze Workspace"
3. Check analysis results

**Expected Results:**
- Correct project type detected for each case
- Dependencies identified accurately
- Framework detection works properly

### Test 3.2: File Structure Analysis
**Objective:** Verify comprehensive file structure mapping.

**Steps:**
1. Open workspace with complex directory structure
2. Include src/, test/, docs/ directories
3. Run workspace analysis
4. Review detected structure

**Expected Results:**
- Source directories identified correctly
- Test directories found and categorized
- Configuration files detected
- File type statistics accurate

### Test 3.3: Context-Aware Analysis
**Objective:** Verify intelligent context detection for cursor position.

**Steps:**
1. Open TypeScript file with classes and functions
2. Position cursor in different locations:
   - Inside function
   - Inside class
   - In comment block
   - In string literal
3. Check context analysis

**Expected Results:**
- Function name detected when inside function
- Class name detected when inside class
- Comment/string context identified correctly
- Surrounding code context provided

### Test 3.4: Multi-File Context
**Objective:** Verify cross-file relationship analysis.

**Steps:**
1. Open file with imports/exports
2. Run multi-file context analysis
3. Check detected relationships

**Expected Results:**
- Import statements parsed correctly
- Export declarations identified
- Related files discovered
- Dependency graph accurate

## 4. AI-Powered Features

### Test 4.1: Inline Completions
**Objective:** Verify AI-powered code completions work correctly.

**Steps:**
1. Enable `ollama-code.inlineCompletions`
2. Start typing code in various contexts
3. Wait for completion suggestions
4. Accept/reject completions

**Expected Results:**
- Completions appear contextually appropriate
- Suggestions are relevant to current code
- Accept/reject mechanisms work properly
- No performance degradation

### Test 4.2: Code Actions
**Objective:** Verify intelligent code action suggestions.

**Steps:**
1. Enable `ollama-code.codeActions`
2. Right-click on code with potential improvements
3. Check available code actions
4. Apply suggested actions

**Expected Results:**
- Relevant code actions suggested
- Actions execute successfully
- Code improvements are applied correctly
- No unintended side effects

### Test 4.3: Hover Information
**Objective:** Verify enhanced hover information.

**Steps:**
1. Hover over functions, variables, and types
2. Check provided information quality
3. Verify AI insights are helpful

**Expected Results:**
- Rich hover information displayed
- Context-aware explanations provided
- AI insights are accurate and helpful

### Test 4.4: Diagnostics Integration
**Objective:** Verify AI-enhanced diagnostic messages.

**Steps:**
1. Enable `ollama-code.diagnostics`
2. Introduce various code issues
3. Check diagnostic messages
4. Verify AI suggestions

**Expected Results:**
- Enhanced diagnostic messages appear
- AI suggestions are constructive
- Problem locations are accurate
- Suggested fixes are appropriate

## 5. Progress Tracking & Notifications

### Test 5.1: Progress Indicators
**Objective:** Verify progress tracking for long operations.

**Steps:**
1. Initiate workspace analysis on large project
2. Observe progress indicators
3. Test cancellation functionality
4. Check completion notifications

**Expected Results:**
- Progress bar appears for long operations
- Progress updates in real-time
- Cancellation works properly
- Completion status reported accurately

### Test 5.2: Batch Operations
**Objective:** Verify progress tracking for batch file processing.

**Steps:**
1. Select multiple files for analysis
2. Start batch processing
3. Monitor progress indicators
4. Check individual file completion status

**Expected Results:**
- Batch progress shown correctly
- Individual file progress tracked
- Error handling for failed files
- Overall completion reported

### Test 5.3: Status Bar Integration
**Objective:** Verify status bar progress and status displays.

**Steps:**
1. Perform various operations
2. Check status bar updates
3. Verify auto-hide functionality
4. Test different message types

**Expected Results:**
- Status bar shows current operation status
- Messages auto-hide after appropriate delay
- Different icons for different states
- Click actions work if configured

### Test 5.4: Notification System
**Objective:** Verify AI insights and recommendation notifications.

**Steps:**
1. Enable various notification levels
2. Trigger different types of insights
3. Test notification actions
4. Check notification persistence

**Expected Results:**
- Notifications appear at appropriate times
- Different severity levels handled correctly
- Action buttons work as expected
- Notifications respect user preferences

## 6. Configuration Management

### Test 6.1: Configuration UI
**Objective:** Verify advanced configuration interface.

**Steps:**
1. Open Command Palette
2. Run "Ollama Code: Show Configuration"
3. Test configuration interface
4. Apply changes and verify effects

**Expected Results:**
- Configuration UI opens successfully
- All settings categories accessible
- Changes apply immediately or after reload
- Validation prevents invalid values

### Test 6.2: Configuration Profiles
**Objective:** Verify predefined configuration profiles.

**Steps:**
1. Open configuration UI
2. Switch between profiles (Minimal, Balanced, Full-Featured)
3. Verify profile-specific settings
4. Test custom profile creation

**Expected Results:**
- Profiles load correct settings combinations
- Profile switching works smoothly
- Custom profiles can be created and saved
- Profile export/import functionality works

### Test 6.3: Configuration Validation
**Objective:** Verify configuration value validation.

**Steps:**
1. Attempt to set invalid port numbers
2. Try invalid timeout values
3. Test out-of-range context lines
4. Check validation messages

**Expected Results:**
- Invalid values rejected with clear messages
- Valid ranges communicated to user
- Automatic correction when possible
- No extension crashes from invalid config

### Test 6.4: Workspace-Aware Recommendations
**Objective:** Verify intelligent configuration recommendations.

**Steps:**
1. Open different project types
2. Check for configuration recommendations
3. Apply suggested configurations
4. Verify improvements

**Expected Results:**
- Recommendations appropriate for project type
- Suggestions improve functionality
- Recommendations can be applied easily
- User can dismiss unwanted suggestions

## 7. Error Handling & Recovery

### Test 7.1: Network Error Recovery
**Objective:** Verify graceful handling of network issues.

**Steps:**
1. Establish connection
2. Disconnect network/stop server
3. Attempt operations
4. Restore connection
5. Verify recovery

**Expected Results:**
- Network errors handled gracefully
- User informed of connection issues
- Automatic recovery when possible
- No data loss during disconnection

### Test 7.2: Invalid Input Handling
**Objective:** Verify proper handling of invalid user inputs.

**Steps:**
1. Provide malformed configuration values
2. Attempt operations with invalid parameters
3. Test edge cases and boundary conditions
4. Check error messages

**Expected Results:**
- Invalid inputs rejected with clear messages
- No extension crashes or undefined behavior
- Helpful error messages guide user to solutions
- System remains stable

### Test 7.3: Resource Cleanup
**Objective:** Verify proper cleanup of resources.

**Steps:**
1. Perform various operations
2. Monitor memory usage
3. Disable and re-enable extension
4. Check for resource leaks

**Expected Results:**
- Memory usage remains stable
- Resources cleaned up properly
- No accumulating handles or timers
- Extension can be disabled/enabled cleanly

## 8. Performance & Scalability

### Test 8.1: Large Workspace Handling
**Objective:** Verify performance with large codebases.

**Steps:**
1. Open workspace with 1000+ files
2. Perform workspace analysis
3. Monitor performance metrics
4. Check responsiveness

**Expected Results:**
- Analysis completes in reasonable time
- UI remains responsive during processing
- Memory usage stays within bounds
- Progress tracking works for large operations

### Test 8.2: Concurrent Operations
**Objective:** Verify handling of multiple simultaneous operations.

**Steps:**
1. Initiate multiple analyses simultaneously
2. Test concurrent completions requests
3. Monitor system resources
4. Check operation isolation

**Expected Results:**
- Operations execute without interference
- Resource limits respected
- No deadlocks or race conditions
- Results delivered correctly

### Test 8.3: Caching Effectiveness
**Objective:** Verify caching improves performance.

**Steps:**
1. Analyze workspace multiple times
2. Check cache hit rates
3. Verify cache invalidation
4. Monitor performance improvements

**Expected Results:**
- Subsequent analyses faster than initial
- Cache invalidates appropriately
- Memory usage balanced with performance
- Stale cache data properly handled

## 9. Accessibility & Usability

### Test 9.1: Keyboard Navigation
**Objective:** Verify all features accessible via keyboard.

**Steps:**
1. Navigate configuration UI with keyboard only
2. Test command palette integration
3. Verify keyboard shortcuts work
4. Check screen reader compatibility

**Expected Results:**
- All UI elements keyboard accessible
- Logical tab order maintained
- Keyboard shortcuts documented and functional
- Screen reader announces changes appropriately

### Test 9.2: Theme Compatibility
**Objective:** Verify extension works with different VS Code themes.

**Steps:**
1. Test with light themes
2. Test with dark themes
3. Test with high contrast themes
4. Check custom theme compatibility

**Expected Results:**
- UI elements visible in all themes
- Colors appropriate for theme type
- No visual artifacts or conflicts
- Accessibility standards maintained

## 10. Integration Testing

### Test 10.1: Other Extension Compatibility
**Objective:** Verify compatibility with popular VS Code extensions.

**Steps:**
1. Install common extensions (ESLint, Prettier, GitLens)
2. Test functionality with extensions active
3. Check for conflicts or interactions
4. Verify features work together

**Expected Results:**
- No conflicts with other extensions
- Features complement rather than interfere
- Performance remains acceptable
- User experience enhanced by integration

### Test 10.2: Multi-Root Workspace Support
**Objective:** Verify functionality in multi-root workspaces.

**Steps:**
1. Open multi-root workspace
2. Test analysis across different roots
3. Verify configuration applies correctly
4. Check context switching

**Expected Results:**
- Analysis works across all workspace roots
- Configuration scope handled correctly
- Context awareness maintains per-root state
- Performance acceptable for multiple roots

## Test Environment Setup

### Required Test Projects

1. **TypeScript React Project**
   - Contains tsconfig.json, package.json
   - Multiple components and services
   - Test files and documentation

2. **Node.js Backend Project**
   - Express or similar framework
   - Multiple modules and utilities
   - Configuration files

3. **Python Project**
   - requirements.txt or pyproject.toml
   - Multiple modules and classes
   - Test files

4. **Mixed Language Project**
   - Multiple language files
   - Complex directory structure
   - Various configuration files

### Test Data Requirements

- Files with syntax errors
- Large files (1MB+)
- Binary files
- Empty files and directories
- Files with special characters in names
- Deep directory nesting (10+ levels)

## Regression Testing Checklist

Before each release, verify:

- [ ] All core functionality works as expected
- [ ] No performance regressions
- [ ] Configuration changes respected
- [ ] Error handling remains robust
- [ ] New features integrate properly
- [ ] Documentation reflects current behavior
- [ ] Accessibility standards maintained

## Reporting Issues

When reporting test failures:

1. Include VS Code version
2. Specify extension version
3. Describe test environment
4. Provide step-by-step reproduction
5. Include relevant logs and screenshots
6. Note any error messages
7. Describe expected vs actual behavior

---

**Note:** This test plan should be updated whenever new features are added or existing functionality is modified. Regular review ensures comprehensive coverage of all extension capabilities.