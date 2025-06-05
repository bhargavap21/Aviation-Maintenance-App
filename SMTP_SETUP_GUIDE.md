# 📧 Real Email Integration Setup Guide

Your Gander Maintenance App now supports **real email sending** with multiple SMTP providers! Choose the option that best fits your needs.

## 🚀 **Quick Setup Options**

### **Option 1: Mailtrap (Recommended for Development)**
Perfect for testing - emails are captured and viewable in web interface, not delivered to real recipients.

1. **Sign up** at [mailtrap.io](https://mailtrap.io) (free account)
2. **Go to**: Email Testing → Inboxes → Your Inbox → Integrations → Nodemailer
3. **Copy credentials** and add to your `.env.local`:

```bash
EMAIL_PROVIDER=mailtrap
EMAIL_FROM=noreply@ganderaviation.com
MAILTRAP_USER=your_mailtrap_username
MAILTRAP_PASS=your_mailtrap_password
```

4. **Test emails** will appear in your Mailtrap inbox with full HTML formatting!

---

### **Option 2: Gmail SMTP (Real Email Delivery)**
Use your Gmail account to send actual emails.

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account Settings → Security → 2-Step Verification → App passwords
   - Generate password for "Mail" 
3. **Add to `.env.local`**:

```bash
EMAIL_PROVIDER=gmail
GMAIL_USER=your.email@gmail.com
GMAIL_APP_PASSWORD=your_16_character_app_password
```

**⚠️ Important**: Use App Password, not your regular Gmail password!

---

### **Option 3: SendGrid (Professional Service)**
Reliable service with free tier (100 emails/day).

1. **Sign up** at [sendgrid.com](https://sendgrid.com) (free tier available)
2. **Create API Key**: Settings → API Keys → Create API Key
3. **Add to `.env.local`**:

```bash
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@yourdomain.com
SENDGRID_API_KEY=SG.your_sendgrid_api_key
```

---

### **Option 4: Keep Simulation Mode**
Continue with current simulation behavior (no real emails).

```bash
EMAIL_PROVIDER=simulation
EMAIL_FROM=noreply@ganderaviation.com
```

## 📝 **Setup Instructions**

### **Step 1: Create Environment File**
Create a `.env.local` file in your project root:

```bash
# Copy one of the configurations above
EMAIL_PROVIDER=mailtrap
EMAIL_FROM=noreply@ganderaviation.com
MAILTRAP_USER=your_username
MAILTRAP_PASS=your_password
```

### **Step 2: Restart Development Server**
```bash
pkill -f "next dev"  # Stop current server
npm run dev          # Start with new config
```

### **Step 3: Test Email System**
1. Go to `http://localhost:3000/schedule`
2. Click "AI Recommendations" tab
3. Enter your email in the "Test Email Notification System"
4. Click "Send Test Email"

## 🎯 **What You'll See**

### **With Real SMTP (Mailtrap/Gmail/SendGrid):**
```
✅ REAL EMAIL SENT SUCCESSFULLY
========================
To: Your Name <your.email@domain.com>
Role: TEST_USER
Subject: 🔧 SCHEDULED MAINTENANCE: N123DEMO - A_CHECK
Message ID: 123456789.abc@domain.com
SMTP Response: 250 2.0.0 OK
Aircraft: N123DEMO
Maintenance: A_CHECK
```

### **With Simulation Mode:**
```
📧 EMAIL SIMULATION SUCCESSFUL
=============================
To: Your Name <your.email@domain.com>
Role: TEST_USER
Subject: 🔧 SCHEDULED MAINTENANCE: N123DEMO - A_CHECK
Message ID: msg-1749090884200-zjf8j4j5o
Aircraft: N123DEMO
Maintenance: A_CHECK
```

## 📧 **Email Features**

Your maintenance emails include:
- ✅ **Professional HTML formatting** with aircraft branding
- ✅ **Complete maintenance details** (aircraft, schedule, cost)
- ✅ **Role-specific responsibilities** (mechanic, inspector, supervisor)
- ✅ **Team assignments** and resource allocation
- ✅ **FAR compliance requirements** and documentation checklist
- ✅ **Interactive dashboard links**
- ✅ **Mobile-responsive design**

## 🔧 **Troubleshooting**

### **"No actual email sent" message:**
- This is normal in simulation mode
- Check your `.env.local` file configuration
- Restart the development server

### **SMTP connection errors:**
- Verify credentials in `.env.local`
- For Gmail: Use App Password, not regular password
- For Mailtrap: Check username/password from dashboard

### **Emails not received (Gmail):**
- Check spam folder
- Verify App Password is correct
- Ensure 2FA is enabled on Gmail account

## 🚀 **Production Deployment**

For production environments:
1. Use **SendGrid** or **AWS SES** for reliability
2. Set up **SPF/DKIM** records for your domain
3. Configure **bounce handling** and **unsubscribe** links
4. Monitor **delivery rates** and reputation

## 📊 **Email Analytics**

The system logs detailed information for each email:
- Delivery status and response codes
- Recipient engagement tracking
- Failed delivery reasons
- Full email content for debugging

---

**🎉 You're all set!** Your maintenance system now sends professional emails to your entire team when maintenance is approved. 