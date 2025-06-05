# 📧 Quick Gmail SMTP Setup Example

Want to send **real emails** from your prototype? Here's the fastest way using Gmail:

## **Step 1: Enable 2-Factor Authentication**
1. Go to [Google Account Settings](https://myaccount.google.com/security)
2. Click "2-Step Verification"
3. Follow the setup process (required for App Passwords)

## **Step 2: Generate App Password** 
1. In Google Account Settings → Security → 2-Step Verification
2. Scroll down to "App passwords" 
3. Click "App passwords"
4. Select "Mail" → Generate
5. **Copy the 16-character password** (like: `abcd efgh ijkl mnop`)

## **Step 3: Configure Your App**
Create/edit `.env.local` in your project root:

```bash
# Real Gmail SMTP Configuration
EMAIL_PROVIDER=gmail
GMAIL_USER=your.email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

## **Step 4: Restart & Test**
```bash
pkill -f "next dev"  # Stop server
npm run dev          # Start with Gmail config
```

Then test at: `http://localhost:3000/schedule`

## **What You'll See:**
```
🧪 Test email service initialized with provider: GMAIL
📧 Sending real email via GMAIL to: your.email@domain.com
✅ REAL EMAIL SENT SUCCESSFULLY
========================
To: Demo User <your.email@domain.com>
Subject: 🔧 SCHEDULED MAINTENANCE: N123DEMO - A_CHECK
Message ID: <real.message.id@gmail.com>
SMTP Response: 250 2.0.0 OK 1749091234567
Aircraft: N123DEMO
Maintenance: A_CHECK
```

**✅ You'll receive an actual email** with professional HTML formatting!

## **Switch Back to Simulation:**
```bash
# In .env.local
EMAIL_PROVIDER=simulation
```

**🎉 That's it!** Your prototype now sends real maintenance notifications to your team. 