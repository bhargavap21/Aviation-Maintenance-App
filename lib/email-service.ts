/**
 * Email Service for Maintenance Notifications
 * Handles sending detailed maintenance inspection emails to all relevant personnel
 * Now supports real SMTP integration for production-ready email sending
 */

import nodemailer from 'nodemailer';
import axios from 'axios';

export interface EmailRecipient {
  name: string;
  email: string;
  role: string;
}

export interface MaintenanceEmailData {
  recommendationId: string;
  workflowId: string;
  aircraftInfo: {
    tailNumber: string;
    make: string;
    model: string;
    totalTime: number;
  };
  maintenanceDetails: {
    type: string;
    scheduledDate: string;
    estimatedDuration: number;
    location: string;
    estimatedCost: number;
  };
  taskAssignments: {
    mechanic: string;
    inspector?: string;
    supervisor: string;
  };
  resources: {
    hangar: string;
    equipment: string[];
    parts: string[];
  };
  complianceInfo: {
    regulations: string[];
    requiredDocumentation: string[];
  };
  approvalInfo: {
    approvedBy: string;
    approvedAt: string;
    notes?: string;
  };
}

export interface SMTPConfig {
  provider: 'mailtrap' | 'gmail' | 'sendgrid' | 'simulation';
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from: string;
  inboxId?: string; // For Mailtrap Email Testing
}

export class MaintenanceEmailService {
  private baseUrl: string;
  private smtpConfig: SMTPConfig;
  private transporter: nodemailer.Transporter | null = null;
  
  constructor(baseUrl: string = 'http://localhost:3000', smtpConfig?: SMTPConfig) {
    this.baseUrl = baseUrl;
    
    // Default to simulation mode if no config provided
    this.smtpConfig = smtpConfig || {
      provider: 'simulation',
      from: 'noreply@ganderaviation.com'
    };
    
    this.initializeTransporter();
  }

  /**
   * Initialize the email transporter based on the provider
   */
  private initializeTransporter() {
    if (this.smtpConfig.provider === 'simulation') {
      this.transporter = null;
      return;
    }

    // For Mailtrap API mode, we don't need a transporter
    if (this.smtpConfig.provider === 'mailtrap' && this.smtpConfig.auth?.user === 'api') {
      this.transporter = null;
      console.log('🎯 Mailtrap API mode - no SMTP transporter needed');
      return;
    }

    const transportConfig = this.getTransportConfig();
    if (transportConfig) {
      this.transporter = nodemailer.createTransport(transportConfig);
    }
  }

  /**
   * Get transport configuration for different providers
   */
  private getTransportConfig(): any {
    switch (this.smtpConfig.provider) {
      case 'mailtrap':
        // SMTP mode for Mailtrap
        return {
          host: 'sandbox.smtp.mailtrap.io',
          port: 587,
          secure: false,
          auth: {
            user: this.smtpConfig.auth?.user,
            pass: this.smtpConfig.auth?.pass
          }
        };
      
      case 'gmail':
        return {
          service: 'gmail',
          auth: {
            user: this.smtpConfig.auth?.user,
            pass: this.smtpConfig.auth?.pass // Use App Password for Gmail
          }
        };
      
      case 'sendgrid':
        return {
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: this.smtpConfig.auth?.pass // SendGrid API Key
          }
        };
      
      default:
        return null;
    }
  }

  /**
   * Send maintenance notification emails to all relevant personnel
   */
  async sendMaintenanceNotificationEmails(
    emailData: MaintenanceEmailData,
    recipients: EmailRecipient[]
  ): Promise<{ success: boolean; sentEmails: number; failures: string[] }> {
    
    console.log(`🚀 SENDING MAINTENANCE NOTIFICATION EMAILS (${this.smtpConfig.provider.toUpperCase()})`);
    console.log(`📧 Recipients: ${recipients.length}`);
    console.log(`✈️  Aircraft: ${emailData.aircraftInfo.tailNumber}`);
    console.log(`🔧 Maintenance: ${emailData.maintenanceDetails.type}`);
    
    const emailResults = [];
    const failures: string[] = [];
    
    for (const recipient of recipients) {
      try {
        const emailContent = this.generateEmailContent(emailData, recipient);
        const emailResult = await this.sendEmail(recipient, emailContent, emailData);
        
        if (emailResult.success) {
          emailResults.push(emailResult);
          console.log(`✅ Email sent to ${recipient.name} (${recipient.role})`);
        } else {
          failures.push(`Failed to send to ${recipient.name}: ${emailResult.error}`);
          console.log(`❌ Failed to send to ${recipient.name}: ${emailResult.error}`);
        }
      } catch (error) {
        const errorMsg = `Exception sending to ${recipient.name}: ${error.message}`;
        failures.push(errorMsg);
        console.log(`💥 ${errorMsg}`);
      }
    }
    
    const summary = {
      success: failures.length === 0,
      sentEmails: emailResults.length,
      failures
    };
    
    console.log(`📊 Email Summary: ${summary.sentEmails} sent, ${failures.length} failed`);
    return summary;
  }

  /**
   * Generate personalized email content based on recipient role
   */
  private generateEmailContent(emailData: MaintenanceEmailData, recipient: EmailRecipient) {
    const { aircraftInfo, maintenanceDetails, taskAssignments, resources, complianceInfo, approvalInfo } = emailData;
    
    const roleSpecificContent = this.getRoleSpecificContent(recipient.role, emailData);
    
    return {
      subject: `🔧 SCHEDULED MAINTENANCE: ${aircraftInfo.tailNumber} - ${maintenanceDetails.type}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background: #f8fafc; }
            .section { background: white; margin: 15px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; }
            .critical { border-left-color: #ef4444; }
            .success { border-left-color: #10b981; }
            .warning { border-left-color: #f59e0b; }
            .aircraft-info { display: flex; justify-content: space-between; background: #e0f2fe; padding: 15px; border-radius: 8px; }
            .task-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
            .task-card { background: #f1f5f9; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
            .footer { text-align: center; padding: 20px; background: #374151; color: white; border-radius: 0 0 8px 8px; }
            .button { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
            .alert { background: #fef3cd; border: 1px solid #fbbf24; padding: 12px; border-radius: 6px; margin: 10px 0; }
            ul { list-style-type: none; padding-left: 0; }
            li { padding: 4px 0; }
            li:before { content: "✓ "; color: #10b981; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🛩️ Scheduled Maintenance Notification</h1>
            <p>Automated maintenance workflow system - Gander Maintenance</p>
          </div>
          
          <div class="content">
            <div class="section critical">
              <h2>👋 Hello ${recipient.name} (${recipient.role})</h2>
              <p>A new maintenance inspection has been scheduled and approved. Your involvement is required for the following maintenance activity:</p>
            </div>

            <div class="aircraft-info">
              <div>
                <h3>✈️ Aircraft Information</h3>
                <p><strong>Tail Number:</strong> ${aircraftInfo.tailNumber}</p>
                <p><strong>Aircraft:</strong> ${aircraftInfo.make} ${aircraftInfo.model}</p>
                <p><strong>Total Time:</strong> ${aircraftInfo.totalTime.toLocaleString()} hours</p>
              </div>
              <div>
                <h3>🔧 Maintenance Details</h3>
                <p><strong>Type:</strong> ${maintenanceDetails.type}</p>
                <p><strong>Scheduled:</strong> ${new Date(maintenanceDetails.scheduledDate).toLocaleString()}</p>
                <p><strong>Duration:</strong> ${maintenanceDetails.estimatedDuration} hours</p>
                <p><strong>Cost:</strong> $${maintenanceDetails.estimatedCost.toLocaleString()}</p>
              </div>
            </div>

            ${roleSpecificContent}

            <div class="section">
              <h3>👥 Team Assignments</h3>
              <div class="task-grid">
                <div class="task-card">
                  <h4>🔧 Lead Mechanic</h4>
                  <p>${taskAssignments.mechanic}</p>
                </div>
                ${taskAssignments.inspector ? `
                <div class="task-card">
                  <h4>🛡️ Inspector</h4>
                  <p>${taskAssignments.inspector}</p>
                </div>
                ` : ''}
                <div class="task-card">
                  <h4>👷 Supervisor</h4>
                  <p>${taskAssignments.supervisor}</p>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>📍 Resources & Location</h3>
              <div class="task-grid">
                <div class="task-card">
                  <h4>🏢 Location</h4>
                  <p>${resources.hangar}</p>
                </div>
                <div class="task-card">
                  <h4>🛠️ Equipment</h4>
                  <ul>
                    ${resources.equipment.map(eq => `<li>${eq}</li>`).join('')}
                  </ul>
                </div>
                <div class="task-card">
                  <h4>🔩 Parts Required</h4>
                  <ul>
                    ${resources.parts.map(part => `<li>${part}</li>`).join('')}
                  </ul>
                </div>
              </div>
            </div>

            <div class="section warning">
              <h3>📋 Compliance Requirements</h3>
              <p><strong>Applicable Regulations:</strong></p>
              <ul>
                ${complianceInfo.regulations.map(reg => `<li>${reg}</li>`).join('')}
              </ul>
              <p><strong>Required Documentation:</strong></p>
              <ul>
                ${complianceInfo.requiredDocumentation.map(doc => `<li>${doc}</li>`).join('')}
              </ul>
            </div>

            <div class="section success">
              <h3>✅ Approval Information</h3>
              <p><strong>Approved By:</strong> ${approvalInfo.approvedBy}</p>
              <p><strong>Approved At:</strong> ${new Date(approvalInfo.approvedAt).toLocaleString()}</p>
              ${approvalInfo.notes ? `<p><strong>Notes:</strong> ${approvalInfo.notes}</p>` : ''}
            </div>

            <div class="alert">
              <strong>⚠️ Important:</strong> Please confirm receipt of this notification and your availability for the scheduled maintenance window. Contact the maintenance supervisor if you have any conflicts or concerns.
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.baseUrl}/schedule" class="button">
                📊 View Maintenance Dashboard
              </a>
            </div>
          </div>

          <div class="footer">
            <p>🤖 This is an automated notification from the Gander Maintenance System</p>
            <p>Workflow ID: ${emailData.workflowId} | Recommendation ID: ${emailData.recommendationId}</p>
            <p>For questions, contact the Maintenance Control Center</p>
          </div>
        </body>
        </html>
      `,
      text: this.generatePlainTextContent(emailData, recipient)
    };
  }

  /**
   * Get role-specific content for the email
   */
  private getRoleSpecificContent(role: string, emailData: MaintenanceEmailData): string {
    const roleContent = {
      'MECHANIC': `
        <div class="section">
          <h3>🔧 Mechanic Responsibilities</h3>
          <ul>
            <li>Review maintenance manual procedures</li>
            <li>Perform visual and operational inspections</li>
            <li>Complete all required maintenance tasks</li>
            <li>Document findings and corrective actions</li>
            <li>Coordinate with inspector for sign-offs</li>
            <li>Ensure all tools and equipment are serviceable</li>
          </ul>
          <div class="alert">
            <strong>Safety First:</strong> Follow all safety protocols and use proper PPE during maintenance activities.
          </div>
        </div>
      `,
      
      'INSPECTOR': `
        <div class="section">
          <h3>🛡️ Inspector Responsibilities</h3>
          <ul>
            <li>Conduct independent inspection of completed work</li>
            <li>Verify compliance with maintenance manual requirements</li>
            <li>Review all maintenance documentation</li>
            <li>Perform operational checks as required</li>
            <li>Sign off on maintenance record entries</li>
            <li>Ensure return to service requirements are met</li>
          </ul>
          <div class="alert">
            <strong>Inspection Authority:</strong> You have the authority to reject any work that does not meet standards.
          </div>
        </div>
      `,
      
      'SUPERVISOR': `
        <div class="section">
          <h3>👷 Supervisor Responsibilities</h3>
          <ul>
            <li>Coordinate team assignments and resources</li>
            <li>Monitor maintenance progress and timeline</li>
            <li>Ensure regulatory compliance throughout process</li>
            <li>Approve any deviations from standard procedures</li>
            <li>Coordinate with operations for scheduling</li>
            <li>Final review of all maintenance documentation</li>
          </ul>
          <div class="alert">
            <strong>Management Oversight:</strong> You are responsible for overall maintenance operation coordination.
          </div>
        </div>
      `,
      
      'PILOT': `
        <div class="section">
          <h3>✈️ Pilot Information</h3>
          <ul>
            <li>Aircraft will be out of service during maintenance</li>
            <li>Review any operational limitations after maintenance</li>
            <li>Participate in any required test flights</li>
            <li>Review maintenance log entries</li>
            <li>Coordinate with dispatch for schedule adjustments</li>
          </ul>
          <div class="alert">
            <strong>Flight Operations:</strong> Aircraft is grounded until maintenance completion and return to service.
          </div>
        </div>
      `
    };

    return roleContent[role] || `
      <div class="section">
        <h3>📋 Your Role in This Maintenance</h3>
        <p>You have been assigned to support this maintenance activity. Please review the details above and coordinate with the maintenance team as needed.</p>
      </div>
    `;
  }

  /**
   * Generate plain text version of the email
   */
  private generatePlainTextContent(emailData: MaintenanceEmailData, recipient: EmailRecipient): string {
    const { aircraftInfo, maintenanceDetails, taskAssignments, approvalInfo } = emailData;
    
    return `
SCHEDULED MAINTENANCE NOTIFICATION
==================================

Hello ${recipient.name} (${recipient.role}),

A new maintenance inspection has been scheduled for:

AIRCRAFT INFORMATION:
- Tail Number: ${aircraftInfo.tailNumber}
- Aircraft: ${aircraftInfo.make} ${aircraftInfo.model}
- Total Time: ${aircraftInfo.totalTime.toLocaleString()} hours

MAINTENANCE DETAILS:
- Type: ${maintenanceDetails.type}
- Scheduled: ${new Date(maintenanceDetails.scheduledDate).toLocaleString()}
- Duration: ${maintenanceDetails.estimatedDuration} hours
- Estimated Cost: $${maintenanceDetails.estimatedCost.toLocaleString()}

TEAM ASSIGNMENTS:
- Lead Mechanic: ${taskAssignments.mechanic}
- Inspector: ${taskAssignments.inspector || 'TBD'}
- Supervisor: ${taskAssignments.supervisor}

APPROVAL INFORMATION:
- Approved By: ${approvalInfo.approvedBy}
- Approved At: ${new Date(approvalInfo.approvedAt).toLocaleString()}

Please confirm receipt and your availability for this maintenance window.

View the maintenance dashboard: ${this.baseUrl}/schedule

This is an automated notification from the Gander Maintenance System.
Workflow ID: ${emailData.workflowId}
    `.trim();
  }

  /**
   * Send individual email (supports both real SMTP and simulation)
   */
  private async sendEmail(
    recipient: EmailRecipient,
    content: { subject: string; html: string; text: string },
    emailData: MaintenanceEmailData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // If using simulation mode, keep the existing behavior
    if (this.smtpConfig.provider === 'simulation') {
      return this.sendSimulatedEmail(recipient, content, emailData, messageId);
    }
    
    // Mailtrap API mode (Email Sending)
    if (this.smtpConfig.provider === 'mailtrap' && this.smtpConfig.auth?.user === 'api') {
      return this.sendMailtrapAPIEmail(recipient, content, emailData, messageId);
    }
    
    // Mailtrap Testing mode (Email Testing/Sandbox)
    if (this.smtpConfig.provider === 'mailtrap' && this.smtpConfig.auth?.user === 'testing') {
      return this.sendMailtrapTestingEmail(recipient, content, emailData, messageId);
    }
    
    // Regular SMTP sending (Mailtrap SMTP, Gmail, SendGrid)
    if (!this.transporter) {
      return {
        success: false,
        error: 'No email transporter configured'
      };
    }
    
    try {
      console.log(`📧 Sending real email via ${this.smtpConfig.provider.toUpperCase()} SMTP to: ${recipient.email}`);
      
      const mailOptions = {
        from: `"Gander Maintenance System" <${this.smtpConfig.from}>`,
        to: `"${recipient.name}" <${recipient.email}>`,
        subject: content.subject,
        text: content.text,
        html: content.html,
        messageId: messageId
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ REAL EMAIL SENT SUCCESSFULLY`);
      console.log(`========================`);
      console.log(`To: ${recipient.name} <${recipient.email}>`);
      console.log(`Role: ${recipient.role}`);
      console.log(`Subject: ${content.subject}`);
      console.log(`Message ID: ${info.messageId || messageId}`);
      console.log(`SMTP Response: ${info.response || 'Delivered'}`);
      console.log(`Aircraft: ${emailData.aircraftInfo.tailNumber}`);
      console.log(`Maintenance: ${emailData.maintenanceDetails.type}`);
      
      return {
        success: true,
        messageId: info.messageId || messageId
      };
      
    } catch (error) {
      console.error(`❌ SMTP Error sending to ${recipient.email}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send email via Mailtrap API
   */
  private async sendMailtrapAPIEmail(
    recipient: EmailRecipient,
    content: { subject: string; html: string; text: string },
    emailData: MaintenanceEmailData,
    messageId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    
    try {
      console.log(`🎯 Sending email via MAILTRAP API to: ${recipient.email}`);
      console.log(`🔑 API Host: ${this.smtpConfig.host}`);
      console.log(`🔑 API Token: ${this.smtpConfig.auth?.pass?.substring(0, 8)}...`);
      
      const payload = {
        from: {
          email: this.smtpConfig.from,
          name: "Gander Maintenance System"
        },
        to: [
          {
            email: recipient.email,
            name: recipient.name
          }
        ],
        subject: content.subject,
        text: content.text,
        html: content.html,
        headers: {
          "X-Message-ID": messageId,
          "X-Aircraft": emailData.aircraftInfo.tailNumber,
          "X-Maintenance-Type": emailData.maintenanceDetails.type
        }
      };
      
      const apiUrl = `https://${this.smtpConfig.host}/api/send`;
      console.log(`🌐 API URL: ${apiUrl}`);
      console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
      
      const response = await axios.post(
        apiUrl,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.smtpConfig.auth?.pass}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ MAILTRAP API EMAIL SENT SUCCESSFULLY`);
      console.log(`=================================`);
      console.log(`To: ${recipient.name} <${recipient.email}>`);
      console.log(`Role: ${recipient.role}`);
      console.log(`Subject: ${content.subject}`);
      console.log(`Message ID: ${response.data.message_ids?.[0] || messageId}`);
      console.log(`API Response: ${response.status} ${response.statusText}`);
      console.log(`Aircraft: ${emailData.aircraftInfo.tailNumber}`);
      console.log(`Maintenance: ${emailData.maintenanceDetails.type}`);
      console.log(`🎯 Check your Mailtrap inbox: https://mailtrap.io/inboxes`);
      
      return {
        success: true,
        messageId: response.data.message_ids?.[0] || messageId
      };
      
    } catch (error) {
      console.error(`❌ Mailtrap API Error sending to ${recipient.email}:`);
      console.error(`Status: ${error.response?.status}`);
      console.error(`Status Text: ${error.response?.statusText}`);
      console.error(`Data:`, error.response?.data);
      console.error(`Headers:`, error.response?.headers);
      
      // Check common authentication issues
      if (error.response?.status === 401) {
        console.error(`🔐 AUTHENTICATION ISSUE:`);
        console.error(`   - Check if your MAILTRAP_API_TOKEN is correct`);
        console.error(`   - Verify token has 'Send' permissions in Mailtrap dashboard`);
        console.error(`   - Token should NOT include quotes or extra spaces`);
        console.error(`   - Current token starts with: ${this.smtpConfig.auth?.pass?.substring(0, 8)}...`);
      }
      
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Send simulated email (original behavior for development/demo)
   */
  private async sendSimulatedEmail(
    recipient: EmailRecipient,
    content: { subject: string; html: string; text: string },
    emailData: MaintenanceEmailData,
    messageId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      // Simulate occasional failures (5% failure rate)
      if (Math.random() < 0.05) {
        throw new Error('SMTP connection timeout');
      }
      
      // Log the email details (simulation mode)
      console.log(`
📧 EMAIL SIMULATION SUCCESSFUL
=============================
To: ${recipient.name} <${recipient.email}>
Role: ${recipient.role}
Subject: ${content.subject}
Message ID: ${messageId}
Aircraft: ${emailData.aircraftInfo.tailNumber}
Maintenance: ${emailData.maintenanceDetails.type}
Scheduled: ${new Date(emailData.maintenanceDetails.scheduledDate).toLocaleString()}

📧 FULL EMAIL CONTENT PREVIEW:
=============================
Subject: ${content.subject}

HTML Content Length: ${content.html.length} characters
Text Content Length: ${content.text.length} characters

🖥️ To view the full formatted email content, expand this console group:
      `.trim());
      
      // Log the actual email content in a collapsible group
      console.groupCollapsed(`📧 Full Email Content for ${recipient.name} (${recipient.role})`);
      console.log('Subject:', content.subject);
      console.log('HTML Content:');
      console.log(content.html);
      console.log('\nPlain Text Content:');
      console.log(content.text);
      console.groupEnd();
      
      return {
        success: true,
        messageId
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send email via Mailtrap Email Testing API (Sandbox)
   */
  private async sendMailtrapTestingEmail(
    recipient: EmailRecipient,
    content: { subject: string; html: string; text: string },
    emailData: MaintenanceEmailData,
    messageId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    
    try {
      console.log(`📧 Sending email via MAILTRAP EMAIL TESTING to: ${recipient.email}`);
      console.log(`🔑 Testing Host: ${this.smtpConfig.host}`);
      console.log(`📦 Inbox ID: ${this.smtpConfig.inboxId}`);
      console.log(`🔑 API Token: ${this.smtpConfig.auth?.pass?.substring(0, 8)}...`);
      
      const payload = {
        from: {
          email: this.smtpConfig.from,
          name: "Gander Maintenance System"
        },
        to: [
          {
            email: recipient.email,
            name: recipient.name
          }
        ],
        subject: content.subject,
        text: content.text,
        html: content.html,
        headers: {
          "X-Message-ID": messageId,
          "X-Aircraft": emailData.aircraftInfo.tailNumber,
          "X-Maintenance-Type": emailData.maintenanceDetails.type
        }
      };
      
      const apiUrl = `https://${this.smtpConfig.host}/api/send/${this.smtpConfig.inboxId}`;
      console.log(`🌐 Testing API URL: ${apiUrl}`);
      console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
      
      const response = await axios.post(
        apiUrl,
        payload,
        {
          headers: {
            'Api-Token': this.smtpConfig.auth?.pass,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ MAILTRAP TESTING EMAIL SENT SUCCESSFULLY`);
      console.log(`======================================`);
      console.log(`To: ${recipient.name} <${recipient.email}>`);
      console.log(`Role: ${recipient.role}`);
      console.log(`Subject: ${content.subject}`);
      console.log(`Message ID: ${response.data.message_ids?.[0] || messageId}`);
      console.log(`API Response: ${response.status} ${response.statusText}`);
      console.log(`Aircraft: ${emailData.aircraftInfo.tailNumber}`);
      console.log(`Maintenance: ${emailData.maintenanceDetails.type}`);
      console.log(`📧 Check your Mailtrap Testing inbox: https://mailtrap.io/inboxes/${this.smtpConfig.inboxId}`);
      
      return {
        success: true,
        messageId: response.data.message_ids?.[0] || messageId
      };
      
    } catch (error) {
      console.error(`❌ Mailtrap Testing API Error sending to ${recipient.email}:`);
      console.error(`Status: ${error.response?.status}`);
      console.error(`Status Text: ${error.response?.statusText}`);
      console.error(`Data:`, error.response?.data);
      console.error(`Headers:`, error.response?.headers);
      
      // Check common authentication issues for testing
      if (error.response?.status === 401) {
        console.error(`🔐 TESTING AUTHENTICATION ISSUE:`);
        console.error(`   - Check if your MAILTRAP_API_TOKEN is for Email Testing (not Email Sending)`);
        console.error(`   - Verify MAILTRAP_INBOX_ID is correct`);
        console.error(`   - Token should NOT include quotes or extra spaces`);
        console.error(`   - Current token starts with: ${this.smtpConfig.auth?.pass?.substring(0, 8)}...`);
        console.error(`   - Current inbox ID: ${this.smtpConfig.inboxId}`);
      }
      
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get default recipients based on maintenance type and aircraft
   */
  static getDefaultRecipients(maintenanceType: string): EmailRecipient[] {
    const baseRecipients: EmailRecipient[] = [
      { name: 'John Smith', email: 'john.smith@ganderaviation.com', role: 'MECHANIC' },
      { name: 'Tom Anderson', email: 'tom.anderson@ganderaviation.com', role: 'SUPERVISOR' },
      { name: 'Sarah Johnson', email: 'sarah.johnson@ganderaviation.com', role: 'PARTS_MANAGER' }
    ];

    // Add inspector for major maintenance
    if (['C_CHECK', 'ANNUAL', '100_HOUR'].includes(maintenanceType)) {
      baseRecipients.push({
        name: 'David Chen',
        email: 'david.chen@ganderaviation.com',
        role: 'INSPECTOR'
      });
    }

    // Add pilot for operational coordination
    baseRecipients.push({
      name: 'Captain Mike Wilson',
      email: 'mike.wilson@ganderaviation.com',
      role: 'PILOT'
    });

    return baseRecipients;
  }
} 