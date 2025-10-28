/**
 * IDE Server Command
 *
 * Start/stop/status commands for the IDE Integration Server
 */

import { CommandDef, CommandArgDef, ArgType } from './index.js';
import { normalizeError } from '../utils/error-utils.js';
import { getIDEIntegrationServer } from '../core/services.js';
import { logger } from '../utils/logger.js';
import { IDE_SERVER_DEFAULTS } from '../constants/websocket.js';

export const ideServerCommand: CommandDef = {
  name: 'ide-server',
  description: 'Manage IDE Integration Server for extension communication',
  examples: [
    'ollama-code ide-server start',
    `ollama-code ide-server start --port ${IDE_SERVER_DEFAULTS.PORT}`,
    'ollama-code ide-server stop',
    'ollama-code ide-server status'
  ],
  args: [
    {
      name: 'action',
      description: 'Action to perform (start, stop, status)',
      type: ArgType.STRING,
      position: 0,
      required: true
    },
    {
      name: 'port',
      description: 'Port for the IDE Integration Server',
      type: ArgType.NUMBER,
      shortFlag: 'p',
      default: IDE_SERVER_DEFAULTS.PORT.toString()
    },
    {
      name: 'background',
      description: 'Run server in background (daemon mode)',
      type: ArgType.BOOLEAN,
      shortFlag: 'b'
    }
  ],

  async handler(args: Record<string, any>): Promise<void> {
    const action = args.action as 'start' | 'stop' | 'status';
    const port = (args.port || IDE_SERVER_DEFAULTS.PORT) as number;

    try {
      const server = await getIDEIntegrationServer() as any;

      switch (action) {
        case 'start':
          if (server.getStatus().isRunning) {
            console.log('IDE Integration Server is already running');
            return;
          }

          console.log(`Starting IDE Integration Server on port ${port}...`);
          await server.start();

          console.log(`✅ IDE Integration Server started successfully`);
          console.log(`   WebSocket endpoint: ws://localhost:${port}`);
          console.log(`   Ready for VS Code extension connections`);

          if (args.background) {
            console.log('   Running in background mode');
            // Keep process alive in background
            process.stdin.resume();
          }
          break;

        case 'stop':
          if (!server.getStatus().isRunning) {
            console.log('IDE Integration Server is not running');
            return;
          }

          console.log('Stopping IDE Integration Server...');
          await server.stop();
          console.log('✅ IDE Integration Server stopped successfully');
          break;

        case 'status':
          const status = server.getStatus();
          const clients = server.getConnectedClients();

          console.log('\n📊 IDE Integration Server Status');
          console.log('================================');
          console.log(`Status: ${status.isRunning ? '🟢 Running' : '🔴 Stopped'}`);
          console.log(`Port: ${status.port}`);
          console.log(`Connected Clients: ${status.clientCount}`);

          if (status.uptime) {
            const uptimeSeconds = Math.floor(status.uptime / 1000);
            console.log(`Uptime: ${uptimeSeconds}s`);
          }

          if (clients.length > 0) {
            console.log('\n📱 Connected Clients:');
            clients.forEach((client: any) => {
              const lastActivityAgo = Math.floor((Date.now() - client.lastActivity) / 1000);
              console.log(`  • ${client.id} (${lastActivityAgo}s ago)`);
            });
          }

          console.log('\n🔧 Server Capabilities:');
          console.log('  • Real-time AI assistance');
          console.log('  • Code analysis and suggestions');
          console.log('  • Workspace intelligence');
          console.log('  • Command execution');
          console.log('  • Progress streaming');
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

    } catch (error) {
      logger.error('IDE server command failed:', error);
      throw new Error(`IDE server ${action} failed: ${normalizeError(error).message}`);
    }
  }
};

// Register command
export default ideServerCommand;
