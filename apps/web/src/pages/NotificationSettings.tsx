import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { useAuth } from '../hooks/useAuth';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    password: string;
  };
}

interface NotificationSettings {
  enabled: boolean;
  contractRenewalDays: number[];
  idExpiryDays: number[];
  recipients: Array<{ email: string; name?: string }>;
  baseUrl: string;
  language: 'en' | 'ar';
}

export default function NotificationSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [forceSending, setForceSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    host: '',
    port: 587,
    secure: false,
    auth: {
      user: '',
      password: '',
    },
  });

  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    contractRenewalDays: [30, 14, 7, 1],
    idExpiryDays: [30, 14, 7, 1],
    recipients: [],
    baseUrl: 'http://localhost:3000',
    language: 'en',
  });

  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [newRecipientName, setNewRecipientName] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/notifications/settings`);
      if (response.data.success) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailConfigChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setEmailConfig(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof EmailConfig],
          [child]: value,
        },
      }));
    } else {
      setEmailConfig(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSettingsChange = (field: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddRecipient = () => {
    if (newRecipientEmail.trim()) {
      setSettings(prev => ({
        ...prev,
        recipients: [
          ...prev.recipients,
          {
            email: newRecipientEmail.trim(),
            name: newRecipientName.trim() || undefined,
          },
        ],
      }));
      setNewRecipientEmail('');
      setNewRecipientName('');
    }
  };

  const handleRemoveRecipient = (index: number) => {
    setSettings(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index),
    }));
  };

  const handleConfigureEmail = async () => {
    setSaving(true);
    setMessage(null);
    
    // Validate required fields with detailed checks
    const missingFields: string[] = [];
    if (!emailConfig.host || emailConfig.host.trim() === '') {
      missingFields.push('SMTP Host');
    }
    if (!emailConfig.auth.user || emailConfig.auth.user.trim() === '') {
      missingFields.push('Email Address');
    }
    if (!emailConfig.auth.password || emailConfig.auth.password.trim() === '') {
      missingFields.push('Password');
    }
    
    if (missingFields.length > 0) {
      setMessage({ 
        type: 'error', 
        text: `Please fill in all required fields: ${missingFields.join(', ')}` 
      });
      setSaving(false);
      return;
    }
    
    try {
      // Ensure password is included in the request
      const configToSend = {
        host: emailConfig.host.trim(),
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
          user: emailConfig.auth.user.trim(),
          password: emailConfig.auth.password.trim(),
        },
      };
      
      const response = await axios.post(`${API_BASE_URL}/notifications/email/configure`, configToSend);
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Email service configured successfully!' });
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Failed to configure email' });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to configure email';
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTesting(true);
    setMessage(null);
    
    // Validate required fields with detailed checks
    const missingFields: string[] = [];
    if (!emailConfig.host || emailConfig.host.trim() === '') {
      missingFields.push('SMTP Host');
    }
    if (!emailConfig.auth.user || emailConfig.auth.user.trim() === '') {
      missingFields.push('Email Address');
    }
    if (!emailConfig.auth.password || emailConfig.auth.password.trim() === '') {
      missingFields.push('Password');
    }
    
    if (missingFields.length > 0) {
      setMessage({ 
        type: 'error', 
        text: `Please fill in all required fields before testing: ${missingFields.join(', ')}` 
      });
      setTesting(false);
      return;
    }
    
    try {
      // Ensure password is included in the request
      const configToSend = {
        host: emailConfig.host.trim(),
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
          user: emailConfig.auth.user.trim(),
          password: emailConfig.auth.password.trim(),
        },
      };
      
      // First, configure the email service with current form values
      const configResponse = await axios.post(`${API_BASE_URL}/notifications/email/configure`, configToSend);
      if (!configResponse.data.success) {
        setMessage({ type: 'error', text: configResponse.data.error || 'Failed to configure email' });
        setTesting(false);
        return;
      }

      // Then test the connection
      const testResponse = await axios.post(`${API_BASE_URL}/notifications/email/test`);
      if (testResponse.data.success) {
        setMessage({ type: 'success', text: 'Email connection test successful!' });
      } else {
        setMessage({ type: 'error', text: testResponse.data.error || 'Email connection test failed' });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Email connection test failed';
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/notifications/settings`, settings);
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Notification settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Failed to save settings' });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || error.message || 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestNotifications = async () => {
    setSending(true);
    setMessage(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/notifications/send`);
      if (response.data.success) {
        const messageText = response.data.message || 'Notification check completed!';
        const details = response.data.totalSent > 0 
          ? ` Sent ${response.data.totalSent} notification(s).`
          : ' No notifications were sent (no matching employees found).';
        setMessage({ 
          type: 'success', 
          text: messageText + details 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: response.data.error || response.data.message || 'Failed to send notifications' 
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send notifications';
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendTestEmail = async () => {
    setSending(true);
    setMessage(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/notifications/email/send-test`);
      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Test email sent successfully to ${response.data.recipients?.length || 0} recipient(s)! Check your email inbox.` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: response.data.error || 'Failed to send test email' 
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send test email';
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setSending(false);
    }
  };

  const handleForceSend30Days = async () => {
    if (!confirm(t('forceSend30DaysConfirm') || 'Are you sure you want to force send notifications for all contracts and IDs expiring within 30 days?')) {
      return;
    }

    setForceSending(true);
    setMessage(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/notifications/force-send-30-days`);
      if (response.data.success) {
        const details = response.data.sentNotifications && response.data.sentNotifications.length > 0
          ? `\n\nSent notifications:\n${response.data.sentNotifications.map((n: any) => `- ${n.type === 'contract' ? 'Contract' : 'ID'} renewal for ${n.employee} (${n.days} days)`).join('\n')}`
          : '';
        setMessage({ 
          type: 'success', 
          text: response.data.message + details
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: response.data.error || response.data.message || 'Failed to force send notifications' 
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to force send notifications';
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setForceSending(false);
    }
  };

  const handleDaysChange = (type: 'contract' | 'id', value: string) => {
    const days = value
      .split(',')
      .map(d => parseInt(d.trim()))
      .filter(d => !isNaN(d) && d > 0)
      .sort((a, b) => b - a); // Sort descending

    if (type === 'contract') {
      handleSettingsChange('contractRenewalDays', days);
    } else {
      handleSettingsChange('idExpiryDays', days);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t('loading')}...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Email Notification Settings</h1>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Email Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Email Server Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
            <input
              type="text"
              value={emailConfig.host}
              onChange={e => handleEmailConfigChange('host', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="smtp.gmail.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input
                type="number"
                value={emailConfig.port}
                onChange={e => handleEmailConfigChange('port', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="587"
              />
            </div>
            <div className="flex items-center pt-7">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={emailConfig.secure}
                  onChange={e => handleEmailConfigChange('secure', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Use SSL/TLS</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={emailConfig.auth.user}
              onChange={e => handleEmailConfigChange('auth.user', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your-email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password / App Password</label>
            <input
              type="password"
              value={emailConfig.auth.password || ''}
              onChange={e => handleEmailConfigChange('auth.password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your email password or app password"
            />
            {!emailConfig.auth.password && (
              <p className="text-xs text-red-500 mt-1">Password is required</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConfigureEmail}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Configuring...' : 'Configure Email'}
            </button>
            <button
              onClick={handleTestEmail}
              disabled={testing}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={e => handleSettingsChange('enabled', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Enable Notifications</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contract Renewal Reminder Days (comma-separated)
            </label>
            <input
              type="text"
              value={settings.contractRenewalDays.join(', ')}
              onChange={e => handleDaysChange('contract', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="30, 14, 7, 1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Send reminders when contracts expire in these many days
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID Expiry Reminder Days (comma-separated)
            </label>
            <input
              type="text"
              value={settings.idExpiryDays.join(', ')}
              onChange={e => handleDaysChange('id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="30, 14, 7, 1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Send reminders when National IDs expire in these many days
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
            <input
              type="text"
              value={settings.baseUrl}
              onChange={e => handleSettingsChange('baseUrl', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="http://localhost:3000"
            />
            <p className="text-xs text-gray-500 mt-1">
              Base URL for employee detail links in emails
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Language</label>
            <select
              value={settings.language}
              onChange={e => handleSettingsChange('language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notification Recipients</label>
            <div className="space-y-2 mb-2">
              {settings.recipients.map((recipient, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">
                    {recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email}
                  </span>
                  <button
                    onClick={() => handleRemoveRecipient(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={newRecipientEmail}
                onChange={e => setNewRecipientEmail(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    handleAddRecipient();
                  }
                }}
              />
              <input
                type="text"
                value={newRecipientName}
                onChange={e => setNewRecipientName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Name (optional)"
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    handleAddRecipient();
                  }
                }}
              />
              <button
                onClick={handleAddRecipient}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={handleSendTestNotifications}
              disabled={sending}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send Test Notifications Now'}
            </button>
            <button
              onClick={handleSendTestEmail}
              disabled={sending}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send Test Email'}
            </button>
            {user && user.roles.includes('SUPER_ADMIN') && (
              <button
                onClick={handleForceSend30Days}
                disabled={forceSending}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                title={t('forceSend30DaysTooltip') || 'Force send notifications for all contracts and IDs expiring within 30 days'}
              >
                {forceSending ? 'Sending...' : (t('forceSend30Days') || 'Force Send (<30 Days)')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

