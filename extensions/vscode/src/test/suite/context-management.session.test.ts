/**
 * Context Management - Session Management Tests
 * Tests session continuity, context retention, and conversation history
 */

import * as assert from 'assert';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import { PROVIDER_TEST_TIMEOUTS } from '../helpers/test-constants';

suite('Context Management - Session Management Tests', () => {
	let testWorkspacePath: string;

	setup(async function () {
		this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
		testWorkspacePath = await createTestWorkspace('context-session-tests');
	});

	teardown(async function () {
		this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
		await cleanupTestWorkspace(testWorkspacePath);
	});

	// ====================================================================
	// Session Management System
	// ====================================================================

	interface Message {
		role: 'user' | 'assistant' | 'system';
		content: string;
		timestamp: number;
		contextFiles?: string[];
	}

	interface SessionContext {
		sessionId: string;
		messages: Message[];
		currentTopic?: string;
		activeFiles: Set<string>;
		metadata: {
			createdAt: number;
			lastActivity: number;
			messageCount: number;
		};
	}

	interface ContextPriority {
		file: string;
		relevanceScore: number; // 0-1
		lastAccessed: number;
		accessCount: number;
	}

	class SessionManager {
		private sessions: Map<string, SessionContext> = new Map();
		private readonly MAX_CONTEXT_WINDOW = 10; // Keep last 10 messages
		private readonly CONTEXT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

		/**
		 * Create a new session
		 */
		createSession(sessionId: string): SessionContext {
			const session: SessionContext = {
				sessionId,
				messages: [],
				activeFiles: new Set(),
				metadata: {
					createdAt: Date.now(),
					lastActivity: Date.now(),
					messageCount: 0,
				},
			};
			this.sessions.set(sessionId, session);
			return session;
		}

		/**
		 * Get session by ID
		 */
		getSession(sessionId: string): SessionContext | undefined {
			return this.sessions.get(sessionId);
		}

		/**
		 * Add message to session with context continuity
		 */
		addMessage(
			sessionId: string,
			role: Message['role'],
			content: string,
			contextFiles?: string[]
		): void {
			const session = this.sessions.get(sessionId);
			if (!session) {
				throw new Error(`Session ${sessionId} not found`);
			}

			const message: Message = {
				role,
				content,
				timestamp: Date.now(),
				contextFiles,
			};

			session.messages.push(message);
			session.metadata.lastActivity = Date.now();
			session.metadata.messageCount++;

			// Add context files to active files
			if (contextFiles) {
				contextFiles.forEach(file => session.activeFiles.add(file));
			}

			// Detect topic changes
			if (this.isNewTopic(session, content)) {
				session.currentTopic = this.extractTopic(content);
			}
		}

		/**
		 * Get conversation history for a session
		 */
		getHistory(sessionId: string, limit?: number): Message[] {
			const session = this.sessions.get(sessionId);
			if (!session) {
				return [];
			}

			const messages = session.messages;
			if (limit !== undefined) {
				return messages.slice(-limit);
			}
			return messages;
		}

		/**
		 * Get context window for next query (recent messages)
		 */
		getContextWindow(sessionId: string): Message[] {
			return this.getHistory(sessionId, this.MAX_CONTEXT_WINDOW);
		}

		/**
		 * Check if session has expired
		 */
		isSessionExpired(sessionId: string): boolean {
			const session = this.sessions.get(sessionId);
			if (!session) {
				return true;
			}

			const timeSinceLastActivity = Date.now() - session.metadata.lastActivity;
			return timeSinceLastActivity > this.CONTEXT_TIMEOUT_MS;
		}

		/**
		 * Reset context for new topic
		 */
		resetContext(sessionId: string, keepHistory: boolean = false): void {
			const session = this.sessions.get(sessionId);
			if (!session) {
				throw new Error(`Session ${sessionId} not found`);
			}

			// Clear active files and topic
			session.activeFiles.clear();
			session.currentTopic = undefined;

			// Optionally clear message history
			if (!keepHistory) {
				session.messages = [];
				session.metadata.messageCount = 0;
			}

			session.metadata.lastActivity = Date.now();
		}

		/**
		 * Detect if message indicates a new topic
		 */
		private isNewTopic(session: SessionContext, content: string): boolean {
			// Simple heuristic: look for topic-changing phrases
			const topicChangeIndicators = [
				'now let\'s',
				'moving on',
				'switching to',
				'different topic',
				'change of subject',
				'new question',
			];

			const lowerContent = content.toLowerCase();
			return topicChangeIndicators.some(indicator => lowerContent.includes(indicator));
		}

		/**
		 * Extract topic from message (simplified)
		 */
		private extractTopic(content: string): string {
			// Simple topic extraction: first meaningful noun phrase
			// In production, this would use NLP
			const words = content.split(/\s+/).slice(0, 5);
			return words.join(' ');
		}

		/**
		 * Get context prioritization for file selection
		 */
		prioritizeContext(sessionId: string, candidateFiles: string[]): ContextPriority[] {
			const session = this.sessions.get(sessionId);
			if (!session) {
				return [];
			}

			// Calculate relevance scores based on:
			// 1. File mentioned in recent messages
			// 2. File in active files set
			// 3. Frequency of mentions

			const priorities: ContextPriority[] = candidateFiles.map(file => {
				const recentMentions = this.countRecentMentions(session, file);
				const isActive = session.activeFiles.has(file);
				const lastAccessed = this.getLastAccessTime(session, file);

				// Relevance score calculation
				let relevanceScore = 0;
				relevanceScore += recentMentions * 0.3; // Weight recent mentions
				relevanceScore += isActive ? 0.4 : 0;   // Weight active files highly
				relevanceScore += (lastAccessed > 0) ? 0.3 : 0; // Weight recently accessed

				return {
					file,
					relevanceScore: Math.min(1.0, relevanceScore),
					lastAccessed,
					accessCount: recentMentions,
				};
			});

			// Sort by relevance score (descending)
			priorities.sort((a, b) => b.relevanceScore - a.relevanceScore);

			return priorities;
		}

		/**
		 * Count mentions of file in recent messages
		 */
		private countRecentMentions(session: SessionContext, file: string): number {
			const recentMessages = session.messages.slice(-this.MAX_CONTEXT_WINDOW);
			return recentMessages.filter(msg =>
				msg.content.includes(file) || msg.contextFiles?.includes(file)
			).length;
		}

		/**
		 * Get last access time for a file
		 */
		private getLastAccessTime(session: SessionContext, file: string): number {
			// Search messages in reverse order
			for (let i = session.messages.length - 1; i >= 0; i--) {
				const msg = session.messages[i];
				if (msg.content.includes(file) || msg.contextFiles?.includes(file)) {
					return msg.timestamp;
				}
			}
			return 0;
		}

		/**
		 * Persist session to storage (mock implementation)
		 */
		async persistSession(sessionId: string): Promise<void> {
			const session = this.sessions.get(sessionId);
			if (!session) {
				throw new Error(`Session ${sessionId} not found`);
			}

			// In production, this would save to disk/database
			// For tests, we just validate the session can be serialized
			const serialized = JSON.stringify({
				...session,
				activeFiles: Array.from(session.activeFiles),
			});

			// Simulate async save
			await new Promise(resolve => setTimeout(resolve, 10));

			// Validate can be deserialized
			JSON.parse(serialized);
		}

		/**
		 * Load session from storage (mock implementation)
		 */
		async loadSession(sessionId: string): Promise<SessionContext | null> {
			// In production, this would load from disk/database
			// For tests, we just return existing session if found
			await new Promise(resolve => setTimeout(resolve, 10));

			const session = this.sessions.get(sessionId);
			return session || null;
		}

		/**
		 * Delete session
		 */
		deleteSession(sessionId: string): boolean {
			return this.sessions.delete(sessionId);
		}

		/**
		 * Get all active sessions
		 */
		getActiveSessions(): SessionContext[] {
			const now = Date.now();
			return Array.from(this.sessions.values()).filter(
				session => (now - session.metadata.lastActivity) <= this.CONTEXT_TIMEOUT_MS
			);
		}

		/**
		 * Clean up expired sessions
		 */
		cleanupExpiredSessions(): number {
			const expiredSessions: string[] = [];

			for (const [sessionId, session] of this.sessions) {
				if (this.isSessionExpired(sessionId)) {
					expiredSessions.push(sessionId);
				}
			}

			expiredSessions.forEach(sessionId => this.sessions.delete(sessionId));
			return expiredSessions.length;
		}
	}

	// ====================================================================
	// Test Suite 1: Session Continuity
	// ====================================================================

	suite('Session Continuity', () => {
		test('Should maintain session across multiple queries', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();
			const sessionId = 'test-session-1';

			// Create session
			manager.createSession(sessionId);

			// Add multiple messages
			manager.addMessage(sessionId, 'user', 'Explain the login function');
			manager.addMessage(sessionId, 'assistant', 'The login function validates credentials...');
			manager.addMessage(sessionId, 'user', 'What about error handling?');
			manager.addMessage(sessionId, 'assistant', 'Error handling uses try-catch blocks...');

			// Verify session continuity
			const session = manager.getSession(sessionId);
			assert.ok(session, 'Session should exist');
			assert.strictEqual(session.messages.length, 4, 'Should have 4 messages');
			assert.strictEqual(session.metadata.messageCount, 4, 'Message count should be 4');
		});

		test('Should track session activity timestamps', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();
			const sessionId = 'test-session-2';

			const session = manager.createSession(sessionId);
			const createdAt = session.metadata.createdAt;

			// Wait a bit
			await new Promise(resolve => setTimeout(resolve, 50));

			// Add message
			manager.addMessage(sessionId, 'user', 'Test message');

			const updatedSession = manager.getSession(sessionId);
			assert.ok(updatedSession, 'Session should exist');
			assert.ok(updatedSession.metadata.lastActivity > createdAt, 'Last activity should be updated');
		});

		test('Should detect expired sessions', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();
			const sessionId = 'test-session-3';

			manager.createSession(sessionId);

			// Session should not be expired immediately
			assert.strictEqual(manager.isSessionExpired(sessionId), false, 'Session should not be expired');

			// Note: Testing actual expiration would require waiting 30 minutes
			// In production, we'd mock Date.now() or use dependency injection
		});
	});

	// ====================================================================
	// Test Suite 2: Context Retention
	// ====================================================================

	suite('Context Retention', () => {
		test('Should retain context files across messages', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();
			const sessionId = 'test-session-4';

			manager.createSession(sessionId);

			// Add messages with context files
			manager.addMessage(sessionId, 'user', 'Review auth.ts', ['src/auth.ts']);
			manager.addMessage(sessionId, 'assistant', 'I see the authentication logic...');
			manager.addMessage(sessionId, 'user', 'Check login.ts too', ['src/login.ts']);

			const session = manager.getSession(sessionId);
			assert.ok(session, 'Session should exist');
			assert.strictEqual(session.activeFiles.size, 2, 'Should have 2 active files');
			assert.ok(session.activeFiles.has('src/auth.ts'), 'Should include auth.ts');
			assert.ok(session.activeFiles.has('src/login.ts'), 'Should include login.ts');
		});

		test('Should provide context window for follow-up queries', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();
			const sessionId = 'test-session-5';

			manager.createSession(sessionId);

			// Add many messages (more than context window size)
			for (let i = 0; i < 15; i++) {
				manager.addMessage(sessionId, 'user', `Message ${i}`);
			}

			// Get context window
			const contextWindow = manager.getContextWindow(sessionId);

			assert.strictEqual(contextWindow.length, 10, 'Should return last 10 messages');
			assert.strictEqual(contextWindow[0].content, 'Message 5', 'Should start from message 5');
			assert.strictEqual(contextWindow[9].content, 'Message 14', 'Should end at message 14');
		});

		test('Should retrieve full conversation history', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();
			const sessionId = 'test-session-6';

			manager.createSession(sessionId);

			manager.addMessage(sessionId, 'user', 'First message');
			manager.addMessage(sessionId, 'assistant', 'First response');
			manager.addMessage(sessionId, 'user', 'Second message');

			const history = manager.getHistory(sessionId);

			assert.strictEqual(history.length, 3, 'Should have 3 messages');
			assert.strictEqual(history[0].content, 'First message');
			assert.strictEqual(history[2].content, 'Second message');
		});
	});

	// ====================================================================
	// Test Suite 3: Topic Detection and Context Reset
	// ====================================================================

	suite('Topic Detection', () => {
		test('Should detect new topic from user message', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();
			const sessionId = 'test-session-7';

			manager.createSession(sessionId);

			manager.addMessage(sessionId, 'user', 'Explain the authentication flow');
			let session = manager.getSession(sessionId)!;
			const firstTopic = session.currentTopic;

			manager.addMessage(sessionId, 'user', 'Now let\'s discuss the database schema');
			session = manager.getSession(sessionId)!;
			const secondTopic = session.currentTopic;

			assert.ok(secondTopic, 'Should detect new topic');
			assert.notStrictEqual(secondTopic, firstTopic, 'Topic should have changed');
		});

		test('Should reset context when topic changes', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();
			const sessionId = 'test-session-8';

			manager.createSession(sessionId);

			// Set up initial context
			manager.addMessage(sessionId, 'user', 'Review auth.ts', ['src/auth.ts']);
			manager.addMessage(sessionId, 'user', 'Check login.ts', ['src/login.ts']);

			let session = manager.getSession(sessionId)!;
			assert.strictEqual(session.activeFiles.size, 2, 'Should have 2 active files');

			// Reset context
			manager.resetContext(sessionId, true);

			session = manager.getSession(sessionId)!;
			assert.strictEqual(session.activeFiles.size, 0, 'Active files should be cleared');
			assert.strictEqual(session.currentTopic, undefined, 'Topic should be cleared');
			assert.strictEqual(session.messages.length, 2, 'Messages should be retained');
		});

		test('Should clear history on hard reset', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();
			const sessionId = 'test-session-9';

			manager.createSession(sessionId);

			manager.addMessage(sessionId, 'user', 'Message 1');
			manager.addMessage(sessionId, 'user', 'Message 2');

			// Hard reset (don't keep history)
			manager.resetContext(sessionId, false);

			const session = manager.getSession(sessionId)!;
			assert.strictEqual(session.messages.length, 0, 'Messages should be cleared');
			assert.strictEqual(session.metadata.messageCount, 0, 'Message count should be reset');
		});
	});

	// ====================================================================
	// Test Suite 4: Context Prioritization
	// ====================================================================

	suite('Context Prioritization', () => {
		test('Should prioritize files by relevance', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();
			const sessionId = 'test-session-10';

			manager.createSession(sessionId);

			// Add messages mentioning different files
			manager.addMessage(sessionId, 'user', 'Review src/auth.ts', ['src/auth.ts']);
			manager.addMessage(sessionId, 'user', 'Check src/auth.ts again');
			manager.addMessage(sessionId, 'user', 'Also look at src/db.ts', ['src/db.ts']);

			const candidateFiles = ['src/auth.ts', 'src/db.ts', 'src/utils.ts'];
			const priorities = manager.prioritizeContext(sessionId, candidateFiles);

			assert.strictEqual(priorities.length, 3, 'Should return 3 priorities');
			assert.strictEqual(priorities[0].file, 'src/auth.ts', 'auth.ts should be most relevant');
			assert.ok(priorities[0].relevanceScore > priorities[1].relevanceScore, 'auth.ts should have higher score');
		});

		test('Should weight active files highly', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();
			const sessionId = 'test-session-11';

			manager.createSession(sessionId);

			manager.addMessage(sessionId, 'user', 'Review these files', ['src/active.ts', 'src/passive.ts']);

			const candidateFiles = ['src/active.ts', 'src/unmentioned.ts'];
			const priorities = manager.prioritizeContext(sessionId, candidateFiles);

			assert.ok(priorities[0].relevanceScore > 0, 'Active file should have positive score');
			assert.ok(priorities[0].relevanceScore > priorities[1].relevanceScore, 'Active file should rank higher');
		});
	});

	// ====================================================================
	// Test Suite 5: Session Persistence
	// ====================================================================

	suite('Session Persistence', () => {
		test('Should persist session to storage', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();
			const sessionId = 'test-session-12';

			manager.createSession(sessionId);
			manager.addMessage(sessionId, 'user', 'Test message');

			// Should not throw
			await manager.persistSession(sessionId);
		});

		test('Should load session from storage', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();
			const sessionId = 'test-session-13';

			manager.createSession(sessionId);
			manager.addMessage(sessionId, 'user', 'Test message');

			// In this mock implementation, load returns existing session
			const loaded = await manager.loadSession(sessionId);

			assert.ok(loaded, 'Should load session');
			assert.strictEqual(loaded.sessionId, sessionId);
			assert.strictEqual(loaded.messages.length, 1);
		});

		test('Should return null for non-existent session', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();

			const loaded = await manager.loadSession('non-existent');

			assert.strictEqual(loaded, null, 'Should return null for non-existent session');
		});

		test('Should delete session', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();
			const sessionId = 'test-session-14';

			manager.createSession(sessionId);

			const deleted = manager.deleteSession(sessionId);

			assert.strictEqual(deleted, true, 'Should return true on successful delete');
			assert.strictEqual(manager.getSession(sessionId), undefined, 'Session should no longer exist');
		});
	});

	// ====================================================================
	// Test Suite 6: Session Cleanup
	// ====================================================================

	suite('Session Cleanup', () => {
		test('Should list active sessions', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();

			manager.createSession('session-1');
			manager.createSession('session-2');
			manager.createSession('session-3');

			const activeSessions = manager.getActiveSessions();

			assert.strictEqual(activeSessions.length, 3, 'Should have 3 active sessions');
		});

		test('Should cleanup expired sessions', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const manager = new SessionManager();

			manager.createSession('session-1');
			manager.createSession('session-2');

			// In production, we'd manipulate timestamps to test expiration
			// For now, verify cleanup runs without errors
			const cleanedCount = manager.cleanupExpiredSessions();

			assert.strictEqual(cleanedCount, 0, 'Should not clean up recent sessions');
		});
	});
});
