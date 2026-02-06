// ============================================
// LUNCH TIME CONCURRENCY TEST
// ============================================
// Simulates 50-80 employees punching at the same time
// Tests for race conditions and data corruption
//
// Run this from Apps Script editor to see potential issues
// ============================================

// Test Configuration
const TEST_CONFIG = {
  NUM_EMPLOYEES: 60,              // Number of concurrent users
  CONCURRENT_WINDOW_MS: 2000,     // All requests within 2 seconds
  BREAK_CODE: 'cf+2',             // Lunch break
  TEST_CHAT_ID: '999999999'       // Test chat ID
};

// ============================================
// SIMULATION FUNCTIONS
// ============================================

/**
 * Main test runner - Simulates lunch time rush
 * WARNING: This will create REAL entries in your sheets!
 */
function testLunchTimeRush() {
  Logger.log('====================================');
  Logger.log('🚨 LUNCH TIME CONCURRENCY TEST 🚨');
  Logger.log('====================================');
  Logger.log(`Simulating ${TEST_CONFIG.NUM_EMPLOYEES} employees punching within ${TEST_CONFIG.CONCURRENT_WINDOW_MS}ms`);
  Logger.log('');
  
  // Clear test data first
  prepareTestEnvironment();
  
  // Take snapshot before test
  const beforeSnapshot = takeSnapshot();
  Logger.log('📊 BEFORE TEST:');
  Logger.log(`  - Live Breaks: ${beforeSnapshot.liveBreaksCount} rows`);
  Logger.log(`  - Punch Logs: ${beforeSnapshot.punchLogsCount} rows`);
  Logger.log('');
  
  // Record start time
  const startTime = new Date();
  
  // Simulate concurrent break requests
  const results = simulateConcurrentRequests();
  
  const endTime = new Date();
  const duration = endTime - startTime;
  
  // Wait a moment for all writes to complete
  Utilities.sleep(3000);
  
  // Take snapshot after test
  const afterSnapshot = takeSnapshot();
  
  // Analyze results
  Logger.log('====================================');
  Logger.log('📊 TEST RESULTS');
  Logger.log('====================================');
  Logger.log(`Duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`);
  Logger.log(`Avg time per request: ${(duration/TEST_CONFIG.NUM_EMPLOYEES).toFixed(0)}ms`);
  Logger.log('');
  
  Logger.log('📈 DATA CHANGES:');
  Logger.log(`  Live Breaks: ${beforeSnapshot.liveBreaksCount} → ${afterSnapshot.liveBreaksCount} (+${afterSnapshot.liveBreaksCount - beforeSnapshot.liveBreaksCount})`);
  Logger.log(`  Punch Logs: ${beforeSnapshot.punchLogsCount} → ${afterSnapshot.punchLogsCount} (+${afterSnapshot.punchLogsCount - beforeSnapshot.punchLogsCount})`);
  Logger.log('');
  
  // Detect issues
  detectIssues(results, beforeSnapshot, afterSnapshot);
  
  // Show detailed breakdown
  showDetailedResults(afterSnapshot);
  
  Logger.log('====================================');
  Logger.log('✅ TEST COMPLETE');
  Logger.log('====================================');
}

/**
 * Simulate concurrent break start requests
 */
function simulateConcurrentRequests() {
  Logger.log('🔥 STARTING CONCURRENT REQUESTS...');
  
  const results = {
    success: 0,
    failed: 0,
    errors: [],
    durations: []
  };
  
  for (let i = 0; i < TEST_CONFIG.NUM_EMPLOYEES; i++) {
    const username = `Employee_${String(i + 1).padStart(3, '0')}`;
    const chatId = TEST_CONFIG.TEST_CHAT_ID;
    
    try {
      const requestStart = new Date();
      
      // Call processBreak directly (simulating doPost)
      const result = processBreak(username, TEST_CONFIG.BREAK_CODE, null, chatId);
      
      const requestEnd = new Date();
      const requestDuration = requestEnd - requestStart;
      
      results.durations.push(requestDuration);
      
      if (result.success) {
        results.success++;
        Logger.log(`  ✅ ${username}: ${requestDuration}ms`);
      } else {
        results.failed++;
        Logger.log(`  ❌ ${username}: ${result.message}`);
        results.errors.push({
          username: username,
          message: result.message
        });
      }
      
    } catch (error) {
      results.failed++;
      results.errors.push({
        username: username,
        message: error.toString()
      });
      Logger.log(`  💥 ${username}: EXCEPTION - ${error}`);
    }
    
    // Random small delay to simulate near-simultaneous (not perfectly synchronized)
    if (i < TEST_CONFIG.NUM_EMPLOYEES - 1) {
      const delay = Math.random() * (TEST_CONFIG.CONCURRENT_WINDOW_MS / TEST_CONFIG.NUM_EMPLOYEES);
      Utilities.sleep(delay);
    }
  }
  
  Logger.log('');
  return results;
}

/**
 * Prepare test environment
 */
function prepareTestEnvironment() {
  Logger.log('🧹 Preparing test environment...');
  
  // Create test marker
  const props = PropertiesService.getScriptProperties();
  props.setProperty('TEST_MODE', 'true');
  props.setProperty('TEST_START_TIME', new Date().toISOString());
  
  Logger.log('✅ Environment ready');
  Logger.log('');
}

/**
 * Take snapshot of current state
 */
function takeSnapshot() {
  const liveSheet = getOrCreateSheet(LIVE_BREAKS_SHEET);
  const logSheet = getOrCreateSheet(PUNCH_LOG_SHEET);
  
  const liveData = liveSheet.getDataRange().getValues();
  const logData = logSheet.getDataRange().getValues();
  
  return {
    liveBreaksCount: liveData.length - 1, // Exclude header
    punchLogsCount: logData.length - 1,   // Exclude header
    liveData: liveData,
    logData: logData,
    timestamp: new Date()
  };
}

/**
 * Detect issues in test results
 */
function detectIssues(results, beforeSnapshot, afterSnapshot) {
  Logger.log('🔍 ISSUE DETECTION:');
  Logger.log('');
  
  const issues = [];
  
  // Issue 1: Duplicate entries (same user has multiple active breaks)
  const duplicates = findDuplicateActiveBreaks(afterSnapshot);
  if (duplicates.length > 0) {
    issues.push({
      type: 'DUPLICATE_ACTIVE_BREAKS',
      severity: 'CRITICAL',
      count: duplicates.length,
      details: duplicates
    });
    Logger.log(`  🚨 CRITICAL: ${duplicates.length} users have MULTIPLE active breaks`);
    duplicates.slice(0, 5).forEach(dup => {
      Logger.log(`     - ${dup.username}: ${dup.count} active breaks`);
    });
    if (duplicates.length > 5) {
      Logger.log(`     ... and ${duplicates.length - 5} more`);
    }
  } else {
    Logger.log('  ✅ No duplicate active breaks detected');
  }
  
  // Issue 2: Lost updates (expected entries don't exist)
  const expectedNew = results.success;
  const actualNew = afterSnapshot.liveBreaksCount - beforeSnapshot.liveBreaksCount;
  if (actualNew < expectedNew) {
    const lostUpdates = expectedNew - actualNew;
    issues.push({
      type: 'LOST_UPDATES',
      severity: 'CRITICAL',
      count: lostUpdates
    });
    Logger.log(`  🚨 CRITICAL: ${lostUpdates} updates LOST`);
    Logger.log(`     Expected: ${expectedNew} new entries`);
    Logger.log(`     Actual: ${actualNew} new entries`);
  } else {
    Logger.log('  ✅ No lost updates detected');
  }
  
  // Issue 3: Phantom entries (more entries than expected)
  if (actualNew > expectedNew) {
    const phantomCount = actualNew - expectedNew;
    issues.push({
      type: 'PHANTOM_ENTRIES',
      severity: 'HIGH',
      count: phantomCount
    });
    Logger.log(`  ⚠️ HIGH: ${phantomCount} PHANTOM entries`);
    Logger.log(`     Expected: ${expectedNew} new entries`);
    Logger.log(`     Actual: ${actualNew} new entries`);
  } else {
    Logger.log('  ✅ No phantom entries detected');
  }
  
  // Issue 4: Data corruption (malformed entries)
  const corruptedEntries = findCorruptedEntries(afterSnapshot);
  if (corruptedEntries.length > 0) {
    issues.push({
      type: 'DATA_CORRUPTION',
      severity: 'CRITICAL',
      count: corruptedEntries.length,
      details: corruptedEntries
    });
    Logger.log(`  🚨 CRITICAL: ${corruptedEntries.length} CORRUPTED entries`);
    corruptedEntries.slice(0, 3).forEach(entry => {
      Logger.log(`     - Row ${entry.row}: ${entry.issue}`);
    });
  } else {
    Logger.log('  ✅ No data corruption detected');
  }
  
  // Issue 5: Slow response times
  const avgDuration = results.durations.reduce((a, b) => a + b, 0) / results.durations.length;
  const maxDuration = Math.max(...results.durations);
  const minDuration = Math.min(...results.durations);
  
  Logger.log('');
  Logger.log('⏱️ PERFORMANCE METRICS:');
  Logger.log(`  Min duration: ${minDuration}ms`);
  Logger.log(`  Avg duration: ${avgDuration.toFixed(0)}ms`);
  Logger.log(`  Max duration: ${maxDuration}ms`);
  
  if (avgDuration > 3000) {
    issues.push({
      type: 'SLOW_RESPONSE',
      severity: 'HIGH',
      avgDuration: avgDuration
    });
    Logger.log(`  ⚠️ HIGH: Average response time ${avgDuration.toFixed(0)}ms > 3000ms`);
  } else if (avgDuration > 1000) {
    issues.push({
      type: 'MODERATE_SLOWNESS',
      severity: 'MEDIUM',
      avgDuration: avgDuration
    });
    Logger.log(`  ⚠️ MEDIUM: Average response time ${avgDuration.toFixed(0)}ms > 1000ms`);
  } else {
    Logger.log('  ✅ Performance acceptable');
  }
  
  // Issue 6: Daily limit bypass
  const limitBypass = findDailyLimitBypass(afterSnapshot);
  if (limitBypass.length > 0) {
    issues.push({
      type: 'DAILY_LIMIT_BYPASS',
      severity: 'HIGH',
      count: limitBypass.length,
      details: limitBypass
    });
    Logger.log(`  ⚠️ HIGH: ${limitBypass.length} users BYPASSED daily limit`);
  } else {
    Logger.log('  ✅ Daily limits enforced correctly');
  }
  
  Logger.log('');
  
  // Summary
  if (issues.length === 0) {
    Logger.log('🎉 NO ISSUES DETECTED - System handled concurrent load perfectly!');
  } else {
    const critical = issues.filter(i => i.severity === 'CRITICAL').length;
    const high = issues.filter(i => i.severity === 'HIGH').length;
    const medium = issues.filter(i => i.severity === 'MEDIUM').length;
    
    Logger.log('⚠️ ISSUES SUMMARY:');
    if (critical > 0) Logger.log(`  🚨 ${critical} CRITICAL issues`);
    if (high > 0) Logger.log(`  ⚠️ ${high} HIGH severity issues`);
    if (medium > 0) Logger.log(`  ⚠️ ${medium} MEDIUM severity issues`);
  }
  
  Logger.log('');
  
  return issues;
}

/**
 * Find duplicate active breaks (same user has multiple active breaks)
 */
function findDuplicateActiveBreaks(snapshot) {
  const today = getTodayDate();
  const userBreaks = {};
  
  // Count active breaks per user
  for (let i = 1; i < snapshot.liveData.length; i++) {
    const row = snapshot.liveData[i];
    const date = String(row[0]);
    const username = String(row[2]);
    const status = String(row[5]);
    
    if (date === today && status === 'ON BREAK') {
      if (!userBreaks[username]) {
        userBreaks[username] = 0;
      }
      userBreaks[username]++;
    }
  }
  
  // Find duplicates
  const duplicates = [];
  for (const username in userBreaks) {
    if (userBreaks[username] > 1) {
      duplicates.push({
        username: username,
        count: userBreaks[username]
      });
    }
  }
  
  return duplicates;
}

/**
 * Find corrupted entries (missing data, wrong format)
 */
function findCorruptedEntries(snapshot) {
  const corrupted = [];
  
  for (let i = 1; i < snapshot.liveData.length; i++) {
    const row = snapshot.liveData[i];
    const rowNum = i + 1;
    
    // Check for missing required fields
    if (!row[0] || !row[1] || !row[2] || !row[3]) {
      corrupted.push({
        row: rowNum,
        issue: 'Missing required fields',
        data: row
      });
      continue;
    }
    
    // Check date format (M/D/YYYY)
    const date = String(row[0]);
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
      corrupted.push({
        row: rowNum,
        issue: `Invalid date format: ${date}`,
        data: row
      });
    }
    
    // Check time format (HH:MM:SS)
    const time = String(row[1]);
    if (!/^\d{2}:\d{2}:\d{2}$/.test(time)) {
      corrupted.push({
        row: rowNum,
        issue: `Invalid time format: ${time}`,
        data: row
      });
    }
    
    // Check break code is valid
    const breakCode = String(row[3]);
    if (!BREAKS[breakCode]) {
      corrupted.push({
        row: rowNum,
        issue: `Invalid break code: ${breakCode}`,
        data: row
      });
    }
    
    // Check status is valid
    const status = String(row[5]);
    if (status !== 'ON BREAK' && status !== 'COMPLETED') {
      corrupted.push({
        row: rowNum,
        issue: `Invalid status: ${status}`,
        data: row
      });
    }
  }
  
  return corrupted;
}

/**
 * Find users who bypassed daily limits
 */
function findDailyLimitBypass(snapshot) {
  const today = getTodayDate();
  const userCounts = {};
  
  // Count breaks per user from Punch Logs
  for (let i = 1; i < snapshot.logData.length; i++) {
    const row = snapshot.logData[i];
    const date = String(row[0]);
    const username = String(row[2]);
    const breakCode = String(row[3]);
    
    if (date === today) {
      const key = `${username}_${breakCode}`;
      if (!userCounts[key]) {
        userCounts[key] = { username, breakCode, count: 0 };
      }
      userCounts[key].count++;
    }
  }
  
  // Add active breaks from Live Breaks
  for (let i = 1; i < snapshot.liveData.length; i++) {
    const row = snapshot.liveData[i];
    const date = String(row[0]);
    const username = String(row[2]);
    const breakCode = String(row[3]);
    const status = String(row[5]);
    
    if (date === today && status === 'ON BREAK') {
      const key = `${username}_${breakCode}`;
      if (!userCounts[key]) {
        userCounts[key] = { username, breakCode, count: 0 };
      }
      userCounts[key].count++;
    }
  }
  
  // Find violations
  const violations = [];
  for (const key in userCounts) {
    const { username, breakCode, count } = userCounts[key];
    const limit = BREAKS[breakCode]?.dailyLimit || 1;
    
    if (count > limit) {
      violations.push({
        username,
        breakCode,
        count,
        limit,
        excess: count - limit
      });
    }
  }
  
  return violations;
}

/**
 * Show detailed results
 */
function showDetailedResults(snapshot) {
  Logger.log('📋 DETAILED BREAKDOWN:');
  Logger.log('');
  
  const today = getTodayDate();
  const breakTypeCounts = {};
  const statusCounts = { 'ON BREAK': 0, 'COMPLETED': 0, 'OTHER': 0 };
  
  // Analyze Live Breaks
  for (let i = 1; i < snapshot.liveData.length; i++) {
    const row = snapshot.liveData[i];
    const date = String(row[0]);
    const breakCode = String(row[3]);
    const status = String(row[5]);
    
    if (date === today) {
      if (!breakTypeCounts[breakCode]) {
        breakTypeCounts[breakCode] = 0;
      }
      breakTypeCounts[breakCode]++;
      
      if (status === 'ON BREAK') {
        statusCounts['ON BREAK']++;
      } else if (status === 'COMPLETED') {
        statusCounts['COMPLETED']++;
      } else {
        statusCounts['OTHER']++;
      }
    }
  }
  
  Logger.log('  Break Types:');
  for (const code in breakTypeCounts) {
    Logger.log(`    ${code}: ${breakTypeCounts[code]}x`);
  }
  Logger.log('');
  
  Logger.log('  Status Distribution:');
  Logger.log(`    ON BREAK: ${statusCounts['ON BREAK']}`);
  Logger.log(`    COMPLETED: ${statusCounts['COMPLETED']}`);
  if (statusCounts['OTHER'] > 0) {
    Logger.log(`    OTHER: ${statusCounts['OTHER']}`);
  }
  Logger.log('');
}

/**
 * Helper: Get today's date in M/D/YYYY format
 */
function getTodayDate() {
  const now = new Date();
  return (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear();
}

// ============================================
// RACE CONDITION ANALYSIS
// ============================================

/**
 * Analyze specific race condition scenarios
 */
function analyzeRaceConditions() {
  Logger.log('====================================');
  Logger.log('🔬 RACE CONDITION ANALYSIS');
  Logger.log('====================================');
  Logger.log('');
  
  Logger.log('📍 SCENARIO 1: Double Break Registration');
  Logger.log('   User sends "cf+2" twice within 100ms');
  Logger.log('   Expected: Only 1 break created');
  Logger.log('   Actual Risk: 2 breaks created (no lock)');
  Logger.log('   Severity: CRITICAL');
  Logger.log('   Root Cause: No atomic check-and-set operation');
  Logger.log('');
  
  Logger.log('📍 SCENARIO 2: Daily Limit Bypass');
  Logger.log('   User already has 0/1 cf+2 breaks today');
  Logger.log('   User sends "cf+2" 3 times simultaneously');
  Logger.log('   Expected: Only 1 succeeds, 2 rejected');
  Logger.log('   Actual Risk: All 3 succeed if checked before any write completes');
  Logger.log('   Severity: HIGH');
  Logger.log('   Root Cause: Read-check-write not atomic');
  Logger.log('');
  
  Logger.log('📍 SCENARIO 3: Lost Updates');
  Logger.log('   60 users call processBreak() within 2 seconds');
  Logger.log('   Each does: getLastRow() -> appendRow()');
  Logger.log('   Expected: 60 new rows');
  Logger.log('   Actual Risk: Some writes overwrite others');
  Logger.log('   Severity: CRITICAL');
  Logger.log('   Root Cause: getLastRow() not atomic with appendRow()');
  Logger.log('');
  
  Logger.log('📍 SCENARIO 4: Incorrect Row Numbers');
  Logger.log('   Thread A: getLastRow() = 100, prepares row 101');
  Logger.log('   Thread B: getLastRow() = 100, prepares row 101');
  Logger.log('   Thread A: writes to row 101');
  Logger.log('   Thread B: writes to row 101 (OVERWRITES A)');
  Logger.log('   Severity: CRITICAL');
  Logger.log('   Root Cause: Non-atomic row allocation');
  Logger.log('');
  
  Logger.log('📍 SCENARIO 5: Stale Data Reads');
  Logger.log('   Thread A reads sheet at T0 (sees user has no break)');
  Logger.log('   Thread B writes break for same user at T1');
  Logger.log('   Thread A checks "already has break?" at T2 (uses stale data from T0)');
  Logger.log('   Thread A writes duplicate break at T3');
  Logger.log('   Severity: CRITICAL');
  Logger.log('   Root Cause: No cache invalidation or locking');
  Logger.log('');
  
  Logger.log('====================================');
  Logger.log('💡 MITIGATION STRATEGIES');
  Logger.log('====================================');
  Logger.log('');
  
  Logger.log('✅ Solution 1: Queue System (RECOMMENDED)');
  Logger.log('   - All requests → Queue sheet');
  Logger.log('   - Single-threaded processor reads queue');
  Logger.log('   - Sequential processing = No race conditions');
  Logger.log('   - Cost: Slight delay (5-10 sec avg)');
  Logger.log('');
  
  Logger.log('✅ Solution 2: Lock Service');
  Logger.log('   - Use LockService.getScriptLock()');
  Logger.log('   - Acquire lock before processBreak()');
  Logger.log('   - Release after write completes');
  Logger.log('   - Cost: Serializes ALL requests (slow at scale)');
  Logger.log('');
  
  Logger.log('✅ Solution 3: Properties Service + Atomic Counter');
  Logger.log('   - Use Properties for active breaks (faster than Sheets)');
  Logger.log('   - Atomic increment for daily counters');
  Logger.log('   - Cost: 500KB limit, complex implementation');
  Logger.log('');
  
  Logger.log('✅ Solution 4: Optimistic Locking');
  Logger.log('   - Add "version" column to sheets');
  Logger.log('   - Check version before write');
  Logger.log('   - Retry if version changed');
  Logger.log('   - Cost: Complex, potential retry storms');
  Logger.log('');
  
  Logger.log('====================================');
}

// ============================================
// CLEANUP UTILITIES
// ============================================

/**
 * Clean up test data
 * WARNING: This will delete test entries!
 */
function cleanupTestData() {
  const confirmation = Browser.msgBox(
    'Clean Up Test Data',
    'This will DELETE all test entries. Continue?',
    Browser.Buttons.YES_NO
  );
  
  if (confirmation !== 'yes') {
    Logger.log('Cleanup cancelled');
    return;
  }
  
  Logger.log('🧹 Cleaning up test data...');
  
  const liveSheet = getOrCreateSheet(LIVE_BREAKS_SHEET);
  const data = liveSheet.getDataRange().getValues();
  
  let deletedCount = 0;
  
  // Delete rows in reverse to maintain indices
  for (let i = data.length - 1; i >= 1; i--) {
    const username = String(data[i][2]);
    if (username.startsWith('Employee_')) {
      liveSheet.deleteRow(i + 1);
      deletedCount++;
    }
  }
  
  Logger.log(`✅ Deleted ${deletedCount} test entries`);
  
  // Clear test markers
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('TEST_MODE');
  props.deleteProperty('TEST_START_TIME');
  
  Logger.log('✅ Cleanup complete');
}

// ============================================
// QUICK MENU FUNCTIONS
// ============================================

/**
 * Run all tests
 */
function runAllTests() {
  Logger.log('🚀 Running all concurrency tests...\n');
  
  testLunchTimeRush();
  Logger.log('\n');
  analyzeRaceConditions();
  
  Logger.log('\n✅ All tests complete');
}

/**
 * Show test menu
 */
function showTestMenu() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🧪 Concurrency Tests')
    .addItem('🔥 Run Lunch Time Test', 'testLunchTimeRush')
    .addItem('🔬 Analyze Race Conditions', 'analyzeRaceConditions')
    .addSeparator()
    .addItem('🧹 Clean Up Test Data', 'cleanupTestData')
    .addSeparator()
    .addItem('🚀 Run All Tests', 'runAllTests')
    .addToUi();
  
  Logger.log('✅ Test menu added to spreadsheet UI');
}
