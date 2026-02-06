// ============================================
// FAST BATCH QUEUE SOLUTION
// ============================================
// Processes multiple requests per cycle for faster response
// 60 employees processed in ~60 seconds (not 60 minutes!)
// ============================================

const QUEUE_SHEET = 'Queue';
const BATCH_SIZE = 10; // Process 10 requests per cycle

// ============================================
// WEBHOOK HANDLER (Modified doPost)
// ============================================

function doPost(e) {
  try {
    const update = JSON.parse(e.postData.contents);
    
    if (!update.message) {
      return HtmlService.createHtmlOutput('ok');
    }

    const message = update.message;
    const text = (message.text || '').toLowerCase().trim();
    const chatId = message.chat.id;
    const firstName = message.from.first_name || '';
    const lastName = message.from.last_name || '';
    const username = (firstName + ' ' + lastName).trim() || message.from.username || 'Anonymous';

    Logger.log('📬 Telegram message: ' + text + ' from ' + username);

    // Determine action type
    let action, param;
    
    if (BACK_KEYWORDS.includes(text)) {
      action = 'BREAK_END';
      param = '';
    } else if (['c', 'cancel', 'reset'].includes(text)) {
      action = 'BREAK_CANCEL';
      param = '';
    } else {
      const breakCode = parseBreakCode(text);
      if (!breakCode) {
        // Invalid code - respond immediately (no queue)
        const invalidMsg = INVALID_CODE_SARCASM[Math.floor(Math.random() * INVALID_CODE_SARCASM.length)];
        sendTelegramMessage(chatId, `👤 @${username}\n\n${invalidMsg}`);
        return HtmlService.createHtmlOutput('ok');
      }
      action = 'BREAK_START';
      param = breakCode;
    }

    // Check for duplicate pending request (IMPORTANT!)
    if (hasPendingRequest(username)) {
      sendTelegramMessage(chatId, `👤 @${username}\n\n⏳ Your previous request is still processing... Please wait!`);
      return HtmlService.createHtmlOutput('duplicate');
    }

    // Add to queue
    addToQueue(username, chatId, action, param);

    // Send "processing" message
    sendTelegramMessage(chatId, `👤 @${username}\n\n⏳ Processing your request... (~10 sec)`);

    return HtmlService.createHtmlOutput('queued');
  } catch (error) {
    Logger.log('Error: ' + error);
    return HtmlService.createHtmlOutput('error: ' + error);
  }
}

// ============================================
// QUEUE MANAGEMENT
// ============================================

/**
 * Add request to queue
 */
function addToQueue(username, chatId, action, param) {
  const queueSheet = getOrCreateSheet(QUEUE_SHEET);
  const timestamp = new Date();
  
  // Append to queue (fast operation)
  const newRow = queueSheet.getLastRow() + 1;
  queueSheet.getRange(newRow, 1, 1, 5).setValues([[
    timestamp,
    username,
    chatId,
    action,
    param
  ]]);
  
  Logger.log(`✅ Added to queue: ${username} - ${action} - ${param}`);
}

/**
 * Check if user already has pending request
 */
function hasPendingRequest(username) {
  const queueSheet = getOrCreateSheet(QUEUE_SHEET);
  const data = queueSheet.getDataRange().getValues();
  
  // Check if username exists in queue (excluding header)
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === username) {
      Logger.log(`⚠️ ${username} already has pending request`);
      return true;
    }
  }
  
  return false;
}

/**
 * Process queue in BATCHES (Fast!)
 * Runs every 10 seconds, processes up to BATCH_SIZE requests
 */
function processQueueBatch() {
  const startTime = new Date();
  Logger.log('====================================');
  Logger.log('🚀 BATCH QUEUE PROCESSOR STARTED');
  Logger.log('====================================');
  
  const queueSheet = getOrCreateSheet(QUEUE_SHEET);
  const data = queueSheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    Logger.log('📭 Queue is empty');
    return;
  }
  
  const queueSize = data.length - 1; // Exclude header
  Logger.log(`📊 Queue size: ${queueSize} requests`);
  Logger.log(`📦 Batch size: ${BATCH_SIZE} requests per cycle`);
  Logger.log('');
  
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const rowsToDelete = [];
  
  // Process first BATCH_SIZE entries
  for (let i = 1; i <= Math.min(BATCH_SIZE, data.length - 1); i++) {
    const [timestamp, username, chatId, action, param] = data[i];
    
    Logger.log(`[${i}/${BATCH_SIZE}] Processing: ${username} - ${action} - ${param}`);
    
    try {
      let result;
      let responseMsg;
      
      // Execute action
      if (action === 'BREAK_START') {
        result = processBreak(username, param, null, chatId);
        
        if (result.success) {
          responseMsg = `👤 @${username}\n\n${getRandomSarcasm(param, 'breakStarted')}\n\n⏱️ ${BREAKS[param].name} (${BREAKS[param].duration} min)\n📊 ${result.message}`;
          succeeded++;
        } else {
          responseMsg = `👤 @${username}\n\n${result.message}`;
          failed++;
        }
        
      } else if (action === 'BREAK_END') {
        result = handlePunchBack(username, chatId);
        
        if (result.success) {
          responseMsg = `👤 @${username}\n\n${getRandomSarcasm(result.breakCode, 'welcomeBack')}\n\n${result.message}`;
          succeeded++;
        } else {
          responseMsg = `👤 @${username}\n\n${result.message}`;
          failed++;
        }
        
      } else if (action === 'BREAK_CANCEL') {
        handleCancel(username, chatId, null);
        succeeded++;
      }
      
      // Send response to user
      if (responseMsg) {
        sendTelegramMessage(chatId, responseMsg);
      }
      
      // Mark for deletion
      rowsToDelete.push(i + 1); // +1 because rows are 1-indexed
      processed++;
      
      Logger.log(`  ✅ Success`);
      
    } catch (error) {
      Logger.log(`  ❌ Error: ${error}`);
      
      // Send error message to user
      sendTelegramMessage(chatId, `👤 @${username}\n\n⚠️ Error processing request. Please try again.`);
      
      // Still mark for deletion (don't retry forever)
      rowsToDelete.push(i + 1);
      failed++;
      processed++;
    }
  }
  
  // Delete processed rows (in reverse order to maintain indices)
  Logger.log('');
  Logger.log('🗑️ Deleting processed entries...');
  for (let i = rowsToDelete.length - 1; i >= 0; i--) {
    queueSheet.deleteRow(rowsToDelete[i]);
  }
  
  const endTime = new Date();
  const duration = endTime - startTime;
  
  Logger.log('');
  Logger.log('====================================');
  Logger.log('✅ BATCH PROCESSING COMPLETE');
  Logger.log('====================================');
  Logger.log(`Processed: ${processed} requests`);
  Logger.log(`Succeeded: ${succeeded}`);
  Logger.log(`Failed: ${failed}`);
  Logger.log(`Duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`);
  Logger.log(`Remaining in queue: ${queueSize - processed}`);
  Logger.log('====================================');
}

// ============================================
// QUEUE SHEET SETUP
// ============================================

/**
 * Modified getOrCreateSheet to include Queue sheet
 */
function getOrCreateSheetWithQueue(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    if (sheetName === QUEUE_SHEET) {
      // Create Queue sheet at position 0 (first)
      sheet = spreadsheet.insertSheet(sheetName, 0);
      const headers = ['TIMESTAMP', 'USERNAME', 'CHAT_ID', 'ACTION', 'PARAM'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      Logger.log('✅ Created Queue sheet with headers');
    } else if (sheetName === LIVE_BREAKS_SHEET) {
      sheet = spreadsheet.insertSheet(sheetName, 1);
      const headers = ['DATE', 'TIME', 'NAME', 'BREAK_CODE', 'EXPECTED_DURATION', 'STATUS', 'CHAT_ID'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      sheet = spreadsheet.insertSheet(sheetName);
      const headers = ['DATE', 'TIME_START', 'NAME', 'BREAK_CODE', 'TIME_SPENT', 'TIME_END', 'STATUS', 'CHAT_ID'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  
  return sheet;
}

// ============================================
// SETUP TRIGGERS (Modified)
// ============================================

function setupTriggersWithQueue() {
  // Set spreadsheet timezone to Dubai (Asia/Dubai)
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  spreadsheet.setSpreadsheetTimeZone('Asia/Dubai');
  Logger.log('Spreadsheet timezone set to Dubai (Asia/Dubai)');
  
  // Remove old triggers
  ScriptApp.getProjectTriggers().forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // ⚡ FAST QUEUE PROCESSOR - Every 10 seconds
  ScriptApp.newTrigger('processQueueBatch')
    .timeBased()
    .everyMinutes(1) // Apps Script minimum is 1 minute
    .create();
  
  Logger.log('⚠️ NOTE: Apps Script minimum trigger interval is 1 minute');
  Logger.log('   For 10-second intervals, use a loop inside processQueueBatch()');
  
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
  
  Logger.log('All triggers set up successfully (with fast queue processor)!');
}

// ============================================
// ALTERNATIVE: Process multiple times per trigger
// ============================================

/**
 * WORKAROUND for 10-second processing:
 * Trigger runs every 1 minute, but processes 6 times inside
 * (effectively every 10 seconds)
 */
function processQueueFast() {
  Logger.log('🚀 Starting fast queue processor (6 cycles × 10 sec)');
  
  for (let cycle = 1; cycle <= 6; cycle++) {
    Logger.log(`\n--- Cycle ${cycle}/6 ---`);
    processQueueBatch();
    
    // Wait 10 seconds before next cycle (except last)
    if (cycle < 6) {
      Utilities.sleep(10000); // 10 seconds
    }
  }
  
  Logger.log('\n✅ Fast queue processor complete (all 6 cycles done)');
}

// ============================================
// MONITORING & UTILITIES
// ============================================

/**
 * View current queue status
 */
function viewQueueStatus() {
  const queueSheet = getOrCreateSheet(QUEUE_SHEET);
  const data = queueSheet.getDataRange().getValues();
  
  Logger.log('====================================');
  Logger.log('📊 QUEUE STATUS');
  Logger.log('====================================');
  Logger.log(`Total in queue: ${data.length - 1} requests`);
  Logger.log('');
  
  if (data.length > 1) {
    Logger.log('Recent entries:');
    for (let i = 1; i < Math.min(11, data.length); i++) {
      const [timestamp, username, chatId, action, param] = data[i];
      const age = Math.round((new Date() - new Date(timestamp)) / 1000);
      Logger.log(`  ${i}. ${username} - ${action} ${param} (${age}s ago)`);
    }
    
    if (data.length > 11) {
      Logger.log(`  ... and ${data.length - 11} more`);
    }
  }
  
  Logger.log('====================================');
}

/**
 * Clear entire queue (emergency use only)
 */
function clearQueue() {
  const confirmation = Browser.msgBox(
    'Clear Queue',
    'This will DELETE all pending requests. Continue?',
    Browser.Buttons.YES_NO
  );
  
  if (confirmation !== 'yes') {
    Logger.log('Queue clear cancelled');
    return;
  }
  
  const queueSheet = getOrCreateSheet(QUEUE_SHEET);
  const data = queueSheet.getDataRange().getValues();
  
  if (data.length > 1) {
    queueSheet.deleteRows(2, data.length - 1);
    Logger.log(`✅ Cleared ${data.length - 1} queue entries`);
  } else {
    Logger.log('Queue already empty');
  }
}

// ============================================
// PERFORMANCE CALCULATOR
// ============================================

function calculateQueuePerformance() {
  const scenarios = [
    { employees: 10, batchSize: 10, interval: 10 },
    { employees: 30, batchSize: 10, interval: 10 },
    { employees: 60, batchSize: 10, interval: 10 },
    { employees: 100, batchSize: 10, interval: 10 },
    { employees: 60, batchSize: 5, interval: 10 },
    { employees: 60, batchSize: 15, interval: 10 },
  ];
  
  Logger.log('====================================');
  Logger.log('⏱️ QUEUE PERFORMANCE CALCULATOR');
  Logger.log('====================================');
  Logger.log('');
  
  scenarios.forEach(({ employees, batchSize, interval }) => {
    const cycles = Math.ceil(employees / batchSize);
    const totalTime = cycles * interval;
    const avgWait = totalTime / 2;
    
    Logger.log(`📊 ${employees} employees | Batch: ${batchSize} | Interval: ${interval}s`);
    Logger.log(`   Cycles needed: ${cycles}`);
    Logger.log(`   Total time: ${totalTime}s (${(totalTime/60).toFixed(1)}min)`);
    Logger.log(`   Avg wait: ${avgWait}s`);
    Logger.log(`   Max wait: ${totalTime}s`);
    Logger.log('');
  });
  
  Logger.log('====================================');
}
