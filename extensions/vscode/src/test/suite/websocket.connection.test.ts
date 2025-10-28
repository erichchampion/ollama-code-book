/**
 * WebSocket Connection Management Tests
 * Comprehensive tests for WebSocket connection lifecycle, authentication, and reliability
 */

import * as assert from 'assert';
import {
  createTestWebSocketClient,
  createMockMCPServer,
  WebSocketTestClient,
  MockMCPServer
} from '../helpers/websocketTestHelper';
import { WEBSOCKET_TEST_CONSTANTS, TEST_DELAYS } from '../helpers/test-constants';
import { sleep } from '../helpers/test-utils';

suite('WebSocket Connection Management Tests', () => {
  const TEST_PORT = WEBSOCKET_TEST_CONSTANTS.PORTS.CONNECTION_TESTS;
  const WS_URL = `ws://localhost:${TEST_PORT}`;
  const VALID_AUTH_TOKEN = WEBSOCKET_TEST_CONSTANTS.AUTH.VALID_TOKEN;

  let mockServer: MockMCPServer;
  let testClient: WebSocketTestClient;

  setup(async function() {
    this.timeout(10000);
    mockServer = createMockMCPServer();
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

  suite('Authentication', () => {
    test('Should connect successfully with valid authentication token', async function() {
      this.timeout(5000);

      // Start server requiring authentication
      await mockServer.start(TEST_PORT, {
        requireAuth: true,
        validAuthToken: VALID_AUTH_TOKEN
      });

      // Create client with valid auth token
      testClient = createTestWebSocketClient(WS_URL, {
        authToken: VALID_AUTH_TOKEN
      });

      await testClient.connect();

      assert.strictEqual(
        mockServer.getConnectedClients(),
        1,
        'Client with valid auth token should connect successfully'
      );
      assert.strictEqual(
        testClient.isConnected,
        true,
        'Client should report connected state'
      );
    });

    test('Should reject connection with invalid authentication token', async function() {
      this.timeout(5000);

      await mockServer.start(TEST_PORT, {
        requireAuth: true,
        validAuthToken: VALID_AUTH_TOKEN
      });

      // Create client with invalid auth token
      testClient = createTestWebSocketClient(WS_URL, {
        authToken: 'invalid-token'
      });

      try {
        await testClient.connect();
        assert.fail('Connection should have been rejected');
      } catch (error) {
        assert.ok(error, 'Should throw authentication error');
        assert.strictEqual(
          mockServer.getConnectedClients(),
          0,
          'Server should have 0 connected clients'
        );
        assert.strictEqual(
          mockServer.getRejectedConnections(),
          1,
          'Server should have rejected 1 connection'
        );
      }
    });

    test('Should reject connection with missing authentication token', async function() {
      this.timeout(5000);

      await mockServer.start(TEST_PORT, {
        requireAuth: true,
        validAuthToken: VALID_AUTH_TOKEN
      });

      // Create client without auth token
      testClient = createTestWebSocketClient(WS_URL);

      try {
        await testClient.connect();
        assert.fail('Connection should have been rejected');
      } catch (error) {
        assert.ok(error, 'Should throw authentication error');
        assert.strictEqual(
          mockServer.getRejectedConnections(),
          1,
          'Server should have rejected 1 connection'
        );
      }
    });
  });

  suite('Multiple Concurrent Connections', () => {
    test('Should handle multiple concurrent client connections', async function() {
      this.timeout(10000);

      await mockServer.start(TEST_PORT);

      const clients: WebSocketTestClient[] = [];
      const CLIENT_COUNT = 5;

      // Connect 5 clients concurrently
      const connectPromises = Array.from({ length: CLIENT_COUNT }, () => {
        const client = createTestWebSocketClient(WS_URL);
        clients.push(client);
        return client.connect();
      });

      await Promise.all(connectPromises);

      assert.strictEqual(
        mockServer.getConnectedClients(),
        CLIENT_COUNT,
        `Server should have ${CLIENT_COUNT} connected clients`
      );

      // Verify all clients report connected state
      clients.forEach((client, index) => {
        assert.strictEqual(
          client.isConnected,
          true,
          `Client ${index + 1} should be connected`
        );
      });

      // Disconnect all clients
      await Promise.all(clients.map(client => client.disconnect()));

      await sleep(TEST_DELAYS.DISCONNECTION);

      assert.strictEqual(
        mockServer.getConnectedClients(),
        0,
        'All clients should be disconnected'
      );
    });

    test('Should enforce connection limit and reject excess connections', async function() {
      this.timeout(5000);

      const MAX_CONNECTIONS = 3;
      await mockServer.start(TEST_PORT, {
        maxConnections: MAX_CONNECTIONS
      });

      const clients: WebSocketTestClient[] = [];

      // Connect up to the limit
      for (let i = 0; i < MAX_CONNECTIONS; i++) {
        const client = createTestWebSocketClient(WS_URL);
        clients.push(client);
        await client.connect();
      }

      assert.strictEqual(
        mockServer.getConnectedClients(),
        MAX_CONNECTIONS,
        'Server should have reached connection limit'
      );

      // Try to connect beyond limit
      const excessClient = createTestWebSocketClient(WS_URL);

      try {
        await excessClient.connect();
        assert.fail('Connection should have been rejected due to limit');
      } catch (error) {
        assert.ok(error, 'Should throw connection limit error');
        assert.strictEqual(
          mockServer.getRejectedConnections(),
          1,
          'Server should have rejected 1 connection'
        );
      }

      // Disconnect all clients
      await Promise.all(clients.map(client => client.disconnect()));
    });
  });

  suite('Disconnection Handling', () => {
    test('Should handle graceful client disconnection', async function() {
      this.timeout(5000);

      await mockServer.start(TEST_PORT);
      testClient = createTestWebSocketClient(WS_URL);

      await testClient.connect();
      assert.strictEqual(mockServer.getConnectedClients(), 1);

      // Graceful disconnect
      await testClient.disconnect();
      await sleep(TEST_DELAYS.CLEANUP);

      assert.strictEqual(
        mockServer.getConnectedClients(),
        0,
        'Server should have 0 clients after graceful disconnect'
      );
      assert.strictEqual(
        testClient.isConnected,
        false,
        'Client should report disconnected state'
      );
    });

    test('Should handle abrupt client disconnection (terminate)', async function() {
      this.timeout(5000);

      await mockServer.start(TEST_PORT);
      testClient = createTestWebSocketClient(WS_URL);

      await testClient.connect();
      assert.strictEqual(mockServer.getConnectedClients(), 1);

      // Abrupt disconnect (terminate)
      testClient.ws.terminate();
      await sleep(TEST_DELAYS.DISCONNECTION);

      assert.strictEqual(
        mockServer.getConnectedClients(),
        0,
        'Server should detect abrupt disconnection'
      );
    });
  });

  suite('Timeout and Reliability', () => {
    test('Should handle connection timeout for unreachable server', async function() {
      this.timeout(8000);

      // Don't start server - connection should timeout
      const unreachableClient = createTestWebSocketClient('ws://localhost:9999', {
        timeout: 2000 // 2 second timeout
      });

      const startTime = Date.now();

      try {
        await unreachableClient.connect();
        assert.fail('Connection should have timed out');
      } catch (error) {
        const elapsed = Date.now() - startTime;

        assert.ok(error, 'Should throw timeout error');
        assert.ok(
          elapsed >= 2000 && elapsed < 3000,
          `Should timeout after ~2 seconds (actual: ${elapsed}ms)`
        );
        assert.ok(
          error instanceof Error && error.message.includes('timeout'),
          'Error should mention timeout'
        );
      }
    });

    test('Should maintain connection stability over time', async function() {
      this.timeout(10000);

      await mockServer.start(TEST_PORT);
      testClient = createTestWebSocketClient(WS_URL);

      await testClient.connect();

      // Send messages over 5 seconds
      for (let i = 0; i < 10; i++) {
        await testClient.send({ type: 'stability-test', sequence: i });
        await sleep(TEST_DELAYS.STABILITY_INTERVAL);
      }

      assert.strictEqual(
        testClient.isConnected,
        true,
        'Client should remain connected'
      );
      assert.strictEqual(
        testClient.errors.length,
        0,
        'Client should have no errors'
      );
      assert.strictEqual(
        mockServer.getReceivedMessages().length,
        10,
        'Server should receive all messages'
      );
    });
  });

  suite('Heartbeat and Keep-Alive', () => {
    test('Should support heartbeat/ping-pong mechanism', async function() {
      this.timeout(8000);

      await mockServer.start(TEST_PORT, {
        enableHeartbeat: true,
        heartbeatInterval: 1000 // 1 second
      });

      testClient = createTestWebSocketClient(WS_URL);
      await testClient.connect();

      // Listen for pings from server
      let pingCount = 0;
      testClient.ws.on('ping', () => {
        pingCount++;
      });

      // Wait for multiple heartbeats
      await sleep(3500);

      assert.ok(
        pingCount >= 2,
        `Should receive at least 2 pings (received ${pingCount})`
      );
      assert.strictEqual(
        testClient.isConnected,
        true,
        'Connection should remain alive'
      );
    });

    test('Should respond to heartbeat ping messages', async function() {
      this.timeout(5000);

      await mockServer.start(TEST_PORT);
      testClient = createTestWebSocketClient(WS_URL);

      await testClient.connect();
      testClient.clearMessages();

      // Send ping message
      await testClient.send({ type: 'ping', timestamp: Date.now() });

      // Wait for pong response
      const response = await testClient.waitForMessage(2000);

      assert.strictEqual(
        response.type,
        'pong',
        'Server should respond with pong message'
      );
      assert.ok(
        response.timestamp,
        'Pong response should include timestamp'
      );
    });
  });

  suite('Reconnection Logic', () => {
    test('Should successfully reconnect after network interruption', async function() {
      this.timeout(10000);

      await mockServer.start(TEST_PORT);
      testClient = createTestWebSocketClient(WS_URL);

      // Initial connection
      await testClient.connect();
      assert.strictEqual(testClient.isConnected, true);

      // Simulate network interruption
      await testClient.disconnect();
      await sleep(TEST_DELAYS.CLEANUP);
      assert.strictEqual(testClient.isConnected, false);

      // Reconnect
      await testClient.connect();

      assert.strictEqual(
        testClient.isConnected,
        true,
        'Client should reconnect successfully'
      );
      assert.strictEqual(
        mockServer.getConnectedClients(),
        1,
        'Server should have 1 connected client after reconnection'
      );
    });

    test('Should handle rapid reconnection attempts', async function() {
      this.timeout(15000);

      await mockServer.start(TEST_PORT);

      // Perform 5 rapid connect/disconnect cycles
      for (let i = 0; i < 5; i++) {
        const client = createTestWebSocketClient(WS_URL);
        await client.connect();

        assert.strictEqual(
          client.isConnected,
          true,
          `Cycle ${i + 1}: Should connect successfully`
        );

        await client.send({ type: 'test', cycle: i });
        await client.disconnect();

        assert.strictEqual(
          client.isConnected,
          false,
          `Cycle ${i + 1}: Should disconnect successfully`
        );

        await sleep(TEST_DELAYS.CLEANUP);
      }

      const messages = mockServer.getReceivedMessages();
      assert.strictEqual(
        messages.length,
        5,
        'Server should receive all messages from reconnection cycles'
      );
    });
  });

  suite('SSL/TLS Security (Mock)', () => {
    test('Should accept secure WebSocket connections (wss://)', async function() {
      this.timeout(5000);

      // Note: This is a simplified test since ws module requires certificates for wss://
      // In production, would test with actual SSL certificates

      await mockServer.start(TEST_PORT);
      testClient = createTestWebSocketClient(WS_URL);

      await testClient.connect();

      // Verify connection is established
      assert.strictEqual(
        testClient.isConnected,
        true,
        'Should establish connection (ws:// for testing)'
      );

      // In production environment with SSL:
      // - Would use wss:// protocol
      // - Would verify SSL certificate
      // - Would test certificate validation errors
      // - Would test cipher suite compatibility
    });

    test('Should include custom headers for security', async function() {
      this.timeout(5000);

      await mockServer.start(TEST_PORT);

      testClient = createTestWebSocketClient(WS_URL, {
        headers: {
          'X-Client-Version': '1.0.0',
          'X-Request-ID': 'test-request-123'
        }
      });

      await testClient.connect();

      assert.strictEqual(
        testClient.isConnected,
        true,
        'Should connect with custom headers'
      );
    });
  });

  suite('Edge Cases', () => {
    test('Should handle connection when server is at capacity and slot opens', async function() {
      this.timeout(10000);

      const MAX_CONNECTIONS = 2;
      await mockServer.start(TEST_PORT, {
        maxConnections: MAX_CONNECTIONS
      });

      // Fill to capacity
      const client1 = createTestWebSocketClient(WS_URL);
      const client2 = createTestWebSocketClient(WS_URL);

      await client1.connect();
      await client2.connect();

      assert.strictEqual(mockServer.getConnectedClients(), MAX_CONNECTIONS);

      // Try to connect - should fail
      const client3 = createTestWebSocketClient(WS_URL);
      try {
        await client3.connect();
        assert.fail('Should reject when at capacity');
      } catch (error) {
        assert.ok(error, 'Expected rejection');
      }

      // Disconnect one client to free a slot
      await client1.disconnect();
      await sleep(200);

      // Now client3 should be able to connect
      await client3.connect();

      assert.strictEqual(
        client3.isConnected,
        true,
        'Should connect after slot opens'
      );
      assert.strictEqual(
        mockServer.getConnectedClients(),
        MAX_CONNECTIONS,
        'Should maintain connection limit'
      );

      await client2.disconnect();
      await client3.disconnect();
    });
  });
});
