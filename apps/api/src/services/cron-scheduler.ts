import cron from 'node-cron';
import { prisma } from '../db/prisma.js';
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

  // Schedule daily audit log retention (delete entries older than 1 year) at 02:30 AM
  cron.schedule('30 2 * * *', async () => {
    console.log('Running scheduled audit log retention job...');
    try {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1);

      const result = await prisma.auditLog.deleteMany({
        where: {
          timestamp: { lt: cutoff },
        },
      });

      console.log(`Audit log retention completed. Deleted ${result.count} records older than ${cutoff.toISOString()}.`);
    } catch (error) {
      console.error('Error during audit log retention job:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Africa/Cairo',
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

