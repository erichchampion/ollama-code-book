import http from 'http';
import https from 'https';

/**
 * HTTP agent with connection pooling
 */
export class ConnectionPool {
  private httpAgent: http.Agent;
  private httpsAgent: https.Agent;

  constructor(options: PoolOptions = {}) {
    this.httpAgent = new http.Agent({
      keepAlive: true,
      keepAliveMsecs: options.keepAliveMsecs || 1000,
      maxSockets: options.maxSockets || 50,
      maxFreeSockets: options.maxFreeSockets || 10,
      timeout: options.timeout || 60000
    });

    this.httpsAgent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: options.keepAliveMsecs || 1000,
      maxSockets: options.maxSockets || 50,
      maxFreeSockets: options.maxFreeSockets || 10,
      timeout: options.timeout || 60000
    });
  }

  /**
   * Get HTTP agent
   */
  getHttpAgent(): http.Agent {
    return this.httpAgent;
  }

  /**
   * Get HTTPS agent
   */
  getHttpsAgent(): https.Agent {
    return this.httpsAgent;
  }

  /**
   * Get agent stats
   */
  getStats(): PoolStats {
    return {
      http: this.getAgentStats(this.httpAgent),
      https: this.getAgentStats(this.httpsAgent)
    };
  }

  private getAgentStats(agent: http.Agent): AgentStats {
    return {
      sockets: Object.keys(agent.sockets).length,
      freeSockets: Object.keys(agent.freeSockets || {}).length,
      requests: Object.keys(agent.requests || {}).length
    };
  }

  /**
   * Destroy all connections
   */
  destroy(): void {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }
}

interface PoolOptions {
  keepAliveMsecs?: number;
  maxSockets?: number;
  maxFreeSockets?: number;
  timeout?: number;
}

interface PoolStats {
  http: AgentStats;
  https: AgentStats;
}

interface AgentStats {
  sockets: number;
  freeSockets: number;
  requests: number;
}