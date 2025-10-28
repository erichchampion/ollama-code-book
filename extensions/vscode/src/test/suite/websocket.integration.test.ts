/**
 * WebSocket Integration Tests
 * Tests for WebSocket server communication and MCP integration
 */

import * as assert from 'assert';
import {
  createTestWebSocketClient,
  createMockMCPServer,
  WebSocketTestClient,
  MockMCPServer
} from '../helpers/websocketTestHelper';
import { WEBSOCKET_TEST_CONSTANTS } from '../helpers/test-constants';

suite('WebSocket Integration Tests', () => {
  const TEST_PORT = WEBSOCKET_TEST_CONSTANTS.DEFAULT_TEST_PORT;
  const WS_URL = `ws://localhost:${TEST_PORT}`;

  let mockServer: MockMCPServer;
  let testClient: WebSocketTestClient;

  setup(async function() {
    this.timeout(10000);
    mockServer = createMockMCPServer();
    testClient = createTestWebSocketClient(WS_URL);
  });

  teardown(async function() {
    this.timeout(5000);
    if (testClient) {
      await testClient.disconnect();
    }
    if (mockServer) {
      await mockServer.stop();
    }
  });

  test('Mock MCP server should start successfully', async function() {
    this.timeout(5000);
    await mockServer.start(TEST_PORT);
    assert.ok(true, 'Mock server started without errors');
  });

  test('WebSocket client should connect to mock server', async function() {
    this.timeout(5000);
    await mockServer.start(TEST_PORT);
    await testClient.connect();

    assert.strictEqual(
      mockServer.getConnectedClients(),
      1,
      'Server should have 1 connected client'
    );
  });

  test('WebSocket client should disconnect cleanly', async function() {
    this.timeout(5000);
    await mockServer.start(TEST_PORT);
    await testClient.connect();

    assert.strictEqual(mockServer.getConnectedClients(), 1, 'Should have 1 client');

    await testClient.disconnect();

    // Wait a bit for disconnect to register
    await new Promise(resolve => setTimeout(resolve, 100));

    assert.strictEqual(
      mockServer.getConnectedClients(),
      0,
      'Server should have 0 connected clients after disconnect'
    );
  });

  test('WebSocket should send and receive JSON messages', async function() {
    this.timeout(5000);
    await mockServer.start(TEST_PORT);
    await testClient.connect();

    const testMessage = { type: 'test', data: 'Hello, WebSocket!' };
    await testClient.send(testMessage);

    // Wait for message to be received
    await new Promise(resolve => setTimeout(resolve, 100));

    const receivedMessages = mockServer.getReceivedMessages();
    assert.strictEqual(receivedMessages.length, 1, 'Server should receive 1 message');
    assert.deepStrictEqual(
      receivedMessages[0],
      testMessage,
      'Received message should match sent message'
    );
  });

  test('WebSocket should handle broadcast messages from server', async function() {
    this.timeout(5000);
    await mockServer.start(TEST_PORT);
    await testClient.connect();

    const broadcastMessage = { type: 'broadcast', message: 'Server announcement' };
    mockServer.broadcastMessage(broadcastMessage);

    const receivedMessage = await testClient.waitForMessage(2000);
    assert.deepStrictEqual(
      receivedMessage,
      broadcastMessage,
      'Client should receive broadcast message'
    );
  });

  test('WebSocket should handle multiple clients', async function() {
    this.timeout(5000);
    await mockServer.start(TEST_PORT);

    const client1 = createTestWebSocketClient(WS_URL);
    const client2 = createTestWebSocketClient(WS_URL);

    await client1.connect();
    await client2.connect();

    assert.strictEqual(
      mockServer.getConnectedClients(),
      2,
      'Server should have 2 connected clients'
    );

    await client1.disconnect();
    await client2.disconnect();
  });

  test('WebSocket should handle connection timeout gracefully', async function() {
    this.timeout(3000);

    // Don't start server - connection should fail
    const invalidClient = createTestWebSocketClient('ws://localhost:9999');

    try {
      await invalidClient.connect();
      assert.fail('Connection should have failed');
    } catch (error) {
      assert.ok(error, 'Should throw connection error');
    }
  });

  test('WebSocket should handle malformed JSON gracefully', async function() {
    this.timeout(5000);
    await mockServer.start(TEST_PORT);
    await testClient.connect();

    const malformedMessage = 'This is not JSON';
    await testClient.send(malformedMessage);

    await new Promise(resolve => setTimeout(resolve, 100));

    const receivedMessages = mockServer.getReceivedMessages();
    assert.ok(receivedMessages.length > 0, 'Server should receive message');
    assert.strictEqual(
      receivedMessages[0],
      malformedMessage,
      'Server should receive malformed message as string'
    );
  });

  test('WebSocket should maintain connection stability', async function() {
    this.timeout(8000);
    await mockServer.start(TEST_PORT);
    await testClient.connect();

    // Send multiple messages to test stability
    for (let i = 0; i < 10; i++) {
      await testClient.send({ type: 'ping', sequence: i });
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const receivedMessages = mockServer.getReceivedMessages();
    assert.strictEqual(
      receivedMessages.length,
      10,
      'Server should receive all 10 messages'
    );

    // Verify sequence
    for (let i = 0; i < 10; i++) {
      assert.strictEqual(
        receivedMessages[i].sequence,
        i,
        `Message ${i} should have correct sequence number`
      );
    }
  });

  test('WebSocket should handle rapid connect/disconnect cycles', async function() {
    this.timeout(10000);
    await mockServer.start(TEST_PORT);

    // Perform 5 connect/disconnect cycles
    for (let i = 0; i < 5; i++) {
      const cycleClient = createTestWebSocketClient(WS_URL);
      await cycleClient.connect();
      await cycleClient.send({ type: 'test', cycle: i });
      await cycleClient.disconnect();
    }

    const receivedMessages = mockServer.getReceivedMessages();
    assert.strictEqual(
      receivedMessages.length,
      5,
      'Server should receive all messages from connect/disconnect cycles'
    );
  });

  test('WebSocket client should track errors correctly', async function() {
    this.timeout(3000);

    // Try to connect to non-existent server
    const errorClient = createTestWebSocketClient('ws://localhost:9998');

    try {
      await errorClient.connect();
    } catch (error) {
      // Expected error
    }

    assert.ok(
      errorClient.errors.length > 0,
      'Client should track connection errors'
    );
  });

  test('WebSocket should handle large message payloads', async function() {
    this.timeout(5000);
    await mockServer.start(TEST_PORT);
    await testClient.connect();

    // Create large payload (1MB)
    const largeData = 'x'.repeat(1024 * 1024);
    const largeMessage = { type: 'large', data: largeData };

    await testClient.send(largeMessage);
    await new Promise(resolve => setTimeout(resolve, 200));

    const receivedMessages = mockServer.getReceivedMessages();
    assert.strictEqual(
      receivedMessages.length,
      1,
      'Server should receive large message'
    );
    assert.strictEqual(
      receivedMessages[0].data.length,
      largeData.length,
      'Large message data should be intact'
    );
  });
});
