# Punch Bot - Quick Reference 🚀

## Telegram Commands

### Start a Break
```
wc    → 10 min bathroom (3/day)
cy    → 10 min chill (3/day)
bwc   → 20 min big bathroom (3/day)
cf+1  → 20 min breakfast (1/day)
cf+2  → 30 min lunch (1/day)
cf+3  → 30 min dinner (1/day)
```

### End a Break
```
back  → End current break
b
1
btw
back to work
```

### Cancel a Break
```
c
cancel
reset
```

## Example Workflow

1. **9:00 AM** - Type `wc` 
   - Bot: "🧻 Bathroom run initiated… Godspeed 🚽" (random sarcasm)
   - Logged in Live_Breaks sheet

2. **9:08 AM** - Type `back`
   - Bot: "🧻 Welcome back! You survived 😌" (random sarcasm)
   - Moved to Punch_Logs with 8 minutes logged

3. **5:00 PM** - Type `invalid_code`
   - Bot: "❓ Bro… that is not even close 😂" (roasted!)

4. **8:00 PM**
   - Automatic daily report sent:
   ```
   📊 DAILY REPORT - 1/26/2026
   
   � TOTAL BREAKS TODAY:
   🚽 WC: 24x
   🚬 CY: 22x
   💩 BWC: 10x
   
   🏆 LEADERBOARD:
   💩 King of Poop (BWC): @user_a
   🚽 King of Pee (WC): @user_b
   🚬 King of Smoke (CY): @user_c
   ```

## Apps Script Functions

### Utility Functions
```javascript
checkSheetHeaders()      // Show sheet structure
listAllSheets()          // List all sheets
dailyReport()            // Manually send daily report
autoPunchBackOvertime()  // Manually check overtime
```

### Setup Functions
```javascript
setupTriggers()          // Initialize automations
setScriptProperties()    // Set SHEET_ID & BOT_TOKEN
```

## Sheet Columns

### Live_Breaks
1. DATE (M/D/YYYY)
2. TIME (HH:MM:SS)
3. USERNAME
4. BREAK_CODE
5. EXPECTED_DURATION
6. STATUS (ON BREAK)
7. CHAT_ID

### Punch_Logs
1. DATE (M/D/YYYY)
2. TIME_START (HH:MM:SS)
3. USERNAME
4. BREAK_CODE
5. TIME_SPENT (minutes)
6. TIME_END (HH:MM:SS)
7. STATUS (✅ OK / ⚠️ OVER TIME / ⚠️ AUTO PUNCHED)
8. CHAT_ID

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Bot not responding | Check webhook: `curl https://api.telegram.org/bot{TOKEN}/getWebhookInfo` |
| Wrong duration shown | Parser checks longer codes first (bwc before wc) |
| No sarcasm message | Check BREAK_SARCASM has all 6 break types |
| Data not saving | Run `checkSheetHeaders()` - verify sheet exists |
| No daily report | Check triggers are set via `setupTriggers()` |

## Sarcasm Themes

- **WC** 🚽 - Bathroom/throne humor
- **BWC** 💩 - Epic boss battle vibes
- **CY** 🚬 - Chill/zen energy
- **CF** 🍽️ - Food quest theme

## Key Settings

| Setting | Value | Notes |
|---------|-------|-------|
| Grace Period | 5 min | After expected duration before auto-punch |
| Daily Report | 8 PM | Sent automatically every day |
| Monthly Archive | 1st of month | Creates "M/YYYY Archive" sheet |
| Date Format | M/D/YYYY | Text format, no auto-convert |
| Time Format | HH:MM:SS | Text format, no auto-convert |

## Files

| File | Purpose |
|------|---------|
| `punchbot.js` | Main bot code (923 lines) |
| `appsscript.json` | Project manifest |
| `.clasp.json` | CLASP configuration |
| `README.md` | Full documentation |
| `DEPLOYMENT_CHECKLIST.md` | Setup verification |
| `QUICK_REFERENCE.md` | This file |

## Deployment

```bash
# Push code changes
clasp push

# View logs
clasp logs

# Open editor
clasp open
```

## Contact & Support

For issues:
1. Check execution logs in Apps Script
2. Run `checkSheetHeaders()` for diagnostics
3. Review README.md for detailed docs
4. Check DEPLOYMENT_CHECKLIST.md for setup issues
