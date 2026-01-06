import express from 'express';
import { emailService } from '../services/email-service.js';
import {
  loadNotificationSettings,
  saveNotificationSettings,
  checkAndSendNotifications,
} from '../services/notification-scheduler.js';
import { requireAuth, requireRole } from '../utils/auth.js';

const notificationsRouter = express.Router();

// Configure email service
notificationsRouter.post('/email/configure', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { host, port, secure, auth } = req.body;

    // Validate required fields
    if (!host || !port) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: host and port are required',
      });
    }

    if (!auth || !auth.user || !auth.password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: auth.user and auth.password are required',
      });
    }

    // Trim and validate values
    const trimmedHost = String(host).trim();
    const trimmedUser = String(auth.user).trim();
    const trimmedPassword = String(auth.password).trim();

    if (!trimmedHost || !trimmedUser || !trimmedPassword) {
      return res.status(400).json({
        success: false,
        error: 'All fields must have non-empty values',
      });
    }

    try {
      emailService.initialize({
        host: trimmedHost,
        port: parseInt(String(port)),
        secure: secure === true,
        auth: {
          user: trimmedUser,
          password: trimmedPassword,
        },
      });

      // Test connection
      await emailService.testConnection();
      res.json({
        success: true,
        message: 'Email service configured and connection verified',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Email configuration failed: ' + (error.message || String(error)),
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// Get notification settings
notificationsRouter.get('/settings', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), (req, res) => {
  try {
    const settings = loadNotificationSettings();
    res.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Update notification settings
notificationsRouter.post('/settings', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), (req, res) => {
  try {
    const {
      enabled,
      contractRenewalDays,
      idExpiryDays,
      recipients,
      baseUrl,
      language,
    } = req.body;

    const currentSettings = loadNotificationSettings();
    const newSettings = {
      enabled: enabled !== undefined ? enabled : currentSettings.enabled,
      contractRenewalDays: contractRenewalDays || currentSettings.contractRenewalDays,
      idExpiryDays: idExpiryDays || currentSettings.idExpiryDays,
      recipients: recipients || currentSettings.recipients,
      baseUrl: baseUrl || currentSettings.baseUrl,
      language: language || currentSettings.language,
    };

    saveNotificationSettings(newSettings);

    res.json({
      success: true,
      message: 'Notification settings updated',
      settings: newSettings,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Manually trigger notification check
notificationsRouter.post('/send', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const result = await checkAndSendNotifications();
    res.json({
      success: result.success !== false,
      message: result.message || 'Notification check completed',
      totalSent: result.totalSent || 0,
      totalErrors: result.totalErrors || 0,
      errors: result.errors,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send notifications',
    });
  }
});

// Test email connection
notificationsRouter.post('/email/test', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    await emailService.testConnection();
    res.json({
      success: true,
      message: 'Email connection successful',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'Email connection failed: ' + error.message,
    });
  }
});

// Send test notification email
notificationsRouter.post('/email/send-test', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const settings = loadNotificationSettings();

    if (settings.recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No notification recipients configured',
      });
    }

    // Check if email service is initialized
    try {
      await emailService.testConnection();
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: 'Email service is not configured or connection failed. Please configure email settings first.',
      });
    }

    // Create test employee data
    const testEmployee = {
      id: 'test-employee-id',
      name: 'Test Employee',
      employeeCode: 'TEST-001',
      contractRenewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      nationalIdValidTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    };

    // Send test contract renewal notification
    try {
      await emailService.sendContractRenewalNotification(
        testEmployee,
        30,
        settings.recipients,
        {
          employeeId: testEmployee.id,
          baseUrl: settings.baseUrl,
          language: settings.language,
        }
      );

      res.json({
        success: true,
        message: `Test notification sent to ${settings.recipients.length} recipient(s)`,
        recipients: settings.recipients.map(r => r.email),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to send test notification: ' + error.message,
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test notification',
    });
  }
});

export default notificationsRouter;

