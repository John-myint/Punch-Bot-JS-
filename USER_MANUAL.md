# 👤 Punch Bot - User Manual

**For Team Members Using the Break Tracker**

---

## 🎯 What is Punch Bot?

Punch Bot is a **fun, sarcastic Telegram bot** that tracks when you take breaks in your team's group chat.

Just type a break code in the group, and the bot will:
- Confirm your break with a funny message (everyone in the group sees this)
- Keep track of how long you were away
- What type of break you took
- How many breaks you've had today
- Whether you went over time

The bot responds with **funny, themed messages** to keep things lighthearted! 😄

---

## ✨ The Sarcasm

Each break type has its own personality:

- 🚽 **WC** - Bathroom humor (porcelain throne jokes)
- 🚬 **CY** - Chill vibes (relaxation humor)
- 💩 **BWC** - Epic battle vibes (boss fight theme)
- 🍳 **CF+1** - Breakfast humor (food quest theme)
- 🍽️ **CF+2** - Lunch humor (feast theme)
- 🍴 **CF+3** - Dinner humor (fine dining theme)

**Example responses:**
- ✅ When you START: *"🚽 Entering the porcelain portal…"*
- ✅ When you END: *"🚽 The pipes thank you."*
- ✅ When you're LATE: *"🚽 At this point, you live there now."*

It's funny, not mean! The sarcasm encourages you to actually come back on time. 😄

---

## 🚀 Getting Started

### That's It!

You're already added to the Telegram group with the bot. The bot is listening to all messages in the group.

Just start typing break codes and the bot will respond to you automatically. No setup needed! 🎉

---

## 💬 How to Use - Commands

### 1️⃣ START A BREAK

Just type the **break code** and hit send:

```
wc          (10 min bathroom break)
cy          (10 min smoke break)
bwc         (20 min big bathroom break)
cf+1        (20 min breakfast)
cf+2        (30 min lunch)
cf+3        (30 min dinner)
```

**What happens:**
- Bot confirms your break with a funny message
- You appear as "ON BREAK" in the system
- Timer starts counting
- You have `[X]` breaks left for today (if you have a daily limit)

**Example:**
```
You: wc
Bot: 🚽 Bathroom run initiated… Godspeed 🚽
     ⏱️ Waste Control (10 min)
     📊 Status: OK | 1/3 used today
```

---

### 2️⃣ END A BREAK

When you're back, type ANY of these:

```
back
b
1
btw
back to work
```

**What happens:**
- Bot calculates how long you were gone
- Marks break as complete
- Sends welcome back message
- Shows actual time vs expected time

**Example:**
```
You: back
Bot: 🧻 Welcome back! You survived 😌
     ⏱️ Expected: 10min
     📊 Actual: 8min
     (2min under)
```

---

### 3️⃣ CANCEL A BREAK

If you need to cancel/undo a break, type:

```
c
cancel
reset
```

**What happens:**
- Current break is deleted
- You get a sarcasm roast about cancelling
- No record kept

**Example:**
```
You: c
Bot: ❌ Wc break cancelled!
```

---

## ⚠️ Important Rules

### Daily Limits
Each break type has a limit per day:

| Break | Limit | Meaning |
|-------|-------|---------|
| wc | 3/day | Max 3 bathroom breaks |
| cy | 3/day | Max 3 smoke breaks |
| bwc | 3/day | Max 3 big bathroom breaks |
| cf+1 | 1/day | Only 1 breakfast |
| cf+2 | 1/day | Only 1 lunch |
| cf+3 | 1/day | Only 1 dinner |

**If you hit the limit:**
```
You: wc
Bot: 🛑 That's your limit for wc today.
```

### Grace Period (⏰ Important!)
- If you take longer than expected, you get a **5-minute grace period**
- After that, the bot **automatically punches you back**
- You'll get a warning message
- The break is marked as "⚠️ OVER TIME"

**Example:**
```
You took a 10-min break but stayed 18 minutes
Bot (auto): 🚽 You okay in there? It's been a while 👀
            ⏱️ Expected: 10min
            📊 Actual: 18min
            🚨 Over by 8min!
```

### No Duplicates
**Can't start a new break while one is active!**

```
You: wc         (starts break)
You: cy         (tries to start another)
Bot: 🤨 You already have an active break!
     Active: wc (15:30:45)
     Type "back" to close it first!
```

**Solution**: End current break first with `back`, then start a new one.

---

## 📊 What the Bot Tracks

The bot records:
- ✅ Date (YYYY/MM/DD)
- ✅ Start time (hour:minute:second)
- ✅ End time
- ✅ How long you were actually away
- ✅ Your username
- ✅ Type of break
- ✅ Status (OK / OVER TIME / AUTO PUNCHED)

This is used for:
- 📈 Daily reports (how much time everyone took)
- 📅 Monthly summaries
- 📊 Tracking patterns
- ✅ Verification

---

## 📋 Daily Report

**Every day at 8 PM**, you'll get an automated report showing:
- Total breaks taken that day by type (wc, cy, bwc only - meals excluded)
- Who's the King of Poop, King of Pee, and King of Smoke

**Example:**
```
📊 DAILY REPORT - 1/26/2026

📊 TOTAL BREAKS TODAY:
🚽 WC: 24x
🚬 CY: 22x
💩 BWC: 10x

🏆 LEADERBOARD:
💩 King of Poop (BWC): @user_a
🚽 King of Pee (WC): @user_b
🚬 King of Smoke (CY): @user_c
```

---

## ⏳ Queue Processing (Fast & Reliable)

**Since Version 2.1**, the bot uses a **smart queue system** to handle many people taking breaks at the same time.

### What's the Queue?
The queue is like a **digital waiting line**. When you send a break code:
1. You get an instant **"⏳ Processing..."** message
2. Your request goes into the queue
3. The bot processes requests **one at a time** (very fast)
4. You get your confirmation message

### Why This Matters
- ✅ **Works with many people at once** (30-70 simultaneous requests)
- ✅ **No data corruption or lost data**
- ✅ **No duplicate entries**
- ✅ **Fast processing** (less than 5 seconds per request)

### What You See
When you send `wc`:
```
You: wc
Bot: ⏳ Processing...
     (less than 5 seconds later)
Bot: 🚽 Bathroom run initiated…
     ⏱️ Waste Control (10 min)
     📊 Status: OK | 1/3 used today
```

The "⏳ Processing..." message is normal and means your request is being handled safely!

---

## 💡 Pro Tips

### Tip 1: You're in a Group Chat with Everyone
The bot is in the group chat with your team. When you type a break code, the bot responds publicly so everyone can see who's on break and when.
```
You: wc
Bot: 👤 @john_doe
     🚽 Bathroom run initiated…
```
Everyone sees this - that's how it works!

### Tip 2: Be Honest About Time
The bot counts actual time, so:
- Don't start the break until you're actually leaving
- End the break when you're back
- Not 5 minutes later! 😄

### Tip 3: Know Your Limits
Check the daily limits table above to avoid getting rejected.

### Tip 4: Respect the Grace Period
- You get 5 extra minutes beyond the expected time
- Use it wisely!
- The bot will warn you if you're over

### Tip 5: Cancel if You Need To
If you accidentally started a break:
```
You: c
Bot: ❌ Wc break cancelled!
```

It's gone. No record. Start over if needed.

---

## ❓ FAQ - Common Questions

### Q: What if I forget to end my break?
**A:** The bot automatically ends it after the expected time + 5 min grace period. You'll get a warning message and it's marked "⚠️ AUTO PUNCHED".

### Q: Can I take multiple breaks at once?
**A:** No. You must end one break before starting another.

### Q: What if I go over the time limit?
**A:** You'll get a warning message showing:
- How long you were supposed to be gone
- How long you actually were gone
- How much over you are

### Q: Does the daily report show everyone's data?
**A:** Yes! It's shared with the whole team (or group). Everyone can see everyone's break times.

### Q: What if I don't end my break?
**A:** The bot automatically ends it after 5 minutes past the expected time and warns you.

### Q: Can I take more than the daily limit?
**A:** No. Once you hit your limit, you'll get a rejection message:
```
Bot: 🛑 That's your limit for wc today.
```

### Q: Why does the bot send sarcasm?
**A:** To keep things fun and encourage you to come back on time! The sarcasm is lighthearted, not mean.

### Q: What's the difference between the break codes?
**A:** Different lengths and daily limits. See the table at the top of this guide.

### Q: Can I cancel a break after it's done?
**A:** No, only active (ongoing) breaks can be cancelled. Once marked as complete, it's in the record.

### Q: Does the bot work in group chats?
**A:** Yes! It works in both direct messages and group chats. It tags your username so people know who the message is for.

---

## 🚨 Error Messages & Solutions

### "That's not a break code!"
```
You: xyz
Bot: ❓ Bro… that is not even close 😂
     Try: wc, cy, bwc, cf+1, cf+2, cf+3
```
**Solution**: Use one of the 6 valid break codes listed above.

---

### "You already have an active break!"
```
You: wc
You: cy
Bot: 🤨 You already have an active break!
     Active: wc (15:30:45)
     Type "back" to close it first!
```
**Solution**: Type `back` to end the current break, then start the new one.

---

### "That's your limit for [break] today!"
```
You: wc (3rd time)
Bot: 🛑 That's your limit for wc today.
```
**Solution**: You've hit the daily limit. Try a different break type or come back tomorrow.

---

### "No active break found!"
```
You: back (when not on break)
Bot: 🤔 No active break found. Type a break code first!
```
**Solution**: You must start a break first. Type the break code (wc, cy, etc.).

---

### "No entry to cancel today!"
```
You: c (when no active break)
Bot: ⚠️ No entry to cancel today!
```
**Solution**: You don't have an active break to cancel.

---

## 📞 Need Help?

### If the bot isn't working:
1. Check your internet connection
2. Make sure you're messaging the right bot
3. Try typing a command exactly as shown
4. Restart Telegram

### If you have questions:
- Ask your admin/team lead
- They have detailed documentation
- They can check logs if needed

### If you notice a bug:
- Tell your admin
- They can restart the bot if needed

---

## 🎉 Tips for Success

✅ **DO:**
- Start break when you're actually leaving
- End break when you're actually back
- Use the correct break code
- Follow the daily limits
- Come back before the grace period ends
- Have fun with the sarcasm! 😄

❌ **DON'T:**
- Try to start 2 breaks at once
- Make up break codes
- Forget to end your break (auto-punch will get you)
- Go way over time (the bot will roast you)
- Expect the system to remember breaks from yesterday

---

## 🏁 Quick Command Reference

| Need | Type | Bot Responds |
|------|------|--------------|
| Start wc | `wc` | Break confirmed + sarcasm |
| Start cy | `cy` | Break confirmed + sarcasm |
| Start bwc | `bwc` | Break confirmed + sarcasm |
| Start lunch | `cf+2` | Break confirmed + sarcasm |
| End break | `back` | Welcome back + time summary |
| End break | `b` or `1` | Welcome back + time summary |
| Cancel | `c` | Break cancelled + sarcasm |
| Cancel | `cancel` | Break cancelled + sarcasm |

---

## 📅 Timeline Example

```
9:00 AM → Type "wc"
         Bot: "🚽 Bathroom run initiated… Godspeed 🚽"
         
9:08 AM → Type "back"
         Bot: "🚽 Welcome back! You survived 😌"
         Status: ✅ OK (8 min actual, 10 min expected)

12:00 PM → Type "cf+2"
          Bot: "🍽️ Food quest started. Go eat like a king 👑"
          
12:35 PM → Type "back"
          Bot: "🍽️ Welcome back, fully fueled 🔥"
          Status: ⚠️ OVER TIME (35 min actual, 30 min expected)
          Bot warns: 5 min over!

8:00 PM → Daily Report arrives
         📊 DAILY REPORT - 1/26/2026
         Your breaks: wc (8min), cf+2 (35min)
         Total: 2 breaks, 43 minutes
```

---

## 🎊 That's It!

You're ready to start using Punch Bot! 

Just:
1. Type a break code to START
2. Type `back` to END
3. Type `c` to CANCEL (if needed)
4. Have fun with the sarcasm! 😄

**Welcome to the team!** ✅

---

**Remember**: The bot is fun, but it's also accurate. Come back on time, have fun, and enjoy the sarcasm! 🚀

For detailed technical info, ask your admin. This manual is just for using the bot day-to-day.

**Happy break-taking!** 🎉
