import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    password: string;
  };
}

interface NotificationRecipient {
  email: string;
  name?: string;
}

interface EmailOptions {
  employeeId: string;
  baseUrl?: string; // e.g., "http://localhost:3000" or "https://yourdomain.com"
  language?: 'en' | 'ar';
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  // Brand colors extracted from logo
  private readonly brandColors = {
    primary: '#416d3f',      // Green from logo
    primaryDark: '#2d4d2b',   // Darker green variant
    primaryLight: '#5a8a57',  // Lighter green variant
    accent: '#c7a246',        // Gold/Ochre from logo
    accentDark: '#9d7d38',    // Darker gold variant
    accentLight: '#d4b55f',   // Lighter gold variant
    gradientStart: '#416d3f', // Primary green
    gradientEnd: '#2d4d2b',   // Darker green for gradient
  };

  initialize(config: EmailConfig) {
    this.config = config;
    
    // Ensure auth object has both user and password
    if (!config.auth || !config.auth.user || !config.auth.password) {
      throw new Error('Email configuration requires both user and password');
    }
    
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure, // true for 465, false for other ports
      auth: {
        user: config.auth.user,
        pass: config.auth.password, // nodemailer uses 'pass' not 'password'
      },
    });
  }

  private getLogoBase64(): string {
    try {
      const logoPath = join(__dirname, '..', '..', '..', '..', 'email-logo.png');
      const logoBuffer = readFileSync(logoPath);
      return `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch {
      return '';
    }
  }

  private generateEmailTemplate(
    title: { en: string; ar: string },
    employeeName: string,
    employeeCode: string | null,
    dateLabel: { en: string; ar: string },
    dateValue: string,
    daysRemaining: number,
    type: 'contract' | 'id',
    options: EmailOptions
  ): string {
    const logoBase64 = this.getLogoBase64();
    const logoImg = logoBase64 
      ? `<img src="${logoBase64}" alt="Logo" style="height: 20px; margin-bottom: 8px;" />`
      : '';

    const isRTL = options.language === 'ar';
    const lang = options.language || 'en';
    
    // Check if this is a test email (employee ID will be 'test-employee-id')
    const isTest = options.employeeId === 'test-employee-id';
    
    // Brand gradient using logo colors
    const brandGradient = `linear-gradient(135deg, ${this.brandColors.gradientStart} 0%, ${this.brandColors.gradientEnd} 100%)`;
    const brandPrimary = this.brandColors.primary;
    const brandAccent = this.brandColors.accent;
    
    // Urgency colors (using brand accent for important, red for urgent)
    const urgencyColor = daysRemaining <= 7 ? '#dc2626' : daysRemaining <= 14 ? this.brandColors.accent : brandPrimary;
    const urgencyText = daysRemaining <= 7 
      ? { en: 'URGENT', ar: 'عاجل' }
      : daysRemaining <= 14 
      ? { en: 'IMPORTANT', ar: 'مهم' }
      : { en: 'REMINDER', ar: 'تذكير' };

    // Translations
    const translations = {
      en: {
        employeeName: 'Employee Name',
        employeeCode: 'Employee Code',
        daysRemaining: 'Days Remaining',
        viewDetails: 'View Employee Details',
        actionRequired: 'Action Required',
        contractMessage: 'Please ensure the employee contract is renewed before the expiry date to avoid any disruption in service.',
        idMessage: 'Please ensure the employee\'s National ID is renewed before the expiry date to maintain compliance.',
        automatedNotification: 'This is an automated notification from Salaries Summary System',
        generatedOn: 'Generated on',
        importantNote: 'Important Note',
        nextSteps: 'Next Steps',
        step1: 'Review the employee\'s current status',
        step2: 'Initiate the renewal process',
        step3: 'Update the system once renewal is complete',
        reminderList: 'Reminder Details',
      },
      ar: {
        employeeName: 'اسم الموظف',
        employeeCode: 'كود الموظف',
        daysRemaining: 'الأيام المتبقية',
        viewDetails: 'عرض تفاصيل الموظف',
        actionRequired: 'إجراء مطلوب',
        contractMessage: 'يرجى التأكد من تجديد عقد الموظف قبل تاريخ الانتهاء لتجنب أي انقطاع في الخدمة.',
        idMessage: 'يرجى التأكد من تجديد بطاقة الهوية الوطنية للموظف قبل تاريخ الانتهاء للحفاظ على الامتثال.',
        automatedNotification: 'هذا إشعار تلقائي من نظام ملخص الرواتب',
        generatedOn: 'تم الإنشاء في',
        importantNote: 'ملاحظة مهمة',
        nextSteps: 'الخطوات التالية',
        step1: 'مراجعة حالة الموظف الحالية',
        step2: 'بدء عملية التجديد',
        step3: 'تحديث النظام بعد اكتمال التجديد',
        reminderList: 'تفاصيل التذكير',
      }
    };

    const t = translations[lang];
    const dir = isRTL ? 'rtl' : 'ltr';
    const textAlign = isRTL ? 'right' : 'left';
    const float = isRTL ? 'right' : 'left';

    // Calendar and warning icons (SVG) - using brand colors
    const calendarIcon = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-${isRTL ? 'left' : 'right'}: 8px;">
        <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="${brandPrimary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    const warningIcon = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-${isRTL ? 'left' : 'right'}: 8px;">
        <path d="M12 9V13M12 17H12.01M5 12C5 16.9706 9.02944 21 14 21C18.9706 21 23 16.9706 23 12C23 7.02944 18.9706 3 14 3C9.02944 3 5 7.02944 5 12Z" stroke="${urgencyColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    const viewDetailsUrl = options.baseUrl 
      ? `${options.baseUrl}/employees/${options.employeeId}`
      : `#`;

    return `
<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title[lang]}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; direction: ${dir};">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header with Brand Gradient (Green) -->
          <tr>
            <td style="padding: 30px 30px 20px 30px; text-align: center; background: ${brandGradient}; border-radius: 8px 8px 0 0;">
              ${logoImg}
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">${title[lang]}</h1>
            </td>
          </tr>
          
          <!-- Urgency Badge with Warning Icon -->
          <tr>
            <td style="padding: 15px 30px; text-align: center; background-color: ${urgencyColor};">
              <span style="color: #ffffff; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-flex; align-items: center; justify-content: center;">
                ${warningIcon}
                ${urgencyText[lang]} - ${daysRemaining} ${t.daysRemaining}
              </span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <!-- Employee Information Card -->
                <tr>
                  <td style="padding: 20px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 6px; border-left: 4px solid ${brandPrimary}; margin-bottom: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #374151; font-size: 14px; font-weight: 600;">${t.employeeName}:</strong>
                          <span style="color: #1f2937; font-size: 14px; margin-${isRTL ? 'right' : 'left'}: 10px; font-weight: 500;">${employeeName}</span>
                        </td>
                      </tr>
                      ${employeeCode ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #374151; font-size: 14px; font-weight: 600;">${t.employeeCode}:</strong>
                          <span style="color: #1f2937; font-size: 14px; margin-${isRTL ? 'right' : 'left'}: 10px; font-weight: 500;">${employeeCode}</span>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; display: flex; align-items: center; flex-direction: ${isRTL ? 'row-reverse' : 'row'};">
                          ${calendarIcon}
                          <div>
                            <strong style="color: #374151; font-size: 14px; font-weight: 600;">${dateLabel[lang]}:</strong>
                            <span style="color: #1f2937; font-size: 14px; margin-${isRTL ? 'right' : 'left'}: 10px; font-weight: 600;">${dateValue}</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #374151; font-size: 14px; font-weight: 600;">${t.daysRemaining}:</strong>
                          <span style="color: ${urgencyColor}; font-size: 18px; font-weight: bold; margin-${isRTL ? 'right' : 'left'}: 10px;">${daysRemaining}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Test Email Notice -->
                ${isTest ? `
                <tr>
                  <td style="padding: 15px; background-color: #dbeafe; border-radius: 6px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
                    <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6; font-weight: 600;">
                      ⚠️ ${lang === 'ar' ? 'هذا بريد إلكتروني تجريبي - لا يوجد إجراء مطلوب' : 'This is a TEST email - no action required'}
                    </p>
                  </td>
                </tr>
                ` : ''}
                
                <!-- Important Note with Gold Accent -->
                <tr>
                  <td style="padding: 15px; background-color: #fef9e7; border-radius: 6px; border-left: 4px solid ${brandAccent}; margin-bottom: 20px;">
                    <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                      <strong style="font-weight: 600;">${t.importantNote}:</strong> ${type === 'contract' ? t.contractMessage : t.idMessage}
                    </p>
                  </td>
                </tr>
                
                <!-- Next Steps List -->
                <tr>
                  <td style="padding: 20px 0 10px 0;">
                    <h3 style="margin: 0 0 15px 0; color: ${brandPrimary}; font-size: 16px; font-weight: 600;">${t.nextSteps}:</h3>
                    <ul style="margin: 0; padding-${isRTL ? 'right' : 'left'}: 25px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                      <li style="margin-bottom: 8px;"><strong style="color: ${brandPrimary};">1.</strong> ${t.step1}</li>
                      <li style="margin-bottom: 8px;"><strong style="color: ${brandPrimary};">2.</strong> ${t.step2}</li>
                      <li style="margin-bottom: 8px;"><strong style="color: ${brandPrimary};">3.</strong> ${t.step3}</li>
                    </ul>
                  </td>
                </tr>
                
                <!-- Action Button with Brand Gradient -->
                <tr>
                  <td style="padding: 20px 0; text-align: center;">
                    <a href="${viewDetailsUrl}" 
                       style="display: inline-block; padding: 12px 30px; background: ${brandGradient}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(65, 109, 63, 0.3); transition: all 0.3s ease;">
                      ${t.viewDetails}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                ${t.automatedNotification}<br>
                ${t.generatedOn} ${new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  async sendContractRenewalNotification(
    employee: { id: string; name: string; employeeCode?: string | null; contractRenewalDate: Date },
    daysUntilRenewal: number,
    recipients: NotificationRecipient[],
    options: EmailOptions = { employeeId: employee.id }
  ) {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    const renewalDate = new Date(employee.contractRenewalDate).toLocaleDateString(
      options.language === 'ar' ? 'ar-EG' : 'en-US', 
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
    
    // Check if this is a test email
    const isTest = employee.id === 'test-employee-id';
    const testPrefix = isTest ? '[TEST] ' : '';
    
    const title = { 
      en: isTest ? 'TEST - Contract Renewal Reminder' : 'Contract Renewal Reminder', 
      ar: isTest ? 'اختبار - تذكير بتجديد العقد' : 'تذكير بتجديد العقد' 
    };
    const dateLabel = { en: 'Renewal Date', ar: 'تاريخ التجديد' };
    
    const subject = options.language === 'ar'
      ? `${testPrefix}⚠️ تذكير بتجديد العقد: ${employee.name} - متبقي ${daysUntilRenewal} يوم`
      : `${testPrefix}⚠️ Contract Renewal Reminder: ${employee.name} - ${daysUntilRenewal} day(s) remaining`;
    
    const html = this.generateEmailTemplate(
      title,
      employee.name,
      employee.employeeCode || null,
      dateLabel,
      renewalDate,
      daysUntilRenewal,
      'contract',
      options
    );

    const testNote = isTest 
      ? (options.language === 'ar' 
          ? '\n\n⚠️ هذا بريد إلكتروني تجريبي - لا يوجد إجراء مطلوب.\n' 
          : '\n\n⚠️ This is a TEST email - no action required.\n')
      : '\n';
    
    const text = options.language === 'ar'
      ? `${isTest ? '[اختبار] ' : ''}تذكير بتجديد العقد${testNote}\nالموظف: ${employee.name}${employee.employeeCode ? ` (${employee.employeeCode})` : ''}\nتاريخ التجديد: ${renewalDate}\nالأيام المتبقية: ${daysUntilRenewal}\n\nيرجى التأكد من تجديد العقد قبل تاريخ الانتهاء.`
      : `${isTest ? '[TEST] ' : ''}Contract Renewal Reminder${testNote}\nEmployee: ${employee.name}${employee.employeeCode ? ` (${employee.employeeCode})` : ''}\nRenewal Date: ${renewalDate}\nDays Remaining: ${daysUntilRenewal}\n\nPlease ensure the contract is renewed before the expiry date.`;

    const promises = recipients.map(recipient =>
      this.transporter!.sendMail({
        from: `"Salaries Summary System" <${this.config!.auth.user}>`,
        to: recipient.email,
        subject,
        html,
        text,
      })
    );

    return Promise.all(promises);
  }

  async sendIdExpiryNotification(
    employee: { id: string; name: string; employeeCode?: string | null; nationalIdValidTill: Date },
    daysUntilExpiry: number,
    recipients: NotificationRecipient[],
    options: EmailOptions = { employeeId: employee.id }
  ) {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    const expiryDate = new Date(employee.nationalIdValidTill).toLocaleDateString(
      options.language === 'ar' ? 'ar-EG' : 'en-US', 
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
    
    const title = { en: 'National ID Expiry Reminder', ar: 'تذكير بانتهاء بطاقة الهوية' };
    const dateLabel = { en: 'Expiry Date', ar: 'تاريخ الانتهاء' };
    
    const subject = options.language === 'ar'
      ? `⚠️ تذكير بانتهاء بطاقة الهوية: ${employee.name} - متبقي ${daysUntilExpiry} يوم`
      : `⚠️ ID Expiry Reminder: ${employee.name} - ${daysUntilExpiry} day(s) remaining`;
    
    const html = this.generateEmailTemplate(
      title,
      employee.name,
      employee.employeeCode || null,
      dateLabel,
      expiryDate,
      daysUntilExpiry,
      'id',
      options
    );

    const text = options.language === 'ar'
      ? `تذكير بانتهاء بطاقة الهوية\n\nالموظف: ${employee.name}${employee.employeeCode ? ` (${employee.employeeCode})` : ''}\nتاريخ الانتهاء: ${expiryDate}\nالأيام المتبقية: ${daysUntilExpiry}\n\nيرجى التأكد من تجديد بطاقة الهوية قبل تاريخ الانتهاء.`
      : `National ID Expiry Reminder\n\nEmployee: ${employee.name}${employee.employeeCode ? ` (${employee.employeeCode})` : ''}\nExpiry Date: ${expiryDate}\nDays Remaining: ${daysUntilExpiry}\n\nPlease ensure the National ID is renewed before the expiry date.`;

    const promises = recipients.map(recipient =>
      this.transporter!.sendMail({
        from: `"Salaries Summary System" <${this.config!.auth.user}>`,
        to: recipient.email,
        subject,
        html,
        text,
      })
    );

    return Promise.all(promises);
  }

  async testConnection() {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }
    return this.transporter.verify();
  }
}

export const emailService = new EmailService();

