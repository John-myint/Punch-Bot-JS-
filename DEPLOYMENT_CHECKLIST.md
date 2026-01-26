# Punch Bot - Deployment Checklist ✅

## Pre-Deployment Setup

### 1. Google Sheet Setup
- [ ] Create a new Google Sheet
- [ ] Copy Sheet ID from URL
- [ ] Share sheet with your Google Apps Script account
- [ ] Verify sheets are readable/writable

### 2. Telegram Bot Setup
- [ ] Message @BotFather on Telegram
- [ ] Create new bot
- [ ] Copy bot token (keep secure!)
- [ ] Note bot username

### 3. Google Apps Script Setup
- [ ] Open your Apps Script project
- [ ] Paste code from `punchbot.js`
- [ ] Copy `appsscript.json` manifest with timezone configuration
- [ ] Go to **Tools** → **Script properties**
- [ ] Add properties:
  - **SHEET_ID**: Your Google Sheet ID
  - **BOT_TOKEN**: Your Telegram Bot Token
- [ ] Verify **appsscript.json** contains:
  ```json
  {
    "timeZone": "Asia/Dubai",
    "exceptionLogging": "STACKDRIVER",
    "runtimeVersion": "V8"
  }
  ```
- [ ] Save all changes

### 4. Deploy as Web App
- [ ] Click **Deploy** → **New Deployment**
- [ ] Select type: **Web app**
- [ ] Execute as: **Your Google Account**
- [ ] Who has access: **Anyone**
- [ ] Click **Deploy**
- [ ] Copy the deployment URL (keep this!)

### 5. Configure Telegram Webhook
Open PowerShell and run (replace placeholders):
```powershell
$TOKEN = "YOUR_BOT_TOKEN"
$URL = "YOUR_DEPLOYMENT_URL"
curl.exe "https://api.telegram.org/bot$TOKEN/setWebhook?url=$URL"
```

Expected response: `{"ok":true,"result":true,"description":"Webhook was set"}`

### 6. Initialize Triggers
- [ ] Go back to Apps Script editor
- [ ] Select function dropdown → choose `setupTriggers`
- [ ] Click **Run** (▶️)
- [ ] Allow permissions when prompted
- [ ] Check execution log for success

### 7. Test in Telegram
- [ ] Start conversation with your bot
- [ ] Type `wc` → Should get break confirmation with sarcasm
- [ ] Type `back` → Should get welcome back message with sarcasm
- [ ] Type `xyz` → Should get invalid code sarcasm roast
- [ ] Type `c` → Should cancel break if one is active
- [ ] Check Google Sheet for data in Live_Breaks

## Verification Checks

### Sheet Structure
Run `checkSheetHeaders()` in Apps Script and verify:
- [ ] Live_Breaks sheet exists with 8 columns
- [ ] Punch_Logs sheet exists with 8 columns
- [ ] Column names match documentation
- [ ] No corrupted data

### Break Codes
Test all 6 break codes:
- [ ] `wc` - 10 min, limit 3/day ✅
- [ ] `cy` - 10 min, limit 3/day ✅
- [ ] `bwc` - 20 min, limit 3/day ✅
- [ ] `cf+1` - 20 min, limit 1/day ✅
- [ ] `cf+2` - 30 min, limit 1/day ✅
- [ ] `cf+3` - 30 min, limit 1/day ✅

### Keywords
- [ ] `back` ends break ✅
- [ ] `b` ends break ✅
- [ ] `1` ends break ✅
- [ ] `c` cancels break ✅
- [ ] `cancel` cancels break ✅

### Sarcasm System
- [ ] Different messages each time (randomized) ✅
- [ ] Break-specific themes working ✅
- [ ] Invalid code gets roasted ✅
- [ ] Username tagged in all messages ✅

### Automations
- [ ] `autoPunchBackOvertime()` works (test with long break)
- [ ] `dailyReport()` sends correct format at 8 PM
- [ ] `monthlyMigration()` archives on 1st of month

### Data Integrity
- [ ] No date/time auto-conversion issues
- [ ] All values stored as text format
- [ ] Dates in M/D/YYYY format
- [ ] Times in HH:MM:SS format

## Production Monitoring

### Daily Checks
- [ ] Check logs: `clasp logs`
- [ ] Review daily report format
- [ ] Verify no error messages

### Monthly Tasks
- [ ] Verify monthly migration worked
- [ ] Archive sheet created with proper naming
- [ ] Punch_Logs cleared for new month

### User Feedback
- [ ] Collect feedback on sarcasm level
- [ ] Monitor break usage patterns
- [ ] Track most used break types

## Troubleshooting

If something breaks:

1. **Bot not responding**
   ```
   curl https://api.telegram.org/bot{TOKEN}/getWebhookInfo
   ```
   Check if webhook URL is correct.

2. **Sheets not updating**
   - Run `checkSheetHeaders()`
   - Check Script Properties are set
   - Verify sheet is shared with service account

3. **Overtime not detecting**
   - Check `autoPunchBackOvertime()` logs
   - Verify 5-minute grace period is correct
   - Test with manual punch-out after set time

4. **Daily report not sending**
   - Check trigger is set: Run `setupTriggers()` again
   - Verify timezone in **appsscript.json**: Must be `Asia/Dubai`
   - Check spreadsheet timezone: Run `listAllSheets()` and verify
   - Check Punch_Logs has data for today

## Post-Deployment

- [ ] Document any customizations made
- [ ] Save bot token in secure location
- [ ] Set up GitHub for version control
- [ ] Create team documentation
- [ ] Schedule monthly review

## Emergency Contacts

- **Apps Script Issues**: Check execution logs
- **Telegram API**: Docs at https://core.telegram.org/bots/api
- **Google Sheets**: Check if sheet permissions are correct

---

**Deployment Date**: ________________

**Deployed By**: ________________

**Notes**: 

