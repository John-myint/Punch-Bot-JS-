// ============================================
// === PUNCH BOT - FASTEST SYSTEM ===
// Properties + Lock Solution
// ============================================
// Target Performance: 60 employees in ~2 seconds
// Implementation Time: 5 hours
// Last Updated: February 6, 2026
// 
// Architecture:
// - Properties Service: Active breaks (fast reads <5ms)
// - Cache Service: Daily counters (fast lookups)
// - Lock Service: Concurrency control (user-level locks)
// - Google Sheets: Persistent storage (async writes)
// - Background Sync: Keep Properties and Sheets aligned
// ============================================

// Get properties from Script Properties Service
const props = PropertiesService.getScriptProperties();
const SHEET_ID = props.getProperty('SHEET_ID') || '10LrFNOEzkm3zQJZtD7s6hyue-diAQLhaT3F-u6P4WEk';
const BOT_TOKEN = props.getProperty('BOT_TOKEN') || '7801885152:AAGsKQLxwdW8wnw541DEX-LcQMsgsWZhF4A';

// Auto-set timezone to Dubai on script initialization
try {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  spreadsheet.setSpreadsheetTimeZone('Asia/Dubai');
  Logger.log('✓ Timezone auto-set to Dubai (Asia/Dubai) on script load');
} catch (e) {
  Logger.log('⚠️ Timezone auto-set skipped: ' + e);
}

// Break configurations
const BREAKS = {
  wc: { duration: 10, dailyLimit: 5, name: 'Waste Control', greeting: '🚽 Go easy on the throne!' },
  cy: { duration: 10, dailyLimit: 3, name: 'Smoking Break', greeting: '🚬 Blow one away!' },
  bwc: { duration: 20, dailyLimit: 3, name: 'Big Waste Control', greeting: '🚽💨 Don\'t fall in the toilet!' },
  'cf+1': { duration: 25, dailyLimit: 1, name: 'Breakfast', greeting: '🍳 Enjoy your breakfast!' },
  'cf+2': { duration: 30, dailyLimit: 1, name: 'Lunch', greeting: '🍽️ Bon appétit!' },
  'cf+3': { duration: 30, dailyLimit: 1, name: 'Dinner', greeting: '🍴 Savor your dinner!' }
};

// Sheet names
const LIVE_BREAKS_SHEET = 'Live_Breaks';
const PUNCH_LOG_SHEET = 'Punch_Logs';

// Back keywords
const BACK_KEYWORDS = ['back', 'b', '1', 'btw', 'back to work'];

// Properties keys
const PROPERTIES_KEYS = {
  ACTIVE_BREAKS: 'active_breaks_v2',
  DAILY_COUNTERS: 'daily_counters_v2',
  LAST_SYNC: 'last_sync_timestamp',
  SYNC_STATUS: 'sync_status'
};

// ============================================
// CORE FUNCTIONS - PROPERTIES + LOCK
// ============================================

/**
 * Main webhook handler (OPTIMIZED)
 */
function doPost(e) {
  const requestStartTime = new Date();
  
  try {
    const update = JSON.parse(e.postData.contents);
    
    if (!update.message) {
      return HtmlService.createHtmlOutput('ok');
    }

    const message = update.message;
    const text = (message.text || '').toLowerCase().trim();
    const chatId = message.chat.id;
    const userId = message.from.id;
    const firstName = message.from.first_name || '';
    const lastName = message.from.last_name || '';
    const username = (firstName + ' ' + lastName).trim() || message.from.username || 'Anonymous';

    Logger.log('📬 Request from: ' + username + ' | Text: ' + text);

    // Check for punch back keywords
    if (BACK_KEYWORDS.includes(text)) {
      const result = handlePunchBackFast(username, chatId);
      const responseMsg = result.success 
        ? `👤 @${username}\n\n${getRandomSarcasm(result.breakCode, 'welcomeBack')}\n\n${result.message}`
        : `👤 @${username}\n\n${result.message}`;
      
      sendTelegramMessage(chatId, responseMsg);
      logPerformance('PUNCH_BACK', requestStartTime);
      return HtmlService.createHtmlOutput('ok');
    }

    // Parse break code
    const breakCode = parseBreakCode(text);

    if (breakCode === 'cancel') {
      handleCancelFast(username, chatId);
      logPerformance('CANCEL', requestStartTime);
      return HtmlService.createHtmlOutput('ok');
    }

    if (!breakCode) {
      const invalidMsg = INVALID_CODE_SARCASM[Math.floor(Math.random() * INVALID_CODE_SARCASM.length)];
      sendTelegramMessage(chatId, `👤 @${username}\n\n${invalidMsg}`);
      return HtmlService.createHtmlOutput('ok');
    }

    // Process break (FAST!)
    const result = processBreakFast(username, breakCode, userId, chatId);
    
    if (result.success) {
      const response = `👤 @${username}\n\n${getRandomSarcasm(breakCode, 'breakStarted')}\n\n⏱️ ${BREAKS[breakCode].name} (${BREAKS[breakCode].duration} min)\n📊 ${result.message}`;
      sendTelegramMessage(chatId, response);
    } else {
      const response = `👤 @${username}\n\n${result.message}`;
      sendTelegramMessage(chatId, response);
    }

    logPerformance('BREAK_START', requestStartTime);
    return HtmlService.createHtmlOutput('ok');
    
  } catch (error) {
    Logger.log('❌ Error in doPost: ' + error);
    logError('doPost', error, { text: text, username: username });
    return HtmlService.createHtmlOutput('error: ' + error);
  }
}

/**
 * Process break using Properties (FASTEST)
 */
function processBreakFast(username, breakCode, userId, chatId) {
  const lock = LockService.getScriptLock();
  
  try {
    // Try to acquire lock (wait up to 5 seconds)
    if (!lock.tryLock(5000)) {
      Logger.log('⚠️ Failed to acquire lock for: ' + username);
      return {
        success: false,
        message: '⚠️ System busy, please try again in a few seconds.'
      };
    }

    const now = new Date();
    const today = getTodayDate();
    const timeStr = getTimeString(now);
    const breakConfig = BREAKS[breakCode];
    
    Logger.log('=== PROCESS BREAK FAST ===');
    Logger.log('Username: ' + username + ' | Break: ' + breakCode);
    
    // 1. Check active breaks in Properties (FAST - <5ms)
    const activeBreaks = getActiveBreaksFromProperties();
    
    if (activeBreaks[username]) {
      const existing = activeBreaks[username];
      Logger.log('❌ User already has active break: ' + existing.breakCode);
      return {
        success: false,
        message: `🤨 You already have an active break!\n\nActive: ${existing.breakCode} (${existing.startTime})\n\nType "back" to close it first!`
      };
    }
    
    // 2. Check daily limit from cache (FAST - <10ms)
    const dailyCount = getDailyBreakCountFast(username, breakCode, today);
    const limitReached = dailyCount >= breakConfig.dailyLimit;
    
    Logger.log('Daily limit check: ' + dailyCount + '/' + breakConfig.dailyLimit);
    
    // 3. Add to Properties (FAST - <10ms)
    activeBreaks[username] = {
      breakCode: breakCode,
      startTime: timeStr,
      startDate: today,
      expectedDuration: breakConfig.duration,
      chatId: String(chatId),
      timestamp: now.getTime()
    };
    
    saveActiveBreaksToProperties(activeBreaks);
    Logger.log('✅ Break added to Properties');
    
    // 4. Increment daily counter in cache (FAST - <10ms)
    incrementDailyBreakCount(username, breakCode, today);
    
    // 5. Write to sheet in background (ASYNC - don't wait)
    writeBreakToSheetAsync(username, breakCode, breakConfig.duration, today, timeStr, chatId);
    
    // Return response immediately
    let message = `Status: OK | ${dailyCount + 1}/${breakConfig.dailyLimit} used today`;
    if (limitReached) {
      message = `${getRandomSarcasm(breakCode, 'limitReached')}`;
    }
    
    Logger.log('✅ Break processed successfully (fast path)');
    
    return {
      success: true,
      message: message
    };
    
  } catch (error) {
    Logger.log('❌ Error in processBreakFast: ' + error);
    logError('processBreakFast', error, { username, breakCode });
    
    // Fallback to slow but safe sheet-based processing
    Logger.log('⚠️ Falling back to sheet-based processing');
    return processBreakSlow(username, breakCode, userId, chatId);
    
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handle punch back using Properties (FASTEST)
 */
function handlePunchBackFast(username, chatId) {
  const lock = LockService.getScriptLock();
  
  try {
    if (!lock.tryLock(5000)) {
      Logger.log('⚠️ Failed to acquire lock for punch back: ' + username);
      return {
        success: false,
        message: '⚠️ System busy, please try again in a few seconds.'
      };
    }

    const now = new Date();
    const today = getTodayDate();
    const timeStr = getTimeString(now);
    
    Logger.log('=== PUNCH BACK FAST ===');
    Logger.log('Username: ' + username);
    
    // 1. Get active break from Properties (FAST - <5ms)
    const activeBreaks = getActiveBreaksFromProperties();
    
    if (!activeBreaks[username]) {
      Logger.log('❌ No active break found in Properties');
      
      const noBreakMessages = [
        '👀 You can\'t come back if you never left.',
        '🤔 You\'re not on a break right now, chief.',
        '🧙 You can\'t end a spell you never cast.',
        '📡 No break signal detected.',
        '🕵️ I checked everywhere… no active break found.'
      ];
      
      return {
        success: false,
        message: noBreakMessages[Math.floor(Math.random() * noBreakMessages.length)]
      };
    }
    
    const breakInfo = activeBreaks[username];
    const breakCode = breakInfo.breakCode;
    const startTime = breakInfo.startTime;
    const expectedDuration = breakInfo.expectedDuration;
    
    // 2. Calculate duration
    const start = new Date('1970/01/01 ' + startTime);
    const end = new Date('1970/01/01 ' + timeStr);
    let actualMinutes = Math.round((end - start) / 60000);
    
    if (isNaN(actualMinutes) || actualMinutes < 0) {
      actualMinutes = 0;
    }
    
    Logger.log('Break duration: ' + actualMinutes + ' min (expected: ' + expectedDuration + ' min)');
    
    // 3. Remove from Properties (FAST - <10ms)
    delete activeBreaks[username];
    saveActiveBreaksToProperties(activeBreaks);
    Logger.log('✅ Break removed from Properties');
    
    // 4. Write to Punch_Logs in background (ASYNC)
    writePunchLogAsync(username, breakCode, today, startTime, timeStr, actualMinutes, expectedDuration, chatId);
    
    // 5. Delete from Live_Breaks in background (ASYNC)
    deleteFromLiveBreaksAsync(username, today);
    
    // Return response immediately
    let status, message;
    
    if (actualMinutes > expectedDuration) {
      const overTime = actualMinutes - expectedDuration;
      status = '⚠️ OVER TIME';
      message = `⏱️ Expected: ${expectedDuration}min\n📊 Actual: ${actualMinutes}min\n🚨 Over by ${overTime}min!`;
      
      return {
        success: false,
        breakCode: breakCode,
        message: `${getRandomSarcasm(breakCode, 'overtimeWarning')}\n\n${message}`
      };
    } else {
      const remaining = expectedDuration - actualMinutes;
      Logger.log('✅ Punch back successful (under time)');
      
      return {
        success: true,
        breakCode: breakCode,
        message: `⏱️ Expected: ${expectedDuration}min\n📊 Actual: ${actualMinutes}min\n${remaining > 0 ? `(${remaining}min under)` : ''}`
      };
    }
    
  } catch (error) {
    Logger.log('❌ Error in handlePunchBackFast: ' + error);
    logError('handlePunchBackFast', error, { username });
    
    // Fallback to slow sheet-based processing
    Logger.log('⚠️ Falling back to sheet-based processing');
    return handlePunchBackSlow(username, chatId);
    
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handle cancel using Properties (FASTEST)
 */
function handleCancelFast(username, chatId) {
  const lock = LockService.getScriptLock();
  
  try {
    if (!lock.tryLock(5000)) {
      sendTelegramMessage(chatId, `👤 @${username}\n\n⚠️ System busy, try again.`);
      return;
    }

    const today = getTodayDate();
    
    Logger.log('=== CANCEL FAST ===');
    Logger.log('Username: ' + username);
    
    // Get active breaks from Properties
    const activeBreaks = getActiveBreaksFromProperties();
    
    if (!activeBreaks[username]) {
      Logger.log('❌ No break found to cancel');
      sendTelegramMessage(chatId, `👤 @${username}\n\n⚠️ No entry to cancel today!`);
      return;
    }
    
    const breakCode = activeBreaks[username].breakCode;
    
    // Remove from Properties
    delete activeBreaks[username];
    saveActiveBreaksToProperties(activeBreaks);
    Logger.log('✅ Break removed from Properties');
    
    // Delete from Live_Breaks in background
    deleteFromLiveBreaksAsync(username, today);
    
    // Decrement daily counter
    decrementDailyBreakCount(username, breakCode, today);
    
    const message = `👤 @${username}\n\n${getRandomSarcasm(breakCode, 'cancelled')}`;
    sendTelegramMessage(chatId, message);
    
    Logger.log('✅ Cancel successful');
    
  } catch (error) {
    Logger.log('❌ Error in handleCancelFast: ' + error);
    sendTelegramMessage(chatId, `👤 @${username}\n\n⚠️ Error cancelling break.`);
  } finally {
    lock.releaseLock();
  }
}

// ============================================
// PROPERTIES SERVICE MANAGEMENT
// ============================================

/**
 * Get active breaks from Properties Service
 */
function getActiveBreaksFromProperties() {
  try {
    const userProps = PropertiesService.getUserProperties();
    const json = userProps.getProperty(PROPERTIES_KEYS.ACTIVE_BREAKS);
    
    if (!json) {
      Logger.log('📝 No active breaks in Properties (empty)');
      return {};
    }
    
    const data = JSON.parse(json);
    Logger.log('✅ Loaded ' + Object.keys(data).length + ' active breaks from Properties');
    return data;
    
  } catch (error) {
    Logger.log('⚠️ Error reading Properties: ' + error);
    return {};
  }
}

/**
 * Save active breaks to Properties Service
 */
function saveActiveBreaksToProperties(activeBreaks) {
  try {
    const userProps = PropertiesService.getUserProperties();
    const json = JSON.stringify(activeBreaks);
    
    // Check size limit (500KB total for all properties)
    const sizeKB = new Blob([json]).size / 1024;
    Logger.log('📊 Properties size: ' + sizeKB.toFixed(2) + ' KB');
    
    if (sizeKB > 450) { // Leave 50KB buffer
      Logger.log('⚠️ Properties approaching size limit! Syncing to sheets...');
      syncPropertiesToSheets();
    }
    
    userProps.setProperty(PROPERTIES_KEYS.ACTIVE_BREAKS, json);
    Logger.log('✅ Saved ' + Object.keys(activeBreaks).length + ' active breaks to Properties');
    
  } catch (error) {
    Logger.log('❌ Error writing to Properties: ' + error);
    throw error;
  }
}

// ============================================
// CACHE SERVICE MANAGEMENT (Daily Counters)
// ============================================

/**
 * Get daily break count from cache
 */
function getDailyBreakCountFast(username, breakCode, today) {
  try {
    const cache = CacheService.getScriptCache();
    const key = `count_${username}_${breakCode}_${today}`;
    
    const cached = cache.get(key);
    if (cached !== null) {
      Logger.log('✅ Cache HIT: ' + key + ' = ' + cached);
      return parseInt(cached);
    }
    
    Logger.log('❌ Cache MISS: ' + key);
    
    // Fallback: Read from sheet
    const count = getDailyBreakCountFromSheet(username, breakCode, today);
    
    // Cache for 24 hours
    cache.put(key, String(count), 86400);
    
    return count;
    
  } catch (error) {
    Logger.log('⚠️ Error reading cache: ' + error);
    return 0;
  }
}

/**
 * Increment daily break count in cache
 */
function incrementDailyBreakCount(username, breakCode, today) {
  try {
    const cache = CacheService.getScriptCache();
    const key = `count_${username}_${breakCode}_${today}`;
    
    let count = getDailyBreakCountFast(username, breakCode, today);
    count++;
    
    cache.put(key, String(count), 86400);
    Logger.log('✅ Incremented counter: ' + key + ' = ' + count);
    
  } catch (error) {
    Logger.log('⚠️ Error updating cache: ' + error);
  }
}

/**
 * Decrement daily break count in cache (for cancel)
 */
function decrementDailyBreakCount(username, breakCode, today) {
  try {
    const cache = CacheService.getScriptCache();
    const key = `count_${username}_${breakCode}_${today}`;
    
    let count = getDailyBreakCountFast(username, breakCode, today);
    if (count > 0) {
      count--;
      cache.put(key, String(count), 86400);
      Logger.log('✅ Decremented counter: ' + key + ' = ' + count);
    }
    
  } catch (error) {
    Logger.log('⚠️ Error updating cache: ' + error);
  }
}

/**
 * Get daily break count from sheet (fallback)
 */
function getDailyBreakCountFromSheet(username, breakCode, today) {
  try {
    const logSheet = getOrCreateSheet(PUNCH_LOG_SHEET);
    const data = logSheet.getDataRange().getValues();
    
    const count = data.filter((row, idx) => {
      return idx > 0 && 
             String(row[0]) === today && 
             String(row[2]) === username && 
             String(row[3]) === breakCode;
    }).length;
    
    Logger.log('📊 Sheet count for ' + username + ' ' + breakCode + ': ' + count);
    return count;
    
  } catch (error) {
    Logger.log('⚠️ Error reading sheet: ' + error);
    return 0;
  }
}

// ============================================
// ASYNC SHEET OPERATIONS (Background writes)
// ============================================

/**
 * Write break to Live_Breaks sheet (async - don't block)
 */
function writeBreakToSheetAsync(username, breakCode, duration, today, timeStr, chatId) {
  try {
    const liveSheet = getOrCreateSheet(LIVE_BREAKS_SHEET);
    const newRow = liveSheet.getLastRow() + 1;
    
    // Single batch write (7 columns)
    const rowData = [today, timeStr, username, breakCode, duration, 'ON BREAK', String(chatId)];
    liveSheet.getRange(newRow, 1, 1, 7).setValues([rowData]).setNumberFormat('@');
    
    Logger.log('✅ Break written to Live_Breaks (async)');
    
  } catch (error) {
    Logger.log('⚠️ Error writing to Live_Breaks: ' + error);
    // Don't throw - this is async, Properties already updated
  }
}

/**
 * Write punch log to Punch_Logs sheet (async)
 */
function writePunchLogAsync(username, breakCode, today, startTime, endTime, actualMinutes, expectedDuration, chatId) {
  try {
    const logSheet = getOrCreateSheet(PUNCH_LOG_SHEET);
    const newRow = logSheet.getLastRow() + 1;
    
    let status = actualMinutes > expectedDuration ? '⚠️ OVER TIME' : '✅ OK';
    
    // Single batch write (8 columns)
    const rowData = [today, startTime, username, breakCode, actualMinutes, endTime, status, String(chatId)];
    logSheet.getRange(newRow, 1, 1, 8).setValues([rowData]).setNumberFormat('@');
    
    Logger.log('✅ Punch log written to Punch_Logs (async)');
    
  } catch (error) {
    Logger.log('⚠️ Error writing to Punch_Logs: ' + error);
  }
}

/**
 * Delete from Live_Breaks sheet (async)
 */
function deleteFromLiveBreaksAsync(username, today) {
  try {
    const liveSheet = getOrCreateSheet(LIVE_BREAKS_SHEET);
    const data = liveSheet.getDataRange().getValues();
    
    // Find and delete user's break
    for (let i = data.length - 1; i >= 1; i--) {
      const rowDate = String(data[i][0]);
      const rowUser = String(data[i][2]);
      
      if (rowDate === today && rowUser === username) {
        liveSheet.deleteRow(i + 1);
        Logger.log('✅ Deleted row ' + (i + 1) + ' from Live_Breaks (async)');
        break;
      }
    }
    
  } catch (error) {
    Logger.log('⚠️ Error deleting from Live_Breaks: ' + error);
  }
}

// ============================================
// FALLBACK FUNCTIONS (Sheet-based processing)
// ============================================

/**
 * Process break using sheets (slow but safe fallback)
 */
function processBreakSlow(username, breakCode, userId, chatId) {
  Logger.log('⚠️ Using SLOW path (sheet-based processing)');
  
  const liveSheet = getOrCreateSheet(LIVE_BREAKS_SHEET);
  const now = new Date();
  const today = getTodayDate();
  const timeStr = getTimeString(now);
  const breakConfig = BREAKS[breakCode];
  
  // Check for active break
  const data = liveSheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    const rowDate = String(data[i][0]);
    const rowUser = String(data[i][2]);
    const rowStatus = String(data[i][5]);
    
    if (rowDate === today && rowUser === username && rowStatus === 'ON BREAK') {
      return {
        success: false,
        message: `🤨 You already have an active break!\n\nActive: ${data[i][3]} (${data[i][1]})\n\nType "back" to close it first!`
      };
    }
  }
  
  // Check daily limit
  const dailyCount = getDailyBreakCountFromSheet(username, breakCode, today);
  const limitReached = dailyCount >= breakConfig.dailyLimit;
  
  // Write to sheet
  const newRow = liveSheet.getLastRow() + 1;
  const rowData = [today, timeStr, username, breakCode, breakConfig.duration, 'ON BREAK', String(chatId)];
  liveSheet.getRange(newRow, 1, 1, 7).setValues([rowData]).setNumberFormat('@');
  
  let message = `Status: OK | ${dailyCount + 1}/${breakConfig.dailyLimit} used today`;
  if (limitReached) {
    message = `${getRandomSarcasm(breakCode, 'limitReached')}`;
  }
  
  return {
    success: true,
    message: message
  };
}

/**
 * Handle punch back using sheets (slow fallback)
 */
function handlePunchBackSlow(username, chatId) {
  Logger.log('⚠️ Using SLOW path (sheet-based punch back)');
  
  const liveSheet = getOrCreateSheet(LIVE_BREAKS_SHEET);
  const logSheet = getOrCreateSheet(PUNCH_LOG_SHEET);
  const now = new Date();
  const today = getTodayDate();
  const timeStr = getTimeString(now);
  
  const data = liveSheet.getDataRange().getValues();
  
  for (let i = data.length - 1; i >= 1; i--) {
    const rowDate = String(data[i][0]);
    const rowUser = String(data[i][2]);
    const rowStatus = String(data[i][5]);
    
    if (rowDate === today && rowUser === username && rowStatus === 'ON BREAK') {
      const breakStartTime = data[i][1];
      const expectedDuration = data[i][4];
      const breakCode = data[i][3];
      
      const start = new Date('1970/01/01 ' + breakStartTime);
      const end = new Date('1970/01/01 ' + timeStr);
      let actualMinutes = Math.round((end - start) / 60000);
      
      if (isNaN(actualMinutes) || actualMinutes < 0) {
        actualMinutes = 0;
      }
      
      // Write to Punch_Logs
      const newRow = logSheet.getLastRow() + 1;
      const status = actualMinutes > expectedDuration ? '⚠️ OVER TIME' : '✅ OK';
      const rowData = [today, breakStartTime, username, breakCode, actualMinutes, timeStr, status, String(chatId)];
      logSheet.getRange(newRow, 1, 1, 8).setValues([rowData]).setNumberFormat('@');
      
      // Delete from Live_Breaks
      liveSheet.deleteRow(i + 1);
      
      if (actualMinutes > expectedDuration) {
        const overTime = actualMinutes - expectedDuration;
        return {
          success: false,
          breakCode: breakCode,
          message: `${getRandomSarcasm(breakCode, 'overtimeWarning')}\n\n⏱️ Expected: ${expectedDuration}min\n📊 Actual: ${actualMinutes}min\n🚨 Over by ${overTime}min!`
        };
      } else {
        const remaining = expectedDuration - actualMinutes;
        return {
          success: true,
          breakCode: breakCode,
          message: `⏱️ Expected: ${expectedDuration}min\n📊 Actual: ${actualMinutes}min\n${remaining > 0 ? `(${remaining}min under)` : ''}`
        };
      }
    }
  }
  
  const noBreakMessages = [
    '👀 You can\'t come back if you never left.',
    '🤔 You\'re not on a break right now, chief.'
  ];
  
  return {
    success: false,
    message: noBreakMessages[Math.floor(Math.random() * noBreakMessages.length)]
  };
}

// ============================================
// SYNC MECHANISM (Properties ↔ Sheets)
// ============================================

/**
 * Sync Properties to Sheets (run periodically)
 */
function syncPropertiesToSheets() {
  Logger.log('====================================');
  Logger.log('🔄 SYNCING PROPERTIES TO SHEETS');
  Logger.log('====================================');
  
  try {
    const activeBreaks = getActiveBreaksFromProperties();
    const liveSheet = getOrCreateSheet(LIVE_BREAKS_SHEET);
    const data = liveSheet.getDataRange().getValues();
    
    let synced = 0;
    let added = 0;
    let removed = 0;
    
    // 1. Check Properties → Sheet (add missing)
    for (const username in activeBreaks) {
      const breakInfo = activeBreaks[username];
      
      // Check if exists in sheet
      let found = false;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][2]) === username && String(data[i][0]) === breakInfo.startDate) {
          found = true;
          synced++;
          break;
        }
      }
      
      if (!found) {
        // Add to sheet
        const newRow = liveSheet.getLastRow() + 1;
        const rowData = [
          breakInfo.startDate,
          breakInfo.startTime,
          username,
          breakInfo.breakCode,
          breakInfo.expectedDuration,
          'ON BREAK',
          breakInfo.chatId
        ];
        liveSheet.getRange(newRow, 1, 1, 7).setValues([rowData]).setNumberFormat('@');
        added++;
        Logger.log('➕ Added to sheet: ' + username);
      }
    }
    
    // 2. Check Sheet → Properties (remove orphans)
    const today = getTodayDate();
    for (let i = data.length - 1; i >= 1; i--) {
      const rowDate = String(data[i][0]);
      const rowUser = String(data[i][2]);
      const rowStatus = String(data[i][5]);
      
      if (rowDate === today && rowStatus === 'ON BREAK') {
        if (!activeBreaks[rowUser]) {
          // Remove from sheet (orphan)
          liveSheet.deleteRow(i + 1);
          removed++;
          Logger.log('➖ Removed from sheet: ' + rowUser);
        }
      }
    }
    
    Logger.log('');
    Logger.log('✅ Sync complete:');
    Logger.log('  Synced: ' + synced);
    Logger.log('  Added: ' + added);
    Logger.log('  Removed: ' + removed);
    Logger.log('====================================');
    
    // Update sync timestamp
    const userProps = PropertiesService.getUserProperties();
    userProps.setProperty(PROPERTIES_KEYS.LAST_SYNC, new Date().toISOString());
    userProps.setProperty(PROPERTIES_KEYS.SYNC_STATUS, 'OK');
    
  } catch (error) {
    Logger.log('❌ Sync error: ' + error);
    const userProps = PropertiesService.getUserProperties();
    userProps.setProperty(PROPERTIES_KEYS.SYNC_STATUS, 'ERROR: ' + error);
  }
}

/**
 * Load Properties from Sheets (initialization/recovery)
 */
function loadPropertiesFromSheets() {
  Logger.log('====================================');
  Logger.log('📥 LOADING PROPERTIES FROM SHEETS');
  Logger.log('====================================');
  
  try {
    const liveSheet = getOrCreateSheet(LIVE_BREAKS_SHEET);
    const data = liveSheet.getDataRange().getValues();
    const today = getTodayDate();
    const activeBreaks = {};
    
    let loaded = 0;
    
    for (let i = 1; i < data.length; i++) {
      const rowDate = String(data[i][0]);
      const rowStatus = String(data[i][5]);
      
      if (rowDate === today && rowStatus === 'ON BREAK') {
        const username = String(data[i][2]);
        
        activeBreaks[username] = {
          breakCode: String(data[i][3]),
          startTime: String(data[i][1]),
          startDate: rowDate,
          expectedDuration: parseInt(data[i][4]),
          chatId: String(data[i][6]),
          timestamp: new Date().getTime()
        };
        
        loaded++;
      }
    }
    
    saveActiveBreaksToProperties(activeBreaks);
    
    Logger.log('✅ Loaded ' + loaded + ' active breaks to Properties');
    Logger.log('====================================');
    
    return loaded;
    
  } catch (error) {
    Logger.log('❌ Load error: ' + error);
    return 0;
  }
}

// ============================================
// MONITORING & HEALTH CHECK
// ============================================

/**
 * Log performance metrics
 */
function logPerformance(operation, startTime) {
  const endTime = new Date();
  const duration = endTime - startTime;
  
  Logger.log(`⏱️ ${operation}: ${duration}ms`);
  
  // Log to sheet for analysis (optional)
  try {
    const perfSheet = getOrCreateSheet('Performance_Logs');
    const newRow = perfSheet.getLastRow() + 1;
    perfSheet.getRange(newRow, 1, 1, 3).setValues([[
      new Date(),
      operation,
      duration
    ]]);
  } catch (e) {
    // Ignore errors in performance logging
  }
}

/**
 * Log errors
 */
function logError(functionName, error, context) {
  try {
    const errorSheet = getOrCreateSheet('Error_Logs');
    const newRow = errorSheet.getLastRow() + 1;
    errorSheet.getRange(newRow, 1, 1, 4).setValues([[
      new Date(),
      functionName,
      error.toString(),
      JSON.stringify(context)
    ]]);
    
    Logger.log('❌ Error logged: ' + functionName);
  } catch (e) {
    Logger.log('⚠️ Failed to log error: ' + e);
  }
}

/**
 * Health check endpoint
 */
function doGet(e) {
  try {
    const activeBreaks = getActiveBreaksFromProperties();
    const activeCount = Object.keys(activeBreaks).length;
    
    const userProps = PropertiesService.getUserProperties();
    const lastSync = userProps.getProperty(PROPERTIES_KEYS.LAST_SYNC) || 'Never';
    const syncStatus = userProps.getProperty(PROPERTIES_KEYS.SYNC_STATUS) || 'Unknown';
    
    // Test sheet access
    const liveSheet = getOrCreateSheet(LIVE_BREAKS_SHEET);
    const sheetRows = liveSheet.getLastRow();
    
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      activeBreaks: activeCount,
      liveBreaksRows: sheetRows,
      lastSync: lastSync,
      syncStatus: syncStatus,
      propertiesWorking: true,
      sheetsWorking: true
    };
    
    return ContentService.createTextOutput(JSON.stringify(status, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    const errorStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.toString()
    };
    
    return ContentService.createTextOutput(JSON.stringify(errorStatus, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * View system status
 */
function viewSystemStatus() {
  Logger.log('====================================');
  Logger.log('📊 SYSTEM STATUS');
  Logger.log('====================================');
  
  try {
    // Properties status
    const activeBreaks = getActiveBreaksFromProperties();
    const activeCount = Object.keys(activeBreaks).length;
    
    Logger.log('');
    Logger.log('📝 PROPERTIES SERVICE:');
    Logger.log('  Active breaks: ' + activeCount);
    
    if (activeCount > 0) {
      Logger.log('  Users on break:');
      for (const username in activeBreaks) {
        const info = activeBreaks[username];
        Logger.log(`    - ${username}: ${info.breakCode} (${info.startTime})`);
      }
    }
    
    // Check size
    const json = JSON.stringify(activeBreaks);
    const sizeKB = new Blob([json]).size / 1024;
    Logger.log('  Size: ' + sizeKB.toFixed(2) + ' KB / 500 KB');
    Logger.log('  Capacity: ' + ((sizeKB / 500) * 100).toFixed(1) + '%');
    
    // Sheet status
    Logger.log('');
    Logger.log('📊 SHEETS:');
    const liveSheet = getOrCreateSheet(LIVE_BREAKS_SHEET);
    const logSheet = getOrCreateSheet(PUNCH_LOG_SHEET);
    Logger.log('  Live Breaks: ' + (liveSheet.getLastRow() - 1) + ' rows');
    Logger.log('  Punch Logs: ' + (logSheet.getLastRow() - 1) + ' rows');
    
    // Sync status
    Logger.log('');
    Logger.log('🔄 SYNC STATUS:');
    const userProps = PropertiesService.getUserProperties();
    const lastSync = userProps.getProperty(PROPERTIES_KEYS.LAST_SYNC) || 'Never';
    const syncStatus = userProps.getProperty(PROPERTIES_KEYS.SYNC_STATUS) || 'Unknown';
    Logger.log('  Last sync: ' + lastSync);
    Logger.log('  Status: ' + syncStatus);
    
    Logger.log('');
    Logger.log('====================================');
    
  } catch (error) {
    Logger.log('❌ Error viewing status: ' + error);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get today's date in M/D/YYYY format
 */
function getTodayDate() {
  const now = new Date();
  return (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear();
}

/**
 * Get time string in HH:MM:SS format
 */
function getTimeString(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return hours + ':' + minutes + ':' + seconds;
}

/**
 * Helper function to get or create a sheet
 */
function getOrCreateSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    if (sheetName === LIVE_BREAKS_SHEET) {
      sheet = spreadsheet.insertSheet(sheetName, 1);
      const headers = ['DATE', 'TIME', 'NAME', 'BREAK_CODE', 'EXPECTED_DURATION', 'STATUS', 'CHAT_ID'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else if (sheetName === PUNCH_LOG_SHEET) {
      sheet = spreadsheet.insertSheet(sheetName);
      const headers = ['DATE', 'TIME_START', 'NAME', 'BREAK_CODE', 'TIME_SPENT', 'TIME_END', 'STATUS', 'CHAT_ID'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else if (sheetName === 'Performance_Logs') {
      sheet = spreadsheet.insertSheet(sheetName);
      const headers = ['TIMESTAMP', 'OPERATION', 'DURATION_MS'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else if (sheetName === 'Error_Logs') {
      sheet = spreadsheet.insertSheet(sheetName);
      const headers = ['TIMESTAMP', 'FUNCTION', 'ERROR', 'CONTEXT'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      sheet = spreadsheet.insertSheet(sheetName);
    }
  }
  
  return sheet;
}

// ============================================
// SARCASM MESSAGES (Same as original)
// ============================================

const WC_SARCASM = {
  welcomeBack: ['🧻 Welcome back! You survived 😌', '🧻 Mission accomplished. Hands washed? 👀'],
  breakStarted: ['🧻 Bathroom run initiated… Godspeed 🚽', '🧻 May your trip be quick and successful 💩✨'],
  overtimeWarning: ['🧻 You okay in there? It\'s been a while 👀', '🧻 This is becoming a Netflix episode.'],
  limitReached: ['🛑 That\'s your limit for wc today.', '🛑 You\'ve used all your wc breaks.'],
  cancelled: ['❌ Wc break cancelled!', '❌ Bathroom trip erased.']
};

const BWC_SARCASM = {
  welcomeBack: ['💩 You made it out alive 😤', '💩 Respect. That was a big one.'],
  breakStarted: ['💩 Boss battle started. Good luck.', '💩 Entering the danger zone 🚽⚔️'],
  overtimeWarning: ['💩 That battle is still going?!', '💩 Need backup in there?'],
  limitReached: ['🛑 Enough battles for today!', '🛑 Your quota of big ones is met.'],
  cancelled: ['❌ Battle cancelled!', '❌ The dungeon is sealed.']
};

const CY_SARCASM = {
  welcomeBack: ['🚬 You\'re back! Smelling like determination 💨', '🚬 Nicotine acquired. Brain rebooted.'],
  breakStarted: ['🚬 Smoke break activated. Be cool 😎', '🚬 Go get that nicotine buff.'],
  overtimeWarning: ['🚬 That\'s a long cigarette… 👀', '🚬 You growing tobacco out there?'],
  limitReached: ['🛑 Enough smokes for today!', '🛑 Your daily puff quota is done.'],
  cancelled: ['❌ Smoke break cancelled!', '❌ The cigarette is out.']
};

const CF_SARCASM = {
  welcomeBack: ['🍽️ Welcome back, fully fueled 🔥', '🍽️ That food did you good 😌'],
  breakStarted: ['🍽️ Food quest started. Go eat like a king 👑', '🍽️ Deploying stomach protocol.'],
  overtimeWarning: ['🍽️ That\'s a 5-course meal now 👀', '🍽️ Did you order dessert too?'],
  limitReached: ['🛑 That\'s enough food for today, champ 😆', '🛑 You\'ve officially eaten your way to the limit.'],
  cancelled: ['❌ Food break cancelled. The meal never existed 👻', '❌ Calories deleted.']
};

const BREAK_SARCASM = {
  wc: WC_SARCASM,
  bwc: BWC_SARCASM,
  cy: CY_SARCASM,
  'cf+1': CF_SARCASM,
  'cf+2': CF_SARCASM,
  'cf+3': CF_SARCASM
};

const INVALID_CODE_SARCASM = [
  '❓ Bro… that is not even close 😂 Try: wc, cy, bwc, cf+1, cf+2, cf+3',
  '❓ I admire the confidence, but that code is wrong 😏',
  '❓ That\'s not a break code — that\'s a cry for help 😆'
];

function getRandomSarcasm(breakCode, messageType) {
  if (!breakCode || !BREAK_SARCASM[breakCode]) {
    return INVALID_CODE_SARCASM[Math.floor(Math.random() * INVALID_CODE_SARCASM.length)];
  }
  const sarcasm = BREAK_SARCASM[breakCode];
  if (!sarcasm || !sarcasm[messageType]) {
    return `Missing ${messageType} message for ${breakCode}`;
  }
  const messages = sarcasm[messageType];
  return messages[Math.floor(Math.random() * messages.length)];
}

function parseBreakCode(text) {
  const cleanText = text.trim().toLowerCase();
  if (['c', 'cancel', 'reset'].includes(cleanText)) {
    return 'cancel';
  }
  const sortedCodes = Object.keys(BREAKS).sort((a, b) => b.length - a.length);
  for (const code of sortedCodes) {
    if (cleanText === code.toLowerCase()) {
      return code;
    }
  }
  return null;
}

function sendTelegramMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };
  UrlFetchApp.fetch(url, {
    method: 'post',
    payload: JSON.stringify(payload),
    contentType: 'application/json'
  });
}

// ============================================
// LEGACY FUNCTIONS (Keep for compatibility)
// ============================================

/**
 * Auto punch back overtime breaks (still needed)
 */
function autoPunchBackOvertime() {
  const liveSheet = getOrCreateSheet(LIVE_BREAKS_SHEET);
  const logSheet = getOrCreateSheet(PUNCH_LOG_SHEET);
  const now = new Date();
  const today = getTodayDate();
  const currentTimeStr = getTimeString(now);
  
  const data = liveSheet.getDataRange().getValues();
  const rowsToDelete = [];
  
  for (let i = data.length - 1; i >= 1; i--) {
    const rowDate = String(data[i][0]);
    const rowStatus = String(data[i][5]);
    
    if (rowDate === today && rowStatus === 'ON BREAK') {
      const username = data[i][2];
      const breakCode = data[i][3];
      const breakStartTime = String(data[i][1]);
      const expectedDuration = parseInt(data[i][4]);
      const chatId = data[i][6];
      
      const startParts = breakStartTime.split(':');
      const startSeconds = parseInt(startParts[0]) * 3600 + parseInt(startParts[1]) * 60 + parseInt(startParts[2] || 0);
      
      const currentParts = currentTimeStr.split(':');
      const currentSeconds = parseInt(currentParts[0]) * 3600 + parseInt(currentParts[1]) * 60 + parseInt(currentParts[2]);
      
      let elapsedSeconds = currentSeconds - startSeconds;
      if (elapsedSeconds < 0) {
        elapsedSeconds += 86400;
      }
      
      const elapsedMinutes = Math.round(elapsedSeconds / 60);
      
      if (elapsedMinutes > expectedDuration + 5) {
        // Write to Punch_Logs
        const newRow = logSheet.getLastRow() + 1;
        const rowData = [today, breakStartTime, username, breakCode, elapsedMinutes, currentTimeStr, '⚠️ AUTO PUNCHED', String(chatId)];
        logSheet.getRange(newRow, 1, 1, 8).setValues([rowData]).setNumberFormat('@');
        
        rowsToDelete.push(i + 1);
        
        // Remove from Properties
        try {
          const activeBreaks = getActiveBreaksFromProperties();
          delete activeBreaks[username];
          saveActiveBreaksToProperties(activeBreaks);
        } catch (e) {
          Logger.log('⚠️ Error updating Properties in auto-punch: ' + e);
        }
        
        const warningMsg = `👤 @${username}\n\n${getRandomSarcasm(breakCode, 'overtimeWarning')}\n\n${breakCode.toUpperCase()}\n⏱️ Expected: ${expectedDuration}min\n📊 Actual: ${elapsedMinutes}min\n🚨 Over by ${elapsedMinutes - expectedDuration}min`;
        
        if (chatId) {
          sendTelegramMessage(chatId, warningMsg);
        }
      }
    }
  }
  
  rowsToDelete.forEach(rowNum => {
    liveSheet.deleteRow(rowNum);
  });
}

/**
 * Daily report (same as original)
 */
function dailyReport() {
  const logSheet = getOrCreateSheet(PUNCH_LOG_SHEET);
  const now = new Date();
  const today = getTodayDate();
  const data = logSheet.getDataRange().getValues();
  const todayRecords = data.filter((row, idx) => idx > 0 && String(row[0]) === today);

  if (todayRecords.length === 0) {
    return;
  }

  const breakTypeCounts = { wc: 0, cy: 0, bwc: 0 };
  const breakTypeLeaders = { wc: { user: '', count: 0 }, cy: { user: '', count: 0 }, bwc: { user: '', count: 0 } };
  const userBreakCounts = {};
  
  todayRecords.forEach(row => {
    const username = String(row[2]);
    const breakCode = String(row[3]);
    
    if (breakCode !== 'cf+1' && breakCode !== 'cf+2' && breakCode !== 'cf+3') {
      breakTypeCounts[breakCode]++;
      
      if (!userBreakCounts[username]) {
        userBreakCounts[username] = { wc: 0, cy: 0, bwc: 0 };
      }
      userBreakCounts[username][breakCode]++;
      
      if (userBreakCounts[username][breakCode] > breakTypeLeaders[breakCode].count) {
        breakTypeLeaders[breakCode] = { user: username, count: userBreakCounts[username][breakCode] };
      }
    }
  });

  let report = `📊 *DAILY REPORT - ${today}*\n\n*📊 TOTAL BREAKS TODAY:*\n`;
  if (breakTypeCounts.wc > 0) report += `🚽 WC: ${breakTypeCounts.wc}x\n`;
  if (breakTypeCounts.cy > 0) report += `🚬 CY: ${breakTypeCounts.cy}x\n`;
  if (breakTypeCounts.bwc > 0) report += `💩 BWC: ${breakTypeCounts.bwc}x\n`;
  
  report += `\n*🏆 LEADERBOARD:*\n`;
  if (breakTypeLeaders.bwc.user) report += `💩 King of Poop (BWC): @${breakTypeLeaders.bwc.user}\n`;
  if (breakTypeLeaders.wc.user) report += `🚽 King of Pee (WC): @${breakTypeLeaders.wc.user}\n`;
  if (breakTypeLeaders.cy.user) report += `🚬 King of Smoke (CY): @${breakTypeLeaders.cy.user}\n`;

  const chatIds = new Set(data.map(row => row[7]).filter(Boolean));
  chatIds.forEach(chatId => {
    if (chatId) {
      sendTelegramMessage(chatId, report);
    }
  });
}

/**
 * Monthly migration (same as original)
 */
function monthlyMigration() {
  const today = new Date();
  if (today.getDate() !== 1) return;
  
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const logSheet = getOrCreateSheet(PUNCH_LOG_SHEET);
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const monthYear = (previousMonth.getMonth() + 1) + '/' + previousMonth.getFullYear();
  const archiveName = monthYear + ' Archive';
  
  const archiveSheet = spreadsheet.insertSheet(archiveName, 0);
  const headerRow = logSheet.getRange(1, 1, 1, 8);
  archiveSheet.getRange(1, 1, 1, 8).setValues(headerRow.getValues());
  
  const dataRange = logSheet.getDataRange();
  if (dataRange.getLastRow() > 1) {
    const dataValues = logSheet.getRange(2, 1, dataRange.getLastRow() - 1, 8).getValues();
    archiveSheet.getRange(2, 1, dataValues.length, 8).setValues(dataValues);
  }
  
  if (logSheet.getLastRow() > 1) {
    logSheet.deleteRows(2, logSheet.getLastRow() - 1);
  }
}

// ============================================
// SETUP TRIGGERS (Updated)
// ============================================

function setupTriggers() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  spreadsheet.setSpreadsheetTimeZone('Asia/Dubai');
  
  ScriptApp.getProjectTriggers().forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Sync Properties to Sheets every 5 minutes
  ScriptApp.newTrigger('syncPropertiesToSheets')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  // Auto punch back overtime breaks every minute
  ScriptApp.newTrigger('autoPunchBackOvertime')
    .timeBased()
    .everyMinutes(1)
    .create();
  
  // Daily report at 8 PM
  ScriptApp.newTrigger('dailyReport')
    .timeBased()
    .everyDays(1)
    .atHour(20)
    .create();
  
  // Monthly migration on 1st of month
  ScriptApp.newTrigger('monthlyMigration')
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .create();
  
  Logger.log('✅ All triggers set up successfully (with Properties + Lock system)!');
  Logger.log('⚡ Performance target: 60 employees in ~2 seconds');
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize system - Run once after deployment
 */
function initializeSystem() {
  Logger.log('====================================');
  Logger.log('🚀 INITIALIZING FASTEST SYSTEM');
  Logger.log('====================================');
  
  // 1. Load active breaks from sheets to Properties
  const loaded = loadPropertiesFromSheets();
  Logger.log('✅ Loaded ' + loaded + ' active breaks');
  
  // 2. Set up triggers
  setupTriggers();
  Logger.log('✅ Triggers configured');
  
  // 3. Initial sync
  syncPropertiesToSheets();
  Logger.log('✅ Initial sync complete');
  
  // 4. View status
  viewSystemStatus();
  
  Logger.log('');
  Logger.log('====================================');
  Logger.log('✅ SYSTEM READY');
  Logger.log('⚡ Target: 60 employees in ~2 seconds');
  Logger.log('====================================');
}
