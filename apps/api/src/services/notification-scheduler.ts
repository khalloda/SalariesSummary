import { PrismaClient } from '@prisma/client';
import { emailService } from './email-service.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

interface NotificationSettings {
  enabled: boolean;
  contractRenewalDays: number[];
  idExpiryDays: number[];
  recipients: Array<{ email: string; name?: string }>;
  baseUrl?: string;
  language?: 'en' | 'ar';
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  contractRenewalDays: [30, 14, 7, 1],
  idExpiryDays: [30, 14, 7, 1],
  recipients: [],
  baseUrl: 'http://localhost:3000',
  language: 'en',
};

function getSettingsPath(): string {
  return join(__dirname, '..', '..', 'notification-config.json');
}

export function loadNotificationSettings(): NotificationSettings {
  try {
    const settingsPath = getSettingsPath();
    const settingsContent = readFileSync(settingsPath, 'utf-8');
    return JSON.parse(settingsContent);
  } catch {
    return defaultSettings;
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  const settingsPath = getSettingsPath();
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

export async function checkAndSendNotifications() {
  const settings = loadNotificationSettings();

  if (!settings.enabled) {
    const message = 'Notifications are disabled';
    console.log(message);
    throw new Error(message);
  }

  if (settings.recipients.length === 0) {
    const message = 'No notification recipients configured';
    console.log(message);
    throw new Error(message);
  }

  // Check if email service is initialized
  try {
    await emailService.testConnection();
  } catch (error: any) {
    const message = 'Email service is not configured or connection failed. Please configure email settings first.';
    console.error(message, error);
    throw new Error(message);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalSent = 0;
  let totalErrors = 0;
  const errors: string[] = [];

  // Check contract renewals
  for (const days of settings.contractRenewalDays) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + days);

    const employees = await prisma.employee.findMany({
      where: {
        contractRenewalDate: {
          gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
          lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1),
        },
        status: {
          not: 'Resigned',
        },
      },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        contractRenewalDate: true,
      },
    });

    for (const employee of employees) {
      if (employee.contractRenewalDate) {
        try {
          await emailService.sendContractRenewalNotification(
            {
              id: employee.id,
              name: employee.name,
              employeeCode: employee.employeeCode,
              contractRenewalDate: employee.contractRenewalDate,
            },
            days,
            settings.recipients,
            {
              employeeId: employee.id,
              baseUrl: settings.baseUrl,
              language: settings.language,
            }
          );
          console.log(`Sent contract renewal notification for ${employee.name} (${days} days)`);
          totalSent++;
        } catch (error: any) {
          const errorMsg = `Failed to send contract renewal notification for ${employee.name}: ${error.message || error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          totalErrors++;
        }
      }
    }
  }

  // Check ID expiries
  for (const days of settings.idExpiryDays) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + days);

    const employees = await prisma.employee.findMany({
      where: {
        nationalIdValidTill: {
          gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
          lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1),
        },
        status: {
          not: 'Resigned',
        },
      },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        nationalIdValidTill: true,
      },
    });

    for (const employee of employees) {
      if (employee.nationalIdValidTill) {
        try {
          await emailService.sendIdExpiryNotification(
            {
              id: employee.id,
              name: employee.name,
              employeeCode: employee.employeeCode,
              nationalIdValidTill: employee.nationalIdValidTill,
            },
            days,
            settings.recipients,
            {
              employeeId: employee.id,
              baseUrl: settings.baseUrl,
              language: settings.language,
            }
          );
          console.log(`Sent ID expiry notification for ${employee.name} (${days} days)`);
          totalSent++;
        } catch (error: any) {
          const errorMsg = `Failed to send ID expiry notification for ${employee.name}: ${error.message || error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          totalErrors++;
        }
      }
    }
  }

  // Return summary
  return {
    success: totalErrors === 0,
    totalSent,
    totalErrors,
    errors: errors.length > 0 ? errors : undefined,
    message: totalSent > 0 
      ? `Sent ${totalSent} notification(s)${totalErrors > 0 ? ` with ${totalErrors} error(s)` : ''}`
      : totalErrors > 0
      ? `No notifications sent. ${totalErrors} error(s) occurred.`
      : 'No notifications to send. No employees found matching the configured reminder days.',
  };
}

