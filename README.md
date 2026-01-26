# Punch Bot - Telegram Break Tracker 🚽

A fun, sarcastic Google Apps Script bot that tracks team break times using Telegram and Google Sheets.

## 🎯 Features

- ✅ **6 Break Types** - wc, cy, bwc, cf+1, cf+2, cf+3
- ✅ **Break-Specific Sarcasm** - Different funny messages for each break type
- ✅ **Daily Limits** - Prevents abuse with configurable limits per break
- ✅ **Auto-Punch** - Automatically punches out overtime breaks after expected duration + 5 min grace
- ✅ **Daily Reports** - Summarizes total breaks by type (wc, cy, bwc) and shows leaderboard (King of Poop, King of Pee, King of Smoke) at 8 PM
- ✅ **Monthly Migration** - Auto-archives previous month's data on 1st of month
- ✅ **Group Chat Ready** - Tags usernames for clarity in group conversations
- ✅ **Duplicate Prevention** - Can't start a new break while one is active
- ✅ **Overtime Detection** - Warns users when they exceed expected break duration

## 📋 Break Codes

| Code | Duration | Limit/Day | Name | Theme |
|------|----------|-----------|------|-------|
| **wc** | 10 min | 3 | Waste Control | 🚽 Bathroom |
| **cy** | 10 min | 3 | Smoking Break | 🚬 Chill |
| **bwc** | 20 min | 3 | Big Waste Control | 💩 Boss Battle |
| **cf+1** | 20 min | 1 | Breakfast | 🍳 Food Quest |
| **cf+2** | 30 min | 1 | Lunch | 🍽️ Feast |
| **cf+3** | 30 min | 1 | Dinner | 🍴 Feast |

## 🚀 Quick Start

### Prerequisites
- Google Account with Google Apps Script access
- Telegram Bot Token (from @BotFather)
- Google Sheet (for data storage)
- CLASP installed: `npm install -g @google/clasp`

### 1. Setup Google Sheet
1. Create a new Google Sheet
2. Copy the Sheet ID from the URL (`/spreadsheets/d/{SHEET_ID}/...`)
3. Share with your Google Apps Script service account email

### 2. Create Telegram Bot
1. Message @BotFather on Telegram
2. Create a new bot and get the **BOT_TOKEN**
3. Set webhook to your Apps Script deployment URL

### 3. Configure Script Properties
In Apps Script editor (Tools → Script properties):
- **SHEET_ID**: Your Google Sheet ID
- **BOT_TOKEN**: Your Telegram Bot Token

Or run `setScriptProperties()` function in Apps Script and it will prompt you.

### 4. Deploy to Apps Script
1. Clone/push code: `clasp push`
2. Deploy as webhook:
   - Click **Deploy** → **New Deployment**
   - Type: **Web app**
   - Execute as: Your account
   - Who has access: **Anyone**
3. Copy the deployment URL

### 5. Set Telegram Webhook
Use this URL in your terminal (replace YOUR_BOT_TOKEN and DEPLOYMENT_URL):
```bash
curl https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=DEPLOYMENT_URL
```

### 6. Initialize Triggers
Run `setupTriggers()` in Apps Script editor to set up automated tasks:
- Every 1 minute: Auto-punch overtime breaks
- Every day at 8 PM: Send daily report
- Every day at midnight: Monthly migration (if it's the 1st)

## 💬 Telegram Commands

### Start Break
Simply type the break code:
- `wc` - Start 10 min bathroom break
- `bwc` - Start 20 min big bathroom break
- `cy` - Start 10 min smoke break
- `cf+1` - Start 20 min breakfast break
- `cf+2` - Start 30 min lunch break
- `cf+3` - Start 30 min dinner break

### End Break
Type any of these to punch back:
- `back`
- `b`
- `1`
- `btw`
- `back to work`

### Cancel Break
Type any of these to cancel the current break:
- `c`
- `cancel`
- `reset`

## 📊 Data Storage

### Live Breaks Sheet
Tracks active breaks in real-time:
- DATE | TIME | USERNAME | BREAK_CODE | BREAK_NAME | EXPECTED_DURATION | STATUS | CHAT_ID

### Punch Logs Sheet
Stores completed breaks for reporting:
- DATE | TIME_START | USERNAME | BREAK_CODE | TIME_SPENT | TIME_END | STATUS | CHAT_ID

### Archive Sheets
Monthly archives created with name format: `M/YYYY Archive`

## 🔧 Utility Functions

For troubleshooting and management:

### `checkSheetHeaders()`
Displays all sheet headers and sample data. Use in Execution log to verify setup.

### `listAllSheets()`
Lists all sheets in your Google Sheet with row counts.

### `dailyReport()`
Manually trigger the daily report (normally runs at 8 PM).

### `autoPunchBackOvertime()`
Manually trigger auto-punch check (normally runs every minute).

### `monthlyMigration()`
Manually trigger data archival (normally runs on 1st of month).

## 🗂️ File Structure

```
Punch Bot/
├── punchbot.js           # Main bot code (890 lines)
├── appsscript.json       # Apps Script manifest
├── .clasp.json           # CLASP configuration
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

## 📝 Code Organization

**Constants** (lines 1-50)
- Configuration and break definitions
- Sheet names
- Keywords for triggers

**Diagnostic Functions** (lines 50-90)
- `listAllSheets()` - Lists all sheets
- `checkSheetHeaders()` - Shows sheet structure

**Sarcasm System** (lines 100-330)
- 6 break-specific sarcasm objects
- 5 message types per break: welcomeBack, breakStarted, overtimeWarning, limitReached, cancelled
- Invalid code sarcasm (10 messages)
- `getRandomSarcasm()` helper function

**Core Functions** (lines 350-800)
- `doPost(e)` - Telegram webhook handler
- `processBreak()` - Start new break
- `handlePunchBack()` - End break
- `handleCancel()` - Cancel active break
- `parseBreakCode()` - Parse user input
- `autoPunchBackOvertime()` - Auto-punch logic
- `sendTelegramMessage()` - Telegram API caller

**Reporting & Archival** (lines 800-860)
- `dailyReport()` - Send daily summary
- `monthlyMigration()` - Archive old data

**Setup** (lines 860-900)
- `setupTriggers()` - Configure time-based triggers
- `setScriptProperties()` - Configure credentials

## 🎨 Sarcasm & Humor

Each break type has unique themed sarcasm:
- **WC**: Bathroom/porcelain throne humor
- **BWC**: Epic boss battle/dungeon vibes
- **CY**: Chill/zen/smoke break energy
- **CF**: Food quest/feast themes

Invalid codes get roasted with 10 different sarcastic responses!

## ⚙️ Technical Details

- **Language**: Google Apps Script (JavaScript)
- **Infrastructure**: Serverless (Google Apps Script)
- **Data**: Google Sheets (2 sheets + archives)
- **Messaging**: Telegram Bot API
- **Automation**: Time-based triggers (Apps Script)
- **Date Format**: M/D/YYYY (text, no auto-conversion)
- **Time Format**: HH:MM:SS (text, no auto-conversion)

## 🐛 Troubleshooting

### Bot not responding
1. Check webhook URL is set: `curl https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo`
2. Check Script Properties are set (run `setScriptProperties()`)
3. Check execution logs: Open Apps Script → Execution log

### Sheets not found
Run `checkSheetHeaders()` to see current sheet structure and errors.

### Break codes matching wrong code
- Parser checks longer codes first (cf+1, cf+2, cf+3 before wc, cy)
- All values are text format (no auto-conversion)

### Overtime not detecting
- Grace period is 5 minutes after expected duration
- Check `autoPunchBackOvertime()` logs

## 📈 Workflow Example

```
1. Employee types "wc" → Bot logs break, shows sarcasm
2. Live_Breaks gets new row with ON BREAK status
3. Employee types "back" after 8 minutes → Bot moves to Punch_Logs
4. At 8 PM → Daily report sent to all employees
5. On 1st of month → Previous month archived, Punch_Logs cleared
```

## 🚀 Deployment Checklist

Before final push:
- [ ] SHEET_ID set in Script Properties
- [ ] BOT_TOKEN set in Script Properties
- [ ] Webhook URL configured in Telegram
- [ ] Triggers initialized via `setupTriggers()`
- [ ] Test all break codes in Telegram
- [ ] Test punch back with "back" keyword
- [ ] Test cancel with "c" keyword
- [ ] Test invalid code for sarcasm response
- [ ] Check Sheet is readable/writable
- [ ] Verify daily report fires at 8 PM
- [ ] Monthly migration scheduled for 1st

## 📞 Support

Check execution logs in Apps Script:
1. Open Apps Script editor
2. Click **Execution log** (or Ctrl+Enter after running a function)
3. Look for error messages and timestamps
