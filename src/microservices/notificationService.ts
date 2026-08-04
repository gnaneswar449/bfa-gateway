import { NotificationLog } from './types';

const NOTIFICATIONS_DB: NotificationLog[] = [];

export class NotificationService {
  public static sendNotification(recipientId: string, channel: 'EMAIL' | 'SMS', message: string) {
    const notif: NotificationLog = {
      notificationId: `notif_${Date.now().toString().slice(-4)}`,
      recipientId,
      channel,
      message,
      sentAt: new Date().toISOString()
    };

    NOTIFICATIONS_DB.push(notif);
    return { success: true, notification: notif };
  }

  public static getNotificationLogs(): NotificationLog[] {
    return NOTIFICATIONS_DB;
  }
}
