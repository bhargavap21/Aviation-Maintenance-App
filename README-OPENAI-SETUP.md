# OpenAI Integration Setup

## Overview
Your Gander Maintenance App now has **real AI-powered maintenance recommendations** using OpenAI GPT-4o-mini! 

## Current Status
✅ **Working in Demo Mode**: The system is currently running enhanced demo AI recommendations  
🔧 **Ready for OpenAI**: Just add your API key to enable real GPT-powered analysis

## Setup Instructions

### 1. Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account or sign in
3. Generate a new API key
4. Copy the key (starts with `sk-...`)

### 2. Add API Key to Environment

Create a `.env.local` file in your project root:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-actual-api-key-here

# Other existing config...
AVIATIONSTACK_API_KEY=your_aviationstack_api_key_here
SMTP_HOST=localhost
SMTP_PORT=587
```

### 3. Restart Your Development Server

```bash
npm run dev
```

## What Changes With Real OpenAI?

### ❌ **Before (Demo Mode)**
- Fixed confidence calculations using mathematical formulas
- Predictable recommendations based on rules
- Same reasoning patterns every time

### ✅ **After (Real OpenAI)**
- **Dynamic AI confidence scores** (50-95% range) based on actual analysis
- **Contextual reasoning** that considers aircraft specifics, utilization patterns, and maintenance history
- **Varied recommendations** that change based on real aircraft data
- **Expert aviation maintenance knowledge** from GPT training
- **Regulatory compliance awareness** (FAA Parts 91, 135, 145)

## Example AI Output

```json
{
  "tailNumber": "N123AB",
  "maintenanceType": "C_CHECK", 
  "confidence": 87.5,
  "reasoning": "Based on 79% utilization over 186 flight hours with increasing trend and medium risk profile, a comprehensive C-Check is recommended. Aircraft shows signs of accelerated wear due to high-frequency operations. Current maintenance window from Dec 15-22 provides optimal scheduling opportunity.",
  "estimatedCost": 85000,
  "priority": "HIGH",
  "riskFactors": ["High utilization rate", "Increasing flight activity", "Scheduled inspection due"],
  "complianceRequirements": ["FAR 91.409", "FAR 135.421", "FAR 145.109"]
}
```

## Cost Information

- **Model**: GPT-4o-mini (cost-effective)
- **Estimated cost**: ~$0.01-0.05 per optimization run
- **Usage**: Only called when optimizing schedules (not on every page load)

## Fallback Behavior

If the OpenAI API is unavailable or the key is invalid:
- ✅ System continues working normally
- 🔄 Falls back to enhanced demo recommendations
- 📝 Logs show fallback status in console

## Verification

Check the browser console or server logs for:
- `🤖 OpenAI API key not provided - using enhanced demo AI recommendations` (Demo mode)
- `🤖 Sending 3 aircraft to OpenAI for analysis...` (Real AI mode)
- `✅ Generated X AI recommendations` (Success)

Your maintenance recommendations will now have **real AI intelligence** instead of fake confidence scores! 