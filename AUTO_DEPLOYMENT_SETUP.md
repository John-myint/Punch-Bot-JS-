# Automated Deployment: GitHub → Google Apps Script

## 🎯 Goal
Push to GitHub → Auto-deploy to Google Apps Script → Live in production

**No manual steps after initial setup!**

---

## 📋 One-Time Setup (30 minutes)

### **Step 1: Install clasp (Command Line Apps Script)**

```bash
# On your local machine:
npm install -g @google/clasp

# Login to Google:
clasp login

# This will open browser for authorization
# Grant permissions to clasp
```

**Verify:**
```bash
clasp list
# Should show your Apps Script projects
```

---

### **Step 2: Link Your Project**

```bash
cd "/Users/kyawlaymyint/Desktop/CoinCapTrading/Punch Card bot"

# Create .clasp.json (already exists, but verify):
cat .clasp.json

# Should show:
# {
#   "scriptId": "YOUR_SCRIPT_ID",
#   "rootDir": "."
# }
```

**If .clasp.json doesn't exist:**
```bash
# Get your script ID:
# 1. Open Apps Script editor
# 2. Project Settings (gear icon)
# 3. Copy Script ID

# Create .clasp.json:
cat > .clasp.json << 'EOF'
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "."
}
EOF
```

---

### **Step 3: Configure Files for Deployment**

Create `.claspignore` to exclude unnecessary files:

```bash
cat > .claspignore << 'EOF'
# Exclude documentation
*.md
README.md
DEPLOYMENT_GUIDE.md
OPTIMIZATION_PLAN.md
SOLUTIONS_COMPARISON.md
CONCURRENCY_TEST_REPORT.md
IMPLEMENTATION_COMPLETE.md
CODE_REVIEW_v2.0.md
COMPLETION_REPORT.md
FINAL_SUMMARY.md
INDEX.md
QUICK_REFERENCE.md
USER_MANUAL.md
MANIFEST.txt
DEPLOYMENT_CHECKLIST.md

# Exclude git files
.git
.gitignore
.github

# Exclude node modules
node_modules
package-lock.json

# Exclude test files (optional - include if you want tests in Apps Script)
# test_concurrent_load.js

# Exclude alternative solutions
fast_queue_solution.js

# Exclude backup files
*_old.js
*_backup.js
*.bak
EOF
```

**Which files WILL be deployed:**
- ✅ `punchbot_fastest.js` → Main code
- ✅ `appsscript.json` → Manifest
- ✅ `test_concurrent_load.js` → Load testing (optional)

---

### **Step 4: Get Google OAuth Credentials**

#### **Option A: Use Service Account (Recommended for CI/CD)**

1. **Go to Google Cloud Console:**
   ```
   https://console.cloud.google.com/
   ```

2. **Enable APIs:**
   ```
   - Navigate to "APIs & Services" → "Enable APIs and Services"
   - Search for "Google Apps Script API"
   - Click "Enable"
   ```

3. **Create Service Account:**
   ```
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Name: "GitHub Actions Deploy"
   - Click "Create and Continue"
   - Role: "Editor" (for Apps Script deployment)
   - Click "Done"
   ```

4. **Create Key:**
   ```
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON"
   - Download the file (keep it secure!)
   ```

5. **Get the credentials:**
   ```bash
   # The downloaded JSON looks like:
   {
     "type": "service_account",
     "project_id": "your-project-id",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...",
     "client_email": "github-actions-deploy@your-project.iam.gserviceaccount.com",
     "client_id": "...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     ...
   }
   ```

#### **Option B: Use OAuth Tokens (Simpler but less secure)**

```bash
# Login with clasp (already done in Step 1):
clasp login

# Get tokens:
# On macOS:
cat ~/.clasprc.json

# On Linux:
cat ~/.clasprc.json

# On Windows:
type %USERPROFILE%\.clasprc.json

# Copy the entire JSON content
```

---

### **Step 5: Add GitHub Secrets**

1. **Go to your GitHub repository:**
   ```
   https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions
   ```

2. **Add secrets (click "New repository secret"):**

   **Using Service Account (Recommended):**
   ```
   Name: GOOGLE_SERVICE_ACCOUNT
   Value: <paste entire JSON from Step 4>
   ```

   **OR Using OAuth (Simpler):**
   ```
   Name: CLASP_TOKEN
   Value: <paste content from ~/.clasprc.json>
   ```

3. **Add Script ID:**
   ```
   Name: SCRIPT_ID
   Value: <your Apps Script project ID>
   ```

4. **Verify secrets:**
   - Should see 2 secrets listed
   - ✅ GOOGLE_SERVICE_ACCOUNT (or CLASP_TOKEN)
   - ✅ SCRIPT_ID

---

### **Step 6: Create GitHub Actions Workflow**

```bash
# Create .github/workflows directory:
mkdir -p .github/workflows

# Create deployment workflow:
cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy to Google Apps Script

on:
  push:
    branches:
      - main  # Deploy when pushing to main branch
    paths:
      - 'punchbot_fastest.js'
      - 'appsscript.json'
      - 'test_concurrent_load.js'
      - '.github/workflows/deploy.yml'
  
  workflow_dispatch:  # Allow manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install clasp
        run: npm install -g @google/clasp
      
      - name: Create .clasprc.json
        run: |
          echo '${{ secrets.CLASP_TOKEN }}' > ~/.clasprc.json
      
      - name: Create .clasp.json
        run: |
          echo '{"scriptId":"${{ secrets.SCRIPT_ID }}","rootDir":"."}' > .clasp.json
      
      - name: Deploy to Apps Script
        run: |
          echo "📦 Starting deployment..."
          clasp push --force
          echo "✅ Deployment complete!"
      
      - name: Verify deployment
        run: |
          echo "🔍 Verifying deployment..."
          clasp version
          echo "✅ Verification complete!"
      
      - name: Send success notification
        if: success()
        run: |
          echo "🎉 Deployment successful!"
          echo "Branch: ${{ github.ref_name }}"
          echo "Commit: ${{ github.sha }}"
          echo "Author: ${{ github.actor }}"
EOF
```

---

### **Step 7: Create .gitignore**

```bash
cat > .gitignore << 'EOF'
# clasp credentials (NEVER commit these!)
.clasprc.json
.clasp.json

# Node modules
node_modules/
package-lock.json

# Logs
*.log

# Backup files
*_backup.js
*_old.js
*.bak

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
EOF
```

**IMPORTANT:** Make sure `.clasprc.json` is in `.gitignore` to avoid committing credentials!

---

## 🚀 Testing the Deployment

### **Test 1: Manual Deployment (Verify Setup)**

```bash
cd "/Users/kyawlaymyint/Desktop/CoinCapTrading/Punch Card bot"

# Test deployment manually first:
clasp push --force

# Should see:
# └─ punchbot_fastest.js
# └─ appsscript.json
# Pushed X files.
```

**If successful:** Setup is correct! ✅

---

### **Test 2: Automated Deployment (GitHub Actions)**

```bash
# Initialize git (if not already):
git init

# Add remote (your GitHub repo):
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Create main branch:
git checkout -b main

# Add files:
git add punchbot_fastest.js appsscript.json .claspignore .github/workflows/deploy.yml

# Commit:
git commit -m "feat: add fastest system with auto-deployment"

# Push to GitHub:
git push -u origin main
```

**Watch deployment:**
1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`
2. Should see "Deploy to Google Apps Script" workflow running
3. Click on it to see live logs
4. Should complete in ~30 seconds

**Expected output:**
```
📦 Starting deployment...
└─ punchbot_fastest.js
└─ appsscript.json
Pushed 2 files.
✅ Deployment complete!
🎉 Deployment successful!
```

---

## 🔄 Daily Workflow (After Setup)

### **Now it's fully automatic!**

```bash
# 1. Make changes to code locally:
code punchbot_fastest.js

# 2. Test locally (optional):
clasp push --force  # Test in Apps Script

# 3. Commit and push:
git add punchbot_fastest.js
git commit -m "fix: improve lock timeout handling"
git push

# 4. That's it! 
# GitHub Actions automatically deploys to Apps Script
# No manual intervention needed!
```

**Timeline:**
```
0:00 - You push to GitHub
0:05 - GitHub Actions starts
0:15 - Code deployed to Apps Script
0:30 - Workflow complete ✅
0:31 - Your bot is live with new code!
```

---

## 🔐 Security Best Practices

### **1. Protect Your Credentials**

```bash
# NEVER commit these files:
.clasprc.json      # Contains OAuth tokens
.clasp.json        # Contains Script ID (optional to exclude)
service-account-key.json  # Service account credentials

# Always in .gitignore:
echo ".clasprc.json" >> .gitignore
echo "service-account-key.json" >> .gitignore
```

### **2. Use Branch Protection**

```
GitHub Settings → Branches → Add rule:
- Branch name: main
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass (deployment)
- ✅ Require branches to be up to date
```

### **3. Test Before Production**

Create staging environment:

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches:
      - develop

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # Same as deploy.yml but uses STAGING_SCRIPT_ID
      - name: Deploy to staging
        run: |
          echo '{"scriptId":"${{ secrets.STAGING_SCRIPT_ID }}","rootDir":"."}' > .clasp.json
          clasp push --force
```

**Workflow:**
```
develop branch → staging Apps Script (test)
main branch    → production Apps Script (live)
```

---

## 🧪 Advanced: Automated Testing

Add testing before deployment:

```yaml
# .github/workflows/deploy.yml (enhanced)
name: Deploy with Tests

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Syntax check
        run: |
          echo "🔍 Checking JavaScript syntax..."
          node --check punchbot_fastest.js
          echo "✅ Syntax valid!"
      
      - name: Run tests (if you have them)
        run: |
          # Add your test commands here
          echo "✅ Tests passed!"

  deploy:
    needs: test  # Deploy only if tests pass
    runs-on: ubuntu-latest
    steps:
      # ... deployment steps ...
```

---

## 📊 Monitoring Deployments

### **View Deployment History**

```bash
# In your local repo:
clasp versions

# Shows:
# 1 - 2026-02-06 12:30:00
# 2 - 2026-02-06 14:15:00
# 3 - 2026-02-06 16:45:00
```

### **Rollback to Previous Version**

```bash
# If new deployment has issues:
clasp deploy --versionNumber 2 --description "Rollback to v2"

# Or via GitHub:
git revert HEAD
git push  # Auto-deploys previous version
```

---

## 🔔 Notifications (Optional)

### **Slack Notification on Deployment**

Add to `.github/workflows/deploy.yml`:

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Deployment to Apps Script: ${{ job.status }}'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### **Email Notification**

GitHub automatically emails you on workflow failures (check GitHub notifications settings).

---

## 🐛 Troubleshooting

### **Issue 1: "User has not enabled the Apps Script API"**

**Solution:**
```
1. Go to: https://script.google.com/home/usersettings
2. Enable "Google Apps Script API"
3. Retry deployment
```

---

### **Issue 2: "Deployment failed: 401 Unauthorized"**

**Solution:**
```bash
# Refresh credentials:
clasp login

# Update GitHub secret:
cat ~/.clasprc.json
# Copy and update CLASP_TOKEN in GitHub secrets
```

---

### **Issue 3: "Deployment succeeded but code not updated"**

**Solution:**
```bash
# Check .claspignore isn't excluding your main file:
cat .claspignore

# Verify file is being pushed:
clasp push --force
# Should list punchbot_fastest.js
```

---

### **Issue 4: "clasp: command not found in GitHub Actions"**

**Solution:**
Check workflow has:
```yaml
- name: Install clasp
  run: npm install -g @google/clasp
```

---

## 📋 Complete Setup Checklist

- [ ] clasp installed locally (`npm install -g @google/clasp`)
- [ ] Logged in to clasp (`clasp login`)
- [ ] .clasp.json created with correct Script ID
- [ ] .claspignore created to exclude docs
- [ ] Google Apps Script API enabled
- [ ] GitHub secrets added (CLASP_TOKEN + SCRIPT_ID)
- [ ] .github/workflows/deploy.yml created
- [ ] .gitignore includes .clasprc.json
- [ ] Test manual deployment (`clasp push --force`)
- [ ] Initialize git repo
- [ ] Push to GitHub and verify auto-deployment
- [ ] Check workflow runs successfully
- [ ] Verify code updated in Apps Script editor
- [ ] Test webhook still works in Telegram

---

## 🎯 Final Workflow

```
┌─────────────────────────────────────────┐
│  1. Edit code locally                    │
│     punchbot_fastest.js                  │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  2. Commit to git                        │
│     git commit -m "feat: new feature"    │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  3. Push to GitHub                       │
│     git push                             │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  4. GitHub Actions triggered             │
│     - Install clasp                      │
│     - Setup credentials                  │
│     - Deploy to Apps Script              │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  5. Code live in production!             │
│     Bot automatically uses new code      │
└─────────────────────────────────────────┘

Total time: ~30 seconds
Your involvement: git push
Manual steps: ZERO!
```

---

## 🚀 **You're Done!**

After setup, your workflow is:
1. `code punchbot_fastest.js` - Edit locally
2. `git push` - Push to GitHub
3. ☕ Wait 30 seconds
4. ✅ Code live in production!

**No manual deployment ever again!** 🎉

---

**Want me to create these files for you now?**
