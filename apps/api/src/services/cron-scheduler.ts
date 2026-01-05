import cron from 'node-cron';
import { checkAndSendNotifications } from './notification-scheduler.js';

let scheduledTask: cron.ScheduledTask | null = null;

export function startNotificationScheduler() {
  // Stop existing scheduler if running
  if (scheduledTask) {
    scheduledTask.stop();
  }

  // Schedule daily check at 9:00 AM
  scheduledTask = cron.schedule('0 9 * * *', async () => {
    console.log('Running scheduled notification check...');
    try {
      await checkAndSendNotifications();
      console.log('Notification check completed');
    } catch (error) {
      console.error('Error during scheduled notification check:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Africa/Cairo', // Adjust to your timezone
  });

  console.log('Notification scheduler started (daily at 9:00 AM)');
}

export function stopNotificationScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('Notification scheduler stopped');
  }
}

