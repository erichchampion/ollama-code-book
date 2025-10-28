/**
 * Sends alerts via multiple channels
 */
export class AlertingService {
  private channels: AlertChannel[] = [];
  private logger: StructuredLogger;

  constructor(logger: StructuredLogger) {
    this.logger = logger;
  }

  /**
   * Add alert channel
   */
  addChannel(channel: AlertChannel): void {
    this.channels.push(channel);
  }

  /**
   * Send alert
   */
  async send(alert: Alert): Promise<void> {
    this.logger.info('Sending alert', {
      severity: alert.severity,
      title: alert.title
    });

    // Send to all channels
    await Promise.all(
      this.channels.map(channel => channel.send(alert))
    );
  }
}

interface Alert {
  severity: AlertSeverity;
  title: string;
  message: string;
  context?: Record<string, any>;
}

enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

interface AlertChannel {
  send(alert: Alert): Promise<void>;
}

/**
 * Slack alert channel
 */
export class SlackAlertChannel implements AlertChannel {
  constructor(private webhookUrl: string) {}

  async send(alert: Alert): Promise<void> {
    const color = {
      [AlertSeverity.INFO]: '#36a64f',
      [AlertSeverity.WARNING]: '#ff9900',
      [AlertSeverity.CRITICAL]: '#ff0000'
    }[alert.severity];

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color,
          title: alert.title,
          text: alert.message,
          fields: alert.context ? Object.entries(alert.context).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true
          })) : []
        }]
      })
    });
  }
}

/**
 * Email alert channel
 */
export class EmailAlertChannel implements AlertChannel {
  constructor(private emailService: any) {}

  async send(alert: Alert): Promise<void> {
    await this.emailService.send({
      to: 'ops@example.com',
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      body: alert.message
    });
  }
}