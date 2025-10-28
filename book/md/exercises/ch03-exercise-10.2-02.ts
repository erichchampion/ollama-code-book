class EmailService {
  constructor(private notificationService: NotificationService) {}

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    await this.send(to, subject, body);
    await this.notificationService.recordSent('email', to);
  }
}

class NotificationService {
  constructor(private emailService: EmailService) {}

  async notify(user: User, message: string): Promise<void> {
    await this.emailService.sendEmail(user.email, 'Notification', message);
    this.recordSent('notification', user.id);
  }

  recordSent(type: string, recipient: string): void {
    // Record in database
  }
}