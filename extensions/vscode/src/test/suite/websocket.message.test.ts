/**
 * WebSocket Message Processing Tests
 * Comprehensive tests for message parsing, validation, routing, and error handling
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

suite('WebSocket Message Processing Tests', () => {
  const TEST_PORT = WEBSOCKET_TEST_CONSTANTS.PORTS.MESSAGE_TESTS;
  const WS_URL = `ws://localhost:${TEST_PORT}`;

  let mockServer: MockMCPServer;
  let testClient: WebSocketTestClient;

  setup(async function() {
    this.timeout(10000);
    mockServer = createMockMCPServer();
    await mockServer.start(TEST_PORT);
    testClient = createTestWebSocketClient(WS_URL);
    await testClient.connect();
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

  suite('JSON Message Parsing', () => {
    test('Should parse valid JSON messages correctly', async function() {
      this.timeout(3000);

      const validMessage = {
        type: 'command',
        id: 'req-123',
        payload: {
          action: 'analyze',
          data: { file: 'test.js' }
        }
      };

      await testClient.send(validMessage);
      await sleep(TEST_DELAYS.MESSAGE_PROCESSING);

      const received = mockServer.getReceivedMessages();
      assert.strictEqual(received.length, 1, 'Should receive 1 message');
      assert.deepStrictEqual(
        received[0],
        validMessage,
        'Parsed message should match original'
      );
    });

    test('Should handle messages with nested objects', async function() {
      this.timeout(3000);

      const nestedMessage = {
        type: 'data',
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0',
          context: {
            file: 'app.ts',
            line: 42,
            column: 10
          }
        },
        payload: {
          content: 'test content',
          options: {
            format: 'json',
            pretty: true
          }
        }
      };

      await testClient.send(nestedMessage);
      await sleep(TEST_DELAYS.MESSAGE_PROCESSING);

      const received = mockServer.getReceivedMessages();
      assert.deepStrictEqual(
        received[0],
        nestedMessage,
        'Nested objects should be preserved'
      );
    });

    test('Should handle messages with arrays', async function() {
      this.timeout(3000);

      const messageWithArray = {
        type: 'batch',
        items: [
          { id: 1, action: 'create' },
          { id: 2, action: 'update' },
          { id: 3, action: 'delete' }
        ],
        tags: ['test', 'batch', 'operation']
      };

      await testClient.send(messageWithArray);
      await sleep(TEST_DELAYS.MESSAGE_PROCESSING);

      const received = mockServer.getReceivedMessages();
      assert.strictEqual(received[0].items.length, 3, 'Array length should be preserved');
      assert.deepStrictEqual(
        received[0].tags,
        ['test', 'batch', 'operation'],
        'String arrays should be preserved'
      );
    });
  });

  suite('Invalid Message Handling', () => {
    test('Should handle malformed JSON gracefully', async function() {
      this.timeout(3000);

      const malformedJSON = '{invalid json}';
      await testClient.send(malformedJSON);
      await sleep(TEST_DELAYS.MESSAGE_PROCESSING);

      const received = mockServer.getReceivedMessages();
      assert.strictEqual(
        received.length,
        1,
        'Server should receive malformed message'
      );
      assert.strictEqual(
        received[0],
        malformedJSON,
        'Server should receive message as string'
      );
    });

    test('Should handle empty messages', async function() {
      this.timeout(3000);

      const emptyMessage = {};
      await testClient.send(emptyMessage);
      await sleep(TEST_DELAYS.MESSAGE_PROCESSING);

      const received = mockServer.getReceivedMessages();
      assert.strictEqual(received.length, 1, 'Should receive empty object');
      assert.deepStrictEqual(received[0], {}, 'Empty object should be preserved');
    });

    test('Should handle null and undefined values in messages', async function() {
      this.timeout(3000);

      const messageWithNulls = {
        type: 'test',
        nullValue: null,
        // undefined values are omitted during JSON.stringify
        validValue: 'present'
      };

      await testClient.send(messageWithNulls);
      await sleep(TEST_DELAYS.MESSAGE_PROCESSING);

      const received = mockServer.getReceivedMessages();
      assert.strictEqual(received[0].nullValue, null, 'Null values should be preserved');
      assert.strictEqual(received[0].validValue, 'present', 'Valid values should be present');
    });

    test('Should handle special characters in messages', async function() {
      this.timeout(3000);

      const messageWithSpecialChars = {
        type: 'text',
        content: 'Special chars: \n\t\r\b\f\\"\'/™©®→←↑↓€£¥',
        unicode: '你好世界 🌍🚀✨',
        emoji: '😀😃😄😁🎉'
      };

      await testClient.send(messageWithSpecialChars);
      await sleep(TEST_DELAYS.MESSAGE_PROCESSING);

      const received = mockServer.getReceivedMessages();
      assert.strictEqual(
        received[0].content,
        messageWithSpecialChars.content,
        'Special characters should be preserved'
      );
      assert.strictEqual(
        received[0].unicode,
        messageWithSpecialChars.unicode,
        'Unicode should be preserved'
      );
      assert.strictEqual(
        received[0].emoji,
        messageWithSpecialChars.emoji,
        'Emoji should be preserved'
      );
    });
  });

  suite('Message Routing and Correlation', () => {
    test('Should handle request-response correlation with request IDs', async function() {
      this.timeout(5000);

      const requests = [
        { type: 'request', id: 'req-001', action: 'analyze' },
        { type: 'request', id: 'req-002', action: 'refactor' },
        { type: 'request', id: 'req-003', action: 'test' }
      ];

      // Send all requests
      for (const req of requests) {
        await testClient.send(req);
        await sleep(50);
      }

      const received = mockServer.getReceivedMessages();
      assert.strictEqual(received.length, 3, 'Should receive all 3 requests');

      // Verify each request maintained its ID
      requests.forEach((original, index) => {
        assert.strictEqual(
          received[index].id,
          original.id,
          `Request ${index + 1} should maintain ID`
        );
      });
    });

    test('Should handle concurrent message processing', async function() {
      this.timeout(5000);

      const MESSAGE_COUNT = 10;
      const messages = Array.from({ length: MESSAGE_COUNT }, (_, i) => ({
        type: 'concurrent',
        sequence: i,
        timestamp: Date.now()
      }));

      // Send all messages concurrently
      await Promise.all(messages.map(msg => testClient.send(msg)));
      await sleep(200);

      const received = mockServer.getReceivedMessages();
      assert.strictEqual(
        received.length,
        MESSAGE_COUNT,
        `Should receive all ${MESSAGE_COUNT} messages`
      );

      // Verify all sequence numbers are present
      const sequences = received.map((msg: any) => msg.sequence).sort((a: number, b: number) => a - b);
      const expectedSequences = Array.from({ length: MESSAGE_COUNT }, (_, i) => i);
      assert.deepStrictEqual(
        sequences,
        expectedSequences,
        'All sequence numbers should be present'
      );
    });

    test('Should handle message type routing', async function() {
      this.timeout(3000);

      const messages = [
        { type: 'command', action: 'start' },
        { type: 'query', question: 'status?' },
        { type: 'event', name: 'update' },
        { type: 'notification', message: 'info' }
      ];

      for (const msg of messages) {
        await testClient.send(msg);
      }
      await sleep(TEST_DELAYS.MESSAGE_PROCESSING);

      const received = mockServer.getReceivedMessages();
      const types = received.map((msg: any) => msg.type);

      assert.deepStrictEqual(
        types,
        ['command', 'query', 'event', 'notification'],
        'All message types should be preserved'
      );
    });
  });

  suite('Message Size and Performance', () => {
    test('Should handle large messages (>1MB)', async function() {
      this.timeout(5000);

      // Create 1MB payload
      const largeData = 'x'.repeat(1024 * 1024);
      const largeMessage = {
        type: 'large-data',
        size: largeData.length,
        payload: largeData
      };

      await testClient.send(largeMessage);
      await sleep(300);

      const received = mockServer.getReceivedMessages();
      assert.strictEqual(received.length, 1, 'Should receive large message');
      assert.strictEqual(
        received[0].payload.length,
        largeData.length,
        'Large payload should be intact'
      );
    });

    test('Should handle message queue with rapid messages', async function() {
      this.timeout(5000);

      const RAPID_MESSAGE_COUNT = 50;

      // Send 50 messages as fast as possible
      for (let i = 0; i < RAPID_MESSAGE_COUNT; i++) {
        await testClient.send({ type: 'rapid', index: i });
      }

      await sleep(500);

      const received = mockServer.getReceivedMessages();
      assert.strictEqual(
        received.length,
        RAPID_MESSAGE_COUNT,
        `Should receive all ${RAPID_MESSAGE_COUNT} rapid messages`
      );

      // Verify order is preserved
      for (let i = 0; i < RAPID_MESSAGE_COUNT; i++) {
        assert.strictEqual(
          received[i].index,
          i,
          `Message ${i} should have correct index`
        );
      }
    });

    test('Should handle empty payload messages efficiently', async function() {
      this.timeout(3000);

      const emptyPayloadMessages = [
        { type: 'ping' },
        { type: 'heartbeat' },
        { type: 'ack' },
        { type: 'noop' }
      ];

      for (const msg of emptyPayloadMessages) {
        await testClient.send(msg);
      }
      await sleep(TEST_DELAYS.MESSAGE_PROCESSING);

      const received = mockServer.getReceivedMessages();
      assert.strictEqual(
        received.length,
        4,
        'Should receive all empty payload messages'
      );
    });
  });

  suite('Message Validation and Error Handling', () => {
    test('Should handle unknown message types gracefully', async function() {
      this.timeout(3000);

      const unknownTypeMessage = {
        type: 'completely-unknown-type-xyz',
        data: 'test data'
      };

      await testClient.send(unknownTypeMessage);
      await sleep(TEST_DELAYS.MESSAGE_PROCESSING);

      const received = mockServer.getReceivedMessages();
      assert.strictEqual(
        received.length,
        1,
        'Should receive unknown message type'
      );
      assert.strictEqual(
        received[0].type,
        'completely-unknown-type-xyz',
        'Unknown type should be preserved'
      );
    });

    test('Should handle messages with missing required fields', async function() {
      this.timeout(3000);

      const incompleteMessage = {
        // Missing 'type' field
        data: 'some data',
        timestamp: Date.now()
      };

      await testClient.send(incompleteMessage);
      await sleep(TEST_DELAYS.MESSAGE_PROCESSING);

      const received = mockServer.getReceivedMessages();
      assert.strictEqual(received.length, 1, 'Should receive incomplete message');
      assert.strictEqual(received[0].type, undefined, 'Type field should be undefined');
    });

    test('Should handle messages with extra unexpected fields', async function() {
      this.timeout(3000);

      const messageWithExtras = {
        type: 'standard',
        expectedField: 'value1',
        unexpectedField1: 'extra1',
        unexpectedField2: 'extra2',
        unexpectedField3: { nested: 'extra3' }
      };

      await testClient.send(messageWithExtras);
      await sleep(TEST_DELAYS.MESSAGE_PROCESSING);

      const received = mockServer.getReceivedMessages();
      assert.ok(
        received[0].unexpectedField1,
        'Extra fields should be preserved'
      );
      assert.deepStrictEqual(
        received[0],
        messageWithExtras,
        'All fields should be preserved'
      );
    });
  });

  suite('Binary and Complex Data', () => {
    test('Should handle messages with binary-like data (base64)', async function() {
      this.timeout(3000);

      const binaryData = Buffer.from('Hello World').toString('base64');
      const binaryMessage = {
        type: 'binary',
        encoding: 'base64',
        data: binaryData
      };

      await testClient.send(binaryMessage);
      await sleep(TEST_DELAYS.MESSAGE_PROCESSING);

      const received = mockServer.getReceivedMessages();
      assert.strictEqual(
        received[0].data,
        binaryData,
        'Base64 data should be preserved'
      );
      assert.strictEqual(
        Buffer.from(received[0].data, 'base64').toString(),
        'Hello World',
        'Base64 data should be decodable'
      );
    });

    test('Should handle messages with numeric precision', async function() {
      this.timeout(3000);

      const numericMessage = {
        type: 'numeric',
        integer: 42,
        float: 3.14159265359,
        negative: -123.456,
        scientific: 1.23e-10,
        large: 9007199254740991, // Number.MAX_SAFE_INTEGER
      };

      await testClient.send(numericMessage);
      await sleep(TEST_DELAYS.MESSAGE_PROCESSING);

      const received = mockServer.getReceivedMessages();
      assert.strictEqual(received[0].integer, 42, 'Integer should be exact');
      assert.strictEqual(
        received[0].float.toFixed(11),
        '3.14159265359',
        'Float precision should be maintained'
      );
      assert.strictEqual(received[0].large, 9007199254740991, 'Large numbers should be exact');
    });
  });
});
