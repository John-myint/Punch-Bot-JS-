# 🚀 Quick Start: Auto-Deployment in 5 Minutes

## ✅ Files Created for You

- ✅ `.github/workflows/deploy.yml` - GitHub Actions workflow
- ✅ `.claspignore` - Excludes documentation from deployment
- ✅ `.gitignore` - Protects credentials
- ✅ `setup-auto-deploy.sh` - Automated setup script

---

## 🏃 Quick Setup (5 minutes)

### **Option A: Automated Setup (Recommended)**

```bash
cd "/Users/kyawlaymyint/Desktop/CoinCapTrading/Punch Card bot"

# Run the setup script:
bash setup-auto-deploy.sh
```

The script will:
1. ✅ Check if clasp is installed
2. ✅ Verify login status
3. ✅ Test deployment
4. ✅ Show credentials for GitHub secrets

---

### **Option B: Manual Setup**

#### **Step 1: Install and login to clasp** (2 min)

```bash
# Install clasp globally:
npm install -g @google/clasp

# Login to Google:
clasp login
# Browser will open → Grant permissions → Close browser
```

#### **Step 2: Test manual deployment** (1 min)

```bash
cd "/Users/kyawlaymyint/Desktop/CoinCapTrading/Punch Card bot"

# Test deployment:
clasp push --force

# Should see:
# └─ punchbot_fastest.js
# └─ appsscript.json
# Pushed 2 files.
```

#### **Step 3: Get credentials** (1 min)

```bash
# Display your credentials:
cat ~/.clasprc.json

# Copy the ENTIRE output (looks like JSON)
```

#### **Step 4: Add GitHub Secrets** (1 min)

1. Go to your GitHub repo: **Settings → Secrets and variables → Actions**

2. Click **"New repository secret"**

3. Add **CLASP_TOKEN**:
   ```
   Name: CLASP_TOKEN
   Value: <paste entire JSON from ~/.clasprc.json>
   ```

4. Add **SCRIPT_ID**:
   ```
   Name: SCRIPT_ID
   Value: 1P9GQIC83pL7ajt3SSlQR1z4HQk8updVzVKihO2KSXz-mMmHm77oytQvF
   ```

#### **Step 5: Push to GitHub** (1 min)

```bash
cd "/Users/kyawlaymyint/Desktop/CoinCapTrading/Punch Card bot"

# Initialize git (if not done):
git init
git checkout -b main

# Add files:
git add .

# Commit:
git commit -m "feat: add auto-deployment to Apps Script"

# Add your remote (replace with your repo URL):
git remote add origin https://github.com/YOUR_USERNAME/Punch-Bot-JS-.git

# Push:
git push -u origin main
```

---

## 🎬 Watch It Deploy

1. **Go to GitHub Actions:**
   ```
   https://github.com/YOUR_USERNAME/Punch-Bot-JS-/actions
   ```

2. **Click on the running workflow:** "Deploy to Google Apps Script"

3. **Watch the live logs:**
   ```
   📦 Installing clasp...
   ✅ clasp installed
   🔐 Setting up credentials...
   ✅ Credentials configured
   🚀 Starting deployment...
   └─ punchbot_fastest.js
   └─ appsscript.json
   Pushed 2 files.
   ✅ Deployment complete!
   🎉 Deployment successful!
   ```

4. **Expected time:** ~30 seconds

---

## 🔄 Daily Workflow (After Setup)

### **From now on, it's just:**

```bash
# 1. Edit code:
code punchbot_fastest.js

# 2. Commit:
git add punchbot_fastest.js
git commit -m "fix: improve lock timeout"

# 3. Push:
git push

# 4. Done! ✅
# GitHub automatically deploys to Apps Script
# Your bot is live in ~30 seconds!
```

---

## 🧪 Test the Workflow

### **Test 1: Manual trigger**

```
1. Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/actions
2. Click "Deploy to Google Apps Script"
3. Click "Run workflow" → "Run workflow"
4. Watch it deploy!
```

### **Test 2: Auto-trigger on push**

```bash
# Make a small change:
echo "// Test comment" >> punchbot_fastest.js

# Commit and push:
git add punchbot_fastest.js
git commit -m "test: auto-deployment"
git push

# Watch GitHub Actions automatically run!
```

---

## 📊 What Gets Deployed

### **Files included:**
- ✅ `punchbot_fastest.js` (or `punchbot.js`)
- ✅ `appsscript.json`
- ✅ `test_concurrent_load.js` (optional)

### **Files excluded (from .claspignore):**
- ❌ All `.md` documentation files
- ❌ `.github/` directory
- ❌ `node_modules/`
- ❌ Alternative solutions (`fast_queue_solution.js`)
- ❌ Backup files

---

## 🔍 Verify Deployment

### **Check Apps Script:**

```
1. Open: https://script.google.com/
2. Open your project
3. Check file modified date/time
4. Should match your latest commit time
```

### **Check Telegram bot:**

```
Telegram:
You: wc
Bot: 🧻 Bathroom run initiated... (instant!)

Should use the latest code!
```

---

## 🐛 Troubleshooting

### **Issue: "User has not enabled the Apps Script API"**

**Solution:**
```
1. Go to: https://script.google.com/home/usersettings
2. Toggle ON: "Google Apps Script API"
3. Re-run deployment
```

---

### **Issue: "401 Unauthorized"**

**Solution:**
```bash
# Refresh login:
clasp login

# Get new credentials:
cat ~/.clasprc.json

# Update GitHub secret CLASP_TOKEN with new value
```

---

### **Issue: "clasp: command not found"**

**Solution:**
```bash
# Install clasp globally:
npm install -g @google/clasp

# Verify:
clasp --version
```

---

### **Issue: Deployment succeeds but code not updated**

**Solution:**
```bash
# Check what's being deployed:
clasp status

# Verify .claspignore isn't excluding your files:
cat .claspignore

# Test manual push:
clasp push --force
```

---

## 🔐 Security Notes

### **⚠️ NEVER commit these files:**
- `.clasprc.json` - Contains OAuth tokens
- `.clasp.json` - Contains Script ID (already in .gitignore)
- `service-account-key.json` - Service account credentials

### **✅ Already protected in .gitignore:**
```
.clasprc.json
.clasp.json
service-account-key.json
```

---

## 🎯 Complete Checklist

**Before first push:**
- [ ] clasp installed (`npm install -g @google/clasp`)
- [ ] Logged in (`clasp login`)
- [ ] Manual deployment tested (`clasp push --force`)
- [ ] GitHub secrets added (CLASP_TOKEN + SCRIPT_ID)
- [ ] .gitignore includes .clasprc.json
- [ ] Git initialized (`git init`)
- [ ] Remote added (`git remote add origin ...`)

**After first push:**
- [ ] GitHub Actions ran successfully
- [ ] Code deployed to Apps Script
- [ ] Apps Script shows updated files
- [ ] Telegram bot works with new code

---

## 📞 Need Help?

### **Check deployment logs:**
```
GitHub → Your repo → Actions → Click on workflow run → View logs
```

### **Common log messages:**

✅ **Success:**
```
✅ Deployment complete!
🎉 Deployment successful!
```

❌ **Failure:**
```
❌ Deployment failed!
Check the logs above for details.
```

---

## 🎉 Success!

After setup, your workflow is:

```
┌──────────────────────┐
│  1. git push         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  2. Wait 30 sec      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  3. Code live! ✅    │
└──────────────────────┘
```

**No manual deployment ever again!**

---

## 📚 Additional Resources

- **Full guide:** `AUTO_DEPLOYMENT_SETUP.md` (30 min read)
- **Setup script:** `setup-auto-deploy.sh` (automated setup)
- **Workflow file:** `.github/workflows/deploy.yml` (deployment config)
- **clasp docs:** https://github.com/google/clasp

---

**Ready to push?** 🚀

```bash
git push
```

---

**Setup Time:** 5 minutes  
**Daily Time:** 0 minutes (automatic)  
**Manual Deployment:** Never again! ✅
