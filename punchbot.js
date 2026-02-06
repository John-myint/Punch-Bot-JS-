// ============================================
// === PUNCH BOT - Google Apps Script ===
// ============================================
// A fun, sarcastic Telegram bot for tracking team breaks
// Webhook handler for real-time break logging + FIFO Queue
// 
// PRODUCTION READY - v2.1
// Last Updated: January 26, 2026
// 
// Features:
// - Track 6 break types with daily limits
// - Break-specific sarcastic messages
// - Auto-punch after expected duration + 5 min
// - Daily reports at 8 PM
// - Monthly data archival
// - Concurrent request handling via FIFO queue
// - Group chat ready with username tagging
// 
// Setup: Configure SHEET_ID and BOT_TOKEN in Script Properties
// Documentation: See README.md
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

// Helper function to get or create a sheet
function getOrCreateSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    // If Live Breaks doesn't exist, create it at position 1
    if (sheetName === LIVE_BREAKS_SHEET) {
      sheet = spreadsheet.insertSheet(sheetName, 1); // Position 1 = first sheet
      // Live Breaks: 7 columns (no break name)
      const headers = ['DATE', 'TIME', 'NAME', 'BREAK_CODE', 'EXPECTED_DURATION', 'STATUS', 'CHAT_ID'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      sheet = spreadsheet.insertSheet(sheetName); // Punch Log at end
      // Punch Logs: 8 columns (simplified - no break name)
      const headers = ['DATE', 'TIME_START', 'NAME', 'BREAK_CODE', 'TIME_SPENT', 'TIME_END', 'STATUS', 'CHAT_ID'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  
  return sheet;
}

// Back keywords to trigger punch back
const BACK_KEYWORDS = ['back', 'b', '1', 'btw', 'back to work'];

// === DIAGNOSTIC FUNCTION ===
function listAllSheets() {
  Logger.log('=== ALL SHEETS IN SPREADSHEET ===');
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheets = spreadsheet.getSheets();
  Logger.log('Total sheets: ' + sheets.length);
  sheets.forEach((sheet, index) => {
    Logger.log((index + 1) + '. Name="' + sheet.getName() + '" | ID=' + sheet.getSheetId() + ' | Rows=' + sheet.getLastRow());
  });
}

function checkSheetHeaders() {
  Logger.log('=== SHEET DIAGNOSTIC ===');
  
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  
  // Check Live Breaks
  const liveSheet = spreadsheet.getSheetByName(LIVE_BREAKS_SHEET);
  if (liveSheet) {
    const liveData = liveSheet.getDataRange().getValues();
    Logger.log('\n📋 LIVE BREAKS SHEET (7 columns):');
    Logger.log('Total rows: ' + liveData.length);
    Logger.log('Headers: ' + JSON.stringify(liveData[0]));
    for (let i = 1; i < Math.min(5, liveData.length); i++) {
      Logger.log('Row ' + (i+1) + ': ' + JSON.stringify(liveData[i]));
    }
  } else {
    Logger.log('❌ Live Breaks sheet not found');
  }
  
  // Check Punch Logs
  const logSheet = spreadsheet.getSheetByName(PUNCH_LOG_SHEET);
  if (logSheet) {
    const logData = logSheet.getDataRange().getValues();
    Logger.log('\n📋 PUNCH LOGS SHEET (8 columns):');
    Logger.log('Total rows: ' + logData.length);
    Logger.log('Headers: ' + JSON.stringify(logData[0]));
    for (let i = 1; i < Math.min(5, logData.length); i++) {
      Logger.log('Row ' + (i+1) + ': ' + JSON.stringify(logData[i]));
    }
  } else {
    Logger.log('❌ Punch Logs sheet not found');
  }
}

// === SARCASTIC RESPONSE MESSAGES - BREAK SPECIFIC ===
const WC_SARCASM = {
  welcomeBack: [
    '🧻 Welcome back! You survived 😌',
    '🧻 Mission accomplished. Hands washed? 👀',
    '🧻 And you\'re back! The throne misses you already.',
    '🧻 Another legendary journey completed.',
    '🧻 That was… productive.',
    '🧻 You escaped the bathroom dimension.',
    '🧻 Back from the splash zone!',
    '🧻 That was a heroic flush.',
    '🧻 Bathroom speedrun complete.',
    '🧻 The pipes thank you.'
  ],
  breakStarted: [
    '🧻 Bathroom run initiated… Godspeed 🚽',
    '🧻 May your trip be quick and successful 💩✨',
    '🧻 Entering the porcelain portal…',
    '🧻 Toilet time! Choose your destiny.',
    '🧻 May the Wi-Fi be strong where you\'re going.',
    '🧻 Off to the throne you go.',
    '🧻 The bathroom awaits your presence.',
    '🧻 Let the flushing begin.',
    '🧻 Tactical toilet deployment.',
    '🧻 Nature is calling.'
  ],
  overtimeWarning: [
    '🧻 You okay in there? It\'s been a while 👀',
    '🧻 This is becoming a Netflix episode.',
    '🧻 Emergency flush protocol advised 🚨',
    '🧻 At this point, you live there now.',
    '🧻 The toilet has claimed another victim.',
    '🧻 Did you fall asleep on the seat?',
    '🧻 We\'re getting worried…',
    '🧻 That bathroom must be comfy.',
    '🧻 Time to return from the splash zone.',
    '🧻 The pipes miss you already.'
  ],
  limitReached: [
    '🛑 That\'s your limit for wc today.',
    '🛑 You\'ve used all your wc breaks.',
    '🛑 No more wc today!',
    '🛑 Quota met for bathroom trips.',
    '🛑 You\'re done with wc for today.'
  ],
  cancelled: [
    '❌ Wc break cancelled!',
    '❌ Bathroom trip erased.',
    '❌ Wc entry gone!',
    '❌ Consider it a mulligan.',
    '❌ The record is clean.'
  ]
};

const BWC_SARCASM = {
  welcomeBack: [
    '💩 You made it out alive 😤',
    '💩 Respect. That was a big one.',
    '💩 The office salutes you 🫡',
    '💩 Stronger than before.',
    '💩 Another warrior returns.',
    '💩 That was a legendary battle.',
    '💩 You deserve a medal 🏅',
    '💩 Victory is yours!',
    '💩 The dungeon is cleared.',
    '💩 You conquered the throne.'
  ],
  breakStarted: [
    '💩 Boss battle started. Good luck.',
    '💩 Entering the danger zone 🚽⚔️',
    '💩 May the odds be in your favor.',
    '💩 This is not a normal WC.',
    '💩 Legends are made here.',
    '💩 Final boss approaching.',
    '💩 Prepare for battle.',
    '💩 The dungeon awaits.',
    '💩 Courage, hero.',
    '💩 A great challenge begins.'
  ],
  overtimeWarning: [
    '💩 That battle is still going?!',
    '💩 Need backup in there?',
    '💩 This is a whole dungeon run.',
    '💩 That boss is tough, huh?',
    '💩 You\'ve been in there forever.',
    '💩 Did the boss call reinforcements?',
    '💩 We hear boss music.',
    '💩 This fight is legendary.',
    '💩 Still battling?',
    '💩 The throne is undefeated so far.'
  ],
  limitReached: [
    '🛑 Enough battles for today!',
    '🛑 Your quota of big ones is met.',
    '🛑 No more epic fights today.',
    '🛑 You\'ve conquered enough.',
    '🛑 The boss arena is closed.'
  ],
  cancelled: [
    '❌ Battle cancelled!',
    '❌ The dungeon is sealed.',
    '❌ Mission aborted!',
    '❌ Retreat successful.',
    '❌ The quest is erased.'
  ]
};

const CY_SARCASM = {
  welcomeBack: [
    '🚬 You\'re back! Smelling like determination 💨',
    '🚬 Nicotine acquired. Brain rebooted.',
    '🚬 Welcome back, calm and collected.',
    '🚬 You look 5% cooler now 😏',
    '🚬 Another smoke, another legend.',
    '🚬 Zen mode activated.',
    '🚬 Chill level restored.',
    '🚬 Back and relaxed.',
    '🚬 That hit did wonders.',
    '🚬 Smooth comeback.'
  ],
  breakStarted: [
    '🚬 Smoke break activated. Be cool 😎',
    '🚬 Go get that nicotine buff.',
    '🚬 Stepping outside the matrix…',
    '🚬 Smoke wisely, my friend.',
    '🚬 Puff puff productivity.',
    '🚬 Time to chill.',
    '🚬 Air and fire combo.',
    '🚬 Relaxation incoming.',
    '🚬 Lighting up.',
    '🚬 Take a breather.'
  ],
  overtimeWarning: [
    '🚬 That\'s a long cigarette… 👀',
    '🚬 You growing tobacco out there?',
    '🚬 The wind carried you away?',
    '🚬 That\'s more of a campfire now.',
    '🚬 Time to put it out, hero.',
    '🚬 That\'s a marathon puff.',
    '🚬 Still smoking?',
    '🚬 The ashtray is lonely.',
    '🚬 Smoke break extended edition.',
    '🚬 Let\'s wrap it up.'
  ],
  limitReached: [
    '🛑 Enough smokes for today!',
    '🛑 Your daily puff quota is done.',
    '🛑 No more cigarettes today.',
    '🛑 The smoking section is closed.',
    '🛑 Time for fresh air instead.'
  ],
  cancelled: [
    '❌ Smoke break cancelled!',
    '❌ The cigarette is out.',
    '❌ Break aborted!',
    '❌ Chill mode disabled.',
    '❌ The relaxation is erased.'
  ]
};

const CF_SARCASM = {
  welcomeBack: [
    '🍽️ Welcome back, fully fueled 🔥',
    '🍽️ That food did you good 😌',
    '🍽️ Powered by carbs and dreams.',
    '🍽️ You look 10% happier now.',
    '🍽️ Productivity restored via food.',
    '🍽️ Back with a full stomach.',
    '🍽️ Energy levels maxed.',
    '🍽️ That was a good meal.',
    '🍽️ You\'re glowing.',
    '🍽️ Ready to conquer work again.'
  ],
  breakStarted: [
    '🍽️ Food quest started. Go eat like a king 👑',
    '🍽️ Deploying stomach protocol.',
    '🍽️ Calories loading…',
    '🍽️ May your meal be delicious.',
    '🍽️ Eating buff incoming 💪',
    '🍽️ Time to feast.',
    '🍽️ Lunch mode activated.',
    '🍽️ Hunger detected.',
    '🍽️ Off to the kitchen.',
    '🍽️ Chow time.'
  ],
  overtimeWarning: [
    '🍽️ That\'s a 5-course meal now 👀',
    '🍽️ Did you order dessert too?',
    '🍽️ You eating or catering a wedding?',
    '🍽️ That kitchen miss you yet?',
    '🍽️ Time to put down the fork.',
    '🍽️ Still chewing?',
    '🍽️ That\'s a long lunch.',
    '🍽️ The food coma is coming.',
    '🍽️ Don\'t fall asleep at the table.',
    '🍽️ Let\'s head back.'
  ],
  limitReached: [
  '🛑 That’s enough food for today, champ 😆',
  '🛑 You’ve officially eaten your way to the limit.',
  '🛑 No more meal breaks — the kitchen is judging you 👀',
  '🛑 That stomach is already working overtime.',
  '🛑 You’ve used all your food tokens 🍔',
  '🛑 The fridge has cut you off.',
  '🛑 You’re full… emotionally and physically.',
  '🛑 That’s it, Gordon Ramsay.',
  '🛑 Even the snacks are saying no now.',
  '🛑 Save some food for tomorrow, legend.'
],
  cancelled: [
  '❌ Food break cancelled. The meal never existed 👻',
  '❌ Calories deleted.',
  '❌ That plate just vanished.',
  '❌ Hunger reset successful 🔄',
  '❌ The kitchen closed on you.',
  '❌ Your food order has been un-ordered.',
  '❌ The feast has been cancelled.',
  '❌ Snack privileges revoked.',
  '❌ That bite was just a dream 😴',
  '❌ Meal erased from history.'
]
};

const BREAK_SARCASM = {
  wc: WC_SARCASM,
  bwc: BWC_SARCASM,
  cy: CY_SARCASM,
  'cf+1': CF_SARCASM,
  'cf+2': CF_SARCASM,
  'cf+3': CF_SARCASM
};

// Invalid code sarcasm (light roast edition)
const INVALID_CODE_SARCASM = [
  '❓ Bro… that is not even close 😂 Try: wc, cy, bwc, cf+1, cf+2, cf+3',
  '❓ I admire the confidence, but that code is wrong 😏',
  '❓ That\'s not a break code — that\'s a cry for help 😆',
  '❓ You typed something… just not something useful 🫠',
  '❓ My AI soul felt that typo 😭 Try a real code!',
  '❓ Are you summoning a demon or starting a break? 👀',
  '❓ Nice keyboard mash. Now try a real code 😌',
  '❓ That ain\'t it, chief 🤏 Try: wc, cy, bwc, cf+1, cf+2, cf+3',
  '❓ I would understand that… if it were correct 😏',
  '❓ That input belongs in the blooper reel 🎬 Try again!',
  '❓ Are you typing with boxing gloves on? 🥊😆',
  '❓ That code slipped, tripped, and fell down the stairs 😂',
  '❓ Even autocorrect gave up on that one 😭',
  '❓ I see what you were *trying* to do… but no 😌',
  '❓ That’s not a break code, that’s abstract art 🎨',
  '❓ Did your cat walk across the keyboard? 🐈‍⬛⌨️',
  '❓ So close… actually no, not close at all 😆',
  '❓ I ran that through my brain twice. Still wrong 🧠❌',
  '❓ That input just punched the wrong buttons 🥊',
  '❓ Respectfully… what was that? 🤨',
  '❓ That code needs glasses 👓 Try again!',
  '❓ Keyboard having a bad day or what? 😅',
  '❓ I’ve seen better inputs in a panic 😭',
  '❓ Bold move. Incorrect, but bold 😏'
];

// Helper function to get random sarcasm by break type and message type
function getRandomSarcasm(breakCode, messageType) {
  // Validate breakCode
  if (!breakCode || !BREAK_SARCASM[breakCode]) {
    Logger.log('⚠️ Invalid break code: ' + breakCode);
    return INVALID_CODE_SARCASM[Math.floor(Math.random() * INVALID_CODE_SARCASM.length)];
  }
  
  const sarcasm = BREAK_SARCASM[breakCode];
  if (!sarcasm || !sarcasm[messageType]) {
    Logger.log('⚠️ Missing message type "' + messageType + '" for break code "' + breakCode + '"');
    return `Missing ${messageType} message for ${breakCode}`;
  }
  const messages = sarcasm[messageType];
  return messages[Math.floor(Math.random() * messages.length)];
}

// === AUTO PUNCH BACK FOR OVERTIME BREAKS ===
function autoPunchBackOvertime() {
  const liveSheet = getOrCreateSheet(LIVE_BREAKS_SHEET);
  const logSheet = getOrCreateSheet(PUNCH_LOG_SHEET);
  const now = new Date();
  const today = (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear();
  
  // Format time as HH:MM:SS (same format as in processBreak)
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const currentTimeStr = hours + ':' + minutes + ':' + seconds;
  
  Logger.log('=== AUTO PUNCH CHECK ===');
  Logger.log('Today: ' + today);
  Logger.log('Current Time: ' + currentTimeStr);
  
  const data = liveSheet.getDataRange().getValues();
  Logger.log('Total rows in Live Breaks: ' + data.length);
  
  let foundBreaks = 0;
  let autoPunched = 0;
  let rowsToDelete = [];
  
  // Find all open breaks
  for (let i = data.length - 1; i >= 1; i--) { // Skip header (i=0)
    const rowDate = String(data[i][0]); // DATE column
    const rowStatus = String(data[i][5]); // STATUS column (index 5 = column 6)
    
    if (rowDate === today && rowStatus === 'ON BREAK') {
      foundBreaks++;
      
      const username = data[i][2]; // NAME (col 3, index 2)
      const breakCode = data[i][3]; // BREAK_CODE (col 4, index 3)
      const breakStartTime = String(data[i][1]); // TIME (col 2, index 1)
      const expectedDuration = parseInt(data[i][4]); // EXPECTED_DURATION (col 5, index 4)
      const chatId = data[i][6]; // CHAT_ID (col 7, index 6)
      
      Logger.log('Found break: ' + username + ' - ' + breakCode + ' (started: ' + breakStartTime + ')');
      
      // Calculate elapsed time using HH:MM:SS format
      const startParts = breakStartTime.split(':');
      const startHours = parseInt(startParts[0]);
      const startMinutes = parseInt(startParts[1]);
      const startSeconds = parseInt(startParts[2] || 0);
      
      const currentHours = parseInt(hours);
      const currentMinutes = parseInt(minutes);
      const currentSeconds = parseInt(seconds);
      
      // Convert both times to seconds for accurate calculation
      const startTotalSeconds = startHours * 3600 + startMinutes * 60 + startSeconds;
      const currentTotalSeconds = currentHours * 3600 + currentMinutes * 60 + currentSeconds;
      let elapsedSeconds = currentTotalSeconds - startTotalSeconds;
      
      // Handle day wrap-around (if current time < start time, break went past midnight)
      if (elapsedSeconds < 0) {
        elapsedSeconds += 86400; // 24 hours in seconds
      }
      
      let elapsedMinutes = Math.round(elapsedSeconds / 60);
      
      Logger.log('  Start: ' + breakStartTime + ' | Current: ' + currentTimeStr + ' | Elapsed: ' + elapsedMinutes + ' min');
      Logger.log('  Expected: ' + expectedDuration + ' min | Grace Period: 5 min | Total allowed: ' + (expectedDuration + 5) + ' min');
      
      // If exceeded by 5 minutes, auto-punch back
      if (elapsedMinutes > expectedDuration + 5) {
        autoPunched++;
        const returnTime = currentTimeStr;
        
        Logger.log('  ⚠️ AUTO PUNCHING! Over by ' + (elapsedMinutes - expectedDuration) + ' min');
        
        // Add to Punch Logs
        const newRow = logSheet.getLastRow() + 1;
        logSheet.getRange(newRow, 1).setValue(today).setNumberFormat('@');
        logSheet.getRange(newRow, 2).setValue(String(breakStartTime)).setNumberFormat('@');
        logSheet.getRange(newRow, 3).setValue(username).setNumberFormat('@');
        logSheet.getRange(newRow, 4).setValue(breakCode).setNumberFormat('@');
        logSheet.getRange(newRow, 5).setValue(elapsedMinutes).setNumberFormat('@'); // TIME_SPENT
        logSheet.getRange(newRow, 6).setValue(returnTime).setNumberFormat('@');
        logSheet.getRange(newRow, 7).setValue('⚠️ AUTO PUNCHED').setNumberFormat('@');
        logSheet.getRange(newRow, 8).setValue(String(chatId)).setNumberFormat('@');
        
        // Mark for deletion from Live Breaks (delete later to avoid index issues)
        rowsToDelete.push(i + 1);
        
        // Send warning message
        const warningMsg = `👤 @${username}\n\n${getRandomSarcasm(breakCode, 'overtimeWarning')}\n\n${breakCode.toUpperCase()}\n⏱️ Expected: ${expectedDuration}min\n📊 Actual: ${elapsedMinutes}min\n🚨 Over by ${elapsedMinutes - expectedDuration}min`;
        
        if (chatId) {
          Logger.log('  Sending message to chat: ' + chatId);
          sendTelegramMessage(chatId, warningMsg);
        }
      }
    }
  }
  
  // Delete rows in reverse order to maintain correct indices
  rowsToDelete.forEach(rowNum => {
    liveSheet.deleteRow(rowNum);
  });
  
  Logger.log('Summary: Found ' + foundBreaks + ' breaks, Auto-punched ' + autoPunched);
}

// === MAIN WEBHOOK HANDLER ===
function doPost(e) {
  try {
    const update = JSON.parse(e.postData.contents);
    
    if (!update.message) {
      return HtmlService.createHtmlOutput('ok');
    }

    const message = update.message;
    const text = (message.text || '').toLowerCase().trim();
    const chatId = message.chat.id;
    const userId = message.from.id;
    // Use actual name instead of username handle
    const firstName = message.from.first_name || '';
    const lastName = message.from.last_name || '';
    const username = (firstName + ' ' + lastName).trim() || message.from.username || 'Anonymous';
    const messageId = message.message_id;

    Logger.log('📬 Telegram message: ' + text + ' from ' + username);

    // Check for punch back keywords first
    if (BACK_KEYWORDS.includes(text)) {
      const result = handlePunchBack(username, chatId);
      if (result.success) {
        const response = `👤 @${username}\n\n${getRandomSarcasm(result.breakCode, 'welcomeBack')}\n\n${result.message}`;
        sendTelegramMessage(chatId, response);
      } else {
        sendTelegramMessage(chatId, `👤 @${username}\n\n${result.message}`);
      }
      return HtmlService.createHtmlOutput('ok');
    }

    // Parse break code
    const breakCode = parseBreakCode(text);

    if (breakCode === 'cancel') {
      handleCancel(username, chatId, 0);
      return HtmlService.createHtmlOutput('ok');
    }

    if (!breakCode) {
      const invalidMsg = INVALID_CODE_SARCASM[Math.floor(Math.random() * INVALID_CODE_SARCASM.length)];
      sendTelegramMessage(chatId, `👤 @${username}\n\n${invalidMsg}`);
      return HtmlService.createHtmlOutput('ok');
    }

    // Process break directly
    const result = processBreak(username, breakCode, userId, chatId);
    if (result.success) {
      const response = `👤 @${username}\n\n${getRandomSarcasm(breakCode, 'breakStarted')}\n\n⏱️ ${BREAKS[breakCode].name} (${BREAKS[breakCode].duration} min)\n📊 ${result.message}`;
      sendTelegramMessage(chatId, response);
    } else {
      const response = `👤 @${username}\n\n${result.message}`;
      sendTelegramMessage(chatId, response);
    }

    return HtmlService.createHtmlOutput('ok');
  } catch (error) {
    Logger.log('Error: ' + error);
    return HtmlService.createHtmlOutput('error: ' + error);
  }
}

// === PARSE BREAK CODE ===
function parseBreakCode(text) {
  // Remove extra spaces and normalize to lowercase
  const cleanText = text.trim().toLowerCase();
  
  // Check for cancel keywords (exact match only)
  if (['c', 'cancel', 'reset'].includes(cleanText)) {
    return 'cancel';
  }
  
  // Sort break codes by length (longest first) to match longer codes before shorter ones
  // This prevents 'wc' from matching inside 'bwc'
  const sortedCodes = Object.keys(BREAKS).sort((a, b) => b.length - a.length);
  
  for (const code of sortedCodes) {
    const cleanCode = code.toLowerCase();
    
    // EXACT MATCH ONLY: Check if the entire text equals the break code
    // This prevents "bwc+3", "bwcx3", or "bwc cy" from matching
    if (cleanText === cleanCode) {
      return code;
    }
  }
  
  return null;
}

// === PROCESS BREAK ===
function processBreak(username, breakCode, userId, chatId) {
  const liveSheet = getOrCreateSheet(LIVE_BREAKS_SHEET);
  const now = new Date();
  // Format date as M/D/YYYY (e.g., "1/26/2026")
  const today = (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear();
  // Format time as HH:MM:SS (e.g., "15:30:45")
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timeStr = hours + ':' + minutes + ':' + seconds;
  
  const breakConfig = BREAKS[breakCode];
  
  Logger.log('=== PROCESS BREAK ===');
  Logger.log('Username: ' + username + ' | Break: ' + breakCode + ' | Today: ' + today + ' | Time: ' + timeStr);
  
  // Check if user already has an active break in Live Breaks
  const data = liveSheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) { // Skip header
    const rowDate = String(data[i][0]);
    const rowUser = String(data[i][2]);
    const rowStatus = String(data[i][5]); // STATUS is at column 6 (index 5) in Live_Breaks
    
    Logger.log('Checking row ' + (i+1) + ': rowDate="' + rowDate + '" vs today="' + today + '" | Status="' + rowStatus + '"');
    
    if (rowDate === today && rowUser === username && rowStatus === 'ON BREAK') {
      const activeBreakCode = data[i][3];
      const activeBreakStart = data[i][1];
      
      Logger.log('Found active break! ' + activeBreakCode);
      
      return {
        success: false,
        message: `🤨 You already have an active break!\n\nActive: ${activeBreakCode} (${activeBreakStart})\n\nType "back" to close it first!`
      };
    }
  }
  
  // Check daily limit from Punch Log
  const logSheet = getOrCreateSheet(PUNCH_LOG_SHEET);
  const logData = logSheet.getDataRange().getValues();
  const userTodayBreaks = logData.filter((row, idx) => {
    return idx > 0 && String(row[0]) === today && String(row[2]) === username && String(row[3]) === breakCode;
  }).length;
  
  const limitReached = userTodayBreaks >= breakConfig.dailyLimit;
  Logger.log('Daily limit check: ' + userTodayBreaks + '/' + breakConfig.dailyLimit);

  // Log the break to Live Breaks - FORCE ALL AS TEXT, NO AUTO-FORMAT
  const newRow = liveSheet.getLastRow() + 1;
  Logger.log('Adding break to row ' + newRow);
  // Live Breaks columns: DATE(1), TIME(2), NAME(3), BREAK_CODE(4), EXPECTED_DURATION(5), STATUS(6), CHAT_ID(7)
  liveSheet.getRange(newRow, 1).setValue(today).setNumberFormat('@');  
  liveSheet.getRange(newRow, 2).setValue(timeStr).setNumberFormat('@');  
  liveSheet.getRange(newRow, 3).setValue(username).setNumberFormat('@');
  liveSheet.getRange(newRow, 4).setValue(breakCode).setNumberFormat('@');
  liveSheet.getRange(newRow, 5).setValue(breakConfig.duration).setNumberFormat('@');
  liveSheet.getRange(newRow, 6).setValue('ON BREAK').setNumberFormat('@');  
  liveSheet.getRange(newRow, 7).setValue(String(chatId)).setNumberFormat('@');
  
  Logger.log('✅ Break added to Live Breaks');

  // Return response with limit warning if applicable
  let message = `Status: OK | ${userTodayBreaks + 1}/${breakConfig.dailyLimit} used today`;
  if (limitReached) {
    message = `${getRandomSarcasm(breakCode, 'limitReached')}`;
  }

  return {
    success: true,
    message: message
  };
}


// === HANDLE PUNCH BACK ===
function handlePunchBack(username, chatId) {
  const liveSheet = getOrCreateSheet(LIVE_BREAKS_SHEET);
  const logSheet = getOrCreateSheet(PUNCH_LOG_SHEET);
  
  Logger.log('=== PUNCH BACK DEBUG ===');
  Logger.log('Live Breaks Sheet ID: ' + liveSheet.getSheetId());
  Logger.log('Live Breaks Sheet Name: ' + liveSheet.getName());
  Logger.log('Punch Log Sheet ID: ' + logSheet.getSheetId());
  Logger.log('Punch Log Sheet Name: ' + logSheet.getName());
  
  const now = new Date();
  const today = (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timeStr = hours + ':' + minutes + ':' + seconds;
  
  Logger.log('=== PUNCH BACK HANDLER ===');
  Logger.log('Username: ' + username);
  Logger.log('Today: ' + today);
  Logger.log('Current Time: ' + timeStr);
  
  const data = liveSheet.getDataRange().getValues();
  Logger.log('Total rows in Live Breaks: ' + data.length);
  
  // Log all rows for debugging
  for (let i = 1; i < data.length; i++) {
    Logger.log('Row ' + (i+1) + ': DATE=' + data[i][0] + ' | TIME=' + data[i][1] + ' | USER=' + data[i][2] + ' | CODE=' + data[i][3] + ' | STATUS=' + data[i][6]);
  }
  
  // Find last open break for this user today
  for (let i = data.length - 1; i >= 1; i--) { // Skip header
    const rowDate = String(data[i][0]);
    const rowUser = String(data[i][2]);
    const rowStatus = String(data[i][5]); // STATUS is column 6 (index 5) in Live_Breaks (7 columns total)
    
    Logger.log('Checking row ' + (i+1) + ': Date="' + rowDate + '" vs "' + today + '" | User="' + rowUser + '" vs "' + username + '" | Status="' + rowStatus + '"');
    
    if (rowDate === today && rowUser === username && rowStatus === 'ON BREAK') {
      
      Logger.log('✅ FOUND MATCHING BREAK AT ROW ' + (i+1));
      
      // Calculate duration
      const breakStartTime = data[i][1];
      const expectedDuration = data[i][4]; // EXPECTED_DURATION is at index 4 in Live_Breaks
      const breakCode = data[i][3];
      
      const start = new Date('1970/01/01 ' + breakStartTime);
      const end = new Date('1970/01/01 ' + timeStr);
      let actualMinutes = Math.round((end - start) / 60000);
      
      // Ensure actualMinutes is valid and at least 0
      if (isNaN(actualMinutes) || actualMinutes < 0) {
        actualMinutes = 0;
      }
      
      // Add to Punch Log
      const newRow = logSheet.getLastRow() + 1;
      Logger.log('🔵 Adding row to PUNCH LOG at row ' + newRow);
      let status, message;
      
      if (actualMinutes > expectedDuration) {
        const overTime = actualMinutes - expectedDuration;
        status = '⚠️ OVER TIME';
        message = `Over by ${overTime} min`;
      } else {
        status = '✅ OK';
        message = '';
      }
      
      // Punch Logs columns: DATE(1), TIME_START(2), NAME(3), BREAK_CODE(4), TIME_SPENT(5), TIME_END(6), STATUS(7), CHAT_ID(8)
      logSheet.getRange(newRow, 1).setValue(today).setNumberFormat('@');
      logSheet.getRange(newRow, 2).setValue(String(breakStartTime)).setNumberFormat('@');
      logSheet.getRange(newRow, 3).setValue(username).setNumberFormat('@');
      logSheet.getRange(newRow, 4).setValue(breakCode).setNumberFormat('@');
      logSheet.getRange(newRow, 5).setValue(actualMinutes).setNumberFormat('@'); // TIME_SPENT
      logSheet.getRange(newRow, 6).setValue(timeStr).setNumberFormat('@');
      logSheet.getRange(newRow, 7).setValue(status).setNumberFormat('@');
      logSheet.getRange(newRow, 8).setValue(String(chatId)).setNumberFormat('@');
      Logger.log('✅ Data written to Punch Log row ' + newRow);
      Logger.log('   Status="' + status + '" | Message="' + message + '"');
      
      // Delete from Live Breaks
      Logger.log('🔴 Attempting to delete row ' + (i + 1) + ' from Live Breaks (sheet: ' + liveSheet.getName() + ')');
      liveSheet.deleteRow(i + 1);
      Logger.log('✅ Row ' + (i + 1) + ' deleted from Live Breaks');
      
      // Prepare response
      if (actualMinutes > expectedDuration) {
        const overTime = actualMinutes - expectedDuration;
        Logger.log('📊 OVERTIME: Expected ' + expectedDuration + 'min, Actual ' + actualMinutes + 'min, Over by ' + overTime + 'min');
        return {
          success: false,
          breakCode: breakCode,
          message: `${getRandomSarcasm(breakCode, 'overtimeWarning')}\n\n⏱️ Expected: ${expectedDuration}min\n📊 Actual: ${actualMinutes}min\n🚨 Over by ${overTime}min!`
        };
      } else {
        const remaining = expectedDuration - actualMinutes;
        Logger.log('✅ OK: Expected ' + expectedDuration + 'min, Actual ' + actualMinutes + 'min');
        return {
          success: true,
          breakCode: breakCode,
          message: `⏱️ Expected: ${expectedDuration}min\n📊 Actual: ${actualMinutes}min\n${remaining > 0 ? `(${remaining}min under)` : ''}`
        };
      }
    }
  }
  
  Logger.log('❌ NO MATCHING BREAK FOUND');
  const noBreakMessages = [
    '👀 You can\'t come back if you never left.',
    '🤔 You\'re not on a break right now, chief.',
    '🧙 You can\'t end a spell you never cast.',
    '📡 No break signal detected.',
    '🕵️ I checked everywhere… no active break found.',
    '🚪 That door was never opened.',
    '🫠 You\'re speedrunning nothing.',
    '🎬 You skipped the intro scene.',
    '🧠 Even the AI is confused right now.',
    '💪 Type a break code first: wc, cy, bwc, cf+1, cf+2, cf+3'
  ];
  return {
    success: false,
    message: noBreakMessages[Math.floor(Math.random() * noBreakMessages.length)],
    breakCode: null
  };
}

// === HANDLE CANCELLATION ===
function handleCancel(username, chatId, userId) {
  const liveSheet = getOrCreateSheet(LIVE_BREAKS_SHEET);
  const now = new Date();
  const today = (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear();
  
  Logger.log('=== CANCEL ===');
  Logger.log('Username: ' + username + ' | Today: ' + today);
  
  const data = liveSheet.getDataRange().getValues();
  
  // Find last entry for this user today in Live Breaks
  for (let i = data.length - 1; i >= 1; i--) { // Skip header
    const rowDate = String(data[i][0]);
    const rowUser = String(data[i][2]);
    const breakCode = String(data[i][3]);
    
    if (rowDate === today && rowUser === username) {
      Logger.log('Found break to cancel: ' + breakCode);
      liveSheet.deleteRow(i + 1);
      const message = `👤 @${username}\n\n${getRandomSarcasm(breakCode, 'cancelled')}`;
      sendTelegramMessage(chatId, message);
      return;
    }
  }
  
  Logger.log('No break found to cancel');
  sendTelegramMessage(chatId, `👤 @${username}\n\n⚠️ No entry to cancel today!`);
}

// === SEND TELEGRAM MESSAGE ===
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

// === DAILY REPORT (8 PM) ===
function normalizeDate(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'M/d/yyyy');
  }
  return String(value).trim();
}

function dailyReport() {
  const logSheet = getOrCreateSheet(PUNCH_LOG_SHEET);
  const now = new Date();
  const today = Utilities.formatDate(now, Session.getScriptTimeZone(), 'M/d/yyyy');
  
  Logger.log('=== DAILY REPORT ===');
  Logger.log('Today: ' + today);
  
  const data = logSheet.getDataRange().getValues();
  const todayRecords = data.slice(1).filter(row => normalizeDate(row[0]) === today);

  Logger.log('Today records found: ' + todayRecords.length);

  if (todayRecords.length === 0) {
    Logger.log('No breaks recorded today');
    return;
  }

  // Count total breaks by type and find leaders
  const breakTypeCounts = { wc: 0, cy: 0, bwc: 0 };
  const breakTypeLeaders = { wc: { user: '', count: 0 }, cy: { user: '', count: 0 }, bwc: { user: '', count: 0 } };
  const userBreakCounts = {};
  
  todayRecords.forEach(row => {
    const username = String(row[2]); // NAME
    const breakCode = String(row[3]); // BREAK_CODE
    
    // Only count wc, cy, bwc (skip meal breaks cf+1, cf+2, cf+3)
    if (breakCode !== 'cf+1' && breakCode !== 'cf+2' && breakCode !== 'cf+3') {
      // Count total by type
      breakTypeCounts[breakCode]++;
      
      // Track user counts for leaderboard
      if (!userBreakCounts[username]) {
        userBreakCounts[username] = { wc: 0, cy: 0, bwc: 0 };
      }
      userBreakCounts[username][breakCode]++;
      
      // Update leaders
      if (userBreakCounts[username][breakCode] > breakTypeLeaders[breakCode].count) {
        breakTypeLeaders[breakCode] = { user: username, count: userBreakCounts[username][breakCode] };
      }
    }
  });

  // Build report
  let report = `📊 *DAILY REPORT - ${today}*\n\n`;
  
  // Total break counts
  report += `*📊 TOTAL BREAKS TODAY:*\n`;
  if (breakTypeCounts.wc > 0) report += `🚽 WC: ${breakTypeCounts.wc}x\n`;
  if (breakTypeCounts.cy > 0) report += `🚬 CY: ${breakTypeCounts.cy}x\n`;
  if (breakTypeCounts.bwc > 0) report += `💩 BWC: ${breakTypeCounts.bwc}x\n`;
  
  report += `\n*🏆 LEADERBOARD:*\n`;
  
  if (breakTypeLeaders.bwc.user) {
    report += `💩 King of Poop (BWC): @${breakTypeLeaders.bwc.user}\n`;
  }
  
  if (breakTypeLeaders.wc.user) {
    report += `🚽 King of Pee (WC): @${breakTypeLeaders.wc.user}\n`;
  }
  
  if (breakTypeLeaders.cy.user) {
    report += `🚬 King of Smoke (CY): @${breakTypeLeaders.cy.user}\n`;
  }

  // Send to all chat IDs from today's records only
  const chatIds = new Set(
    todayRecords
      .map(row => row[7]) // CHAT_ID is at index 7
      .filter(id => id && id !== 'CHAT_ID')
  );
  chatIds.forEach(chatId => {
    try {
      Logger.log('Sending report to chat: ' + chatId);
      sendTelegramMessage(chatId, report);
    } catch (e) {
      Logger.log('Daily report failed for chatId ' + chatId + ': ' + e);
    }
  });
}

// === HEALTH CHECK (GET) ===
function doGet(e) {
  return ContentService.createTextOutput('ok');
}

// === MONTHLY MIGRATION ===
function monthlyMigration() {
  const today = new Date();
  
  if (today.getDate() !== 1) return; // Only run on 1st of month
  
  Logger.log('=== MONTHLY MIGRATION ===');
  Logger.log('Creating archive for previous month');
  
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const logSheet = getOrCreateSheet(PUNCH_LOG_SHEET);
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const monthYear = (previousMonth.getMonth() + 1) + '/' + previousMonth.getFullYear();
  const archiveName = monthYear + ' Archive';
  
  // Create archive sheet for previous month's log
  const archiveSheet = spreadsheet.insertSheet(archiveName, 0);
  Logger.log('Created archive sheet: ' + archiveName);
  
  // Copy headers (8 columns for Punch_Logs)
  const headerRow = logSheet.getRange(1, 1, 1, 8);
  archiveSheet.getRange(1, 1, 1, 8).setValues(headerRow.getValues());
  
  // Copy all data from Punch Log to archive
  const dataRange = logSheet.getDataRange();
  if (dataRange.getLastRow() > 1) {
    const dataValues = logSheet.getRange(2, 1, dataRange.getLastRow() - 1, 8).getValues();
    archiveSheet.getRange(2, 1, dataValues.length, 8).setValues(dataValues);
    Logger.log('Copied ' + dataValues.length + ' rows to archive');
  }
  
  // Clear Punch Log for new month (keep header)
  if (logSheet.getLastRow() > 1) {
    logSheet.deleteRows(2, logSheet.getLastRow() - 1);
    Logger.log('Cleared Punch_Logs for new month');
  }
}

// === SETUP TRIGGERS ===
function setupTriggers() {
  // Set spreadsheet timezone to Dubai (Asia/Dubai)
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  spreadsheet.setSpreadsheetTimeZone('Asia/Dubai');
  Logger.log('Spreadsheet timezone set to Dubai (Asia/Dubai)');
  
  // Remove old triggers
  ScriptApp.getProjectTriggers().forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
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
  
  Logger.log('All triggers set up successfully (including queue processor)!');
}

// === SET SPREADSHEET TIMEZONE ===
function setDubaiTimezone() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  spreadsheet.setSpreadsheetTimeZone('Asia/Dubai');
  Logger.log('✓ Spreadsheet timezone changed to Dubai (Asia/Dubai, UTC+4)');
}

// === SET SCRIPT PROPERTIES ===
function setScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  
  // Set your values here
  props.setProperty('SHEET_ID', '10LrFNOEzkm3zQJZtD7s6hyue-diAQLhaT3F-u6P4WEk');
  props.setProperty('BOT_TOKEN', '7801885152:AAGsKQLxwdW8wnw541DEX-LcQMsgsWZhF4A');
  
  Logger.log('Properties set successfully!');
  Logger.log('SHEET_ID: ' + props.getProperty('SHEET_ID'));
  Logger.log('BOT_TOKEN: ' + props.getProperty('BOT_TOKEN').substring(0, 10) + '...');
}

// === INITIAL SETUP ===
// Triggers are set up by calling setupTriggers() from Apps Script editor
// No need for onOpen() as it requires additional permissions
//
// TO DEPLOY:
// 1. Run setupTriggers() to initialize time-based automations
// 2. Deploy as Web App (Execute as: Your account, Who has access: Anyone)
// 3. Set Telegram webhook to the deployment URL
// 4. Test with Telegram commands (wc, back, c, etc.)
// ============================================
