/**
 * Email Configuration Helper
 * Reads environment variables and returns appropriate SMTP configuration
 */

import { SMTPConfig } from './email-service';

export function getEmailConfig(): SMTPConfig {
  const provider = (process.env.EMAIL_PROVIDER || 'simulation') as SMTPConfig['provider'];
  const from = process.env.EMAIL_FROM || 'noreply@ganderaviation.com';

  console.log(`📧 Email provider configured: ${provider.toUpperCase()}`);

  switch (provider) {
    case 'mailtrap':
      // Support Mailtrap Email Testing (sandbox) mode
      if (process.env.MAILTRAP_INBOX_ID && process.env.MAILTRAP_API_TOKEN) {
        console.log('📧 Using Mailtrap Email Testing (sandbox) mode');
        return {
          provider: 'mailtrap',
          from,
          host: 'sandbox.api.mailtrap.io',
          inboxId: process.env.MAILTRAP_INBOX_ID,
          auth: {
            user: 'testing', // Special flag for testing mode
            pass: process.env.MAILTRAP_API_TOKEN
          }
        };
      }
      
      // Support traditional SMTP mode
      if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
        console.log('📧 Using Mailtrap SMTP mode');
        return {
          provider: 'mailtrap',
          from,
          host: 'sandbox.smtp.mailtrap.io',
          port: 587,
          secure: false,
          auth: {
            user: process.env.MAILTRAP_USER,
            pass: process.env.MAILTRAP_PASS
          }
        };
      }
      
      console.warn('⚠️  Mailtrap credentials not found, falling back to simulation mode');
      return { provider: 'simulation', from };

    case 'gmail':
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('⚠️  Gmail credentials not found, falling back to simulation mode');
        return { provider: 'simulation', from };
      }
      return {
        provider: 'gmail',
        from,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      };

    case 'sendgrid':
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('⚠️  SendGrid API key not found, falling back to simulation mode');
        return { provider: 'simulation', from };
      }
      return {
        provider: 'sendgrid',
        from,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      };

    case 'simulation':
    default:
      console.log('📧 Using simulation mode');
      return { provider: 'simulation', from };
  }
}

export function validateEmailConfig(): boolean {
  const config = getEmailConfig();
  
  if (config.provider === 'simulation') {
    console.log('✅ Email service in simulation mode - no validation required');
    return true;
  }

  if (!config.auth?.user || !config.auth?.pass) {
    console.error('❌ Email configuration invalid: missing credentials');
    return false;
  }

  console.log(`✅ Email configuration valid for ${config.provider}`);
  return true;
} 