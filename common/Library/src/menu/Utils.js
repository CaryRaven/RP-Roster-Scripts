/**
 * Get the sheet based on sheet ID.
 * @param {Number} sheet_id - ID of the sheet
 * @param {String} spreadsheetId - (Optional) ID of the spreadsheet. if none provided: default LIBRARY_SETTINGS.rosterIds[0]
 * @returns {Spreadsheet.Sheet} The found sheet
 */
function getCollect(sheet_id, spreadsheetId = null) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (typeof sheet_id != "number") throw new Error("No valid sheet id provided");

  if (!sheet_id) sheet_id = LIBRARY_SETTINGS.rosterIds[0];
  const wb = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.openById(LIBRARY_SETTINGS.spreadsheetId_main);
  return wb.getSheets().find(sheet => sheet.getSheetId() === sheet_id);
}

/**
* Extract all user's data located on rosters using a query (has to be a gmail address)
* Only gets data from last roster, multiple positions not possible
* @param {String} query - Gmail address of the targeted staff member
* @param {Number} colToSearch - Column on the roster to search for query (default: LIBRARY_SETTINGS.dataCols.email)
* @param {Boolean} stringify
* @returns {Object}
*/
function getUserData(query, colToSearch = null, stringify = false) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!LIBRARY_SETTINGS) throw new Error("getUserData: No settings provided");
  if (!query || typeof query != "string") throw new Error("getUserData: No valid query provided");

  let data = {};

  LIBRARY_SETTINGS.rosterIds.forEach((rosterId, index) => {
    if (index === LIBRARY_SETTINGS.rosterIds.length - 1) return;
    const s = getCollect(rosterId);
    const r = s.getRange(LIBRARY_SETTINGS.firstMemberRow, colToSearch ? colToSearch : LIBRARY_SETTINGS.dataCols.email, s.getMaxRows(), 1).getValues();

    r.forEach((searchValue, i) => {
      searchValue = searchValue[0];
      i = i + LIBRARY_SETTINGS.firstMemberRow;
      if (searchValue == query) {

        data = {
          row: i,
          rank: s.getRange(i, LIBRARY_SETTINGS.dataCols.rank).getValue(),
          name: s.getRange(i, LIBRARY_SETTINGS.dataCols.name).getValue(),
          playerId: s.getRange(i, LIBRARY_SETTINGS.dataCols.playerId).getValue(),
          discordId: s.getRange(i, LIBRARY_SETTINGS.dataCols.discordId).getValue(),
          email: s.getRange(i, LIBRARY_SETTINGS.dataCols.email).getValue(),
          infractions: s.getRange(i, LIBRARY_SETTINGS.dataCols.infraction).getDisplayValue(),
          status: s.getRange(i, LIBRARY_SETTINGS.dataCols.status).getDisplayValue(),
          loaEnd: s.getRange(i, LIBRARY_SETTINGS.dataCols.loaEnd).getDisplayValue(),
          blacklistEnd: s.getRange(i, LIBRARY_SETTINGS.dataCols.blacklistEnd).getDisplayValue(),
          notes: s.getRange(i, LIBRARY_SETTINGS.dataCols.notes).getValue(),

          // Only used on certain rosters
          specialization: s.getRange(i, LIBRARY_SETTINGS.dataCols.specialization).getValue(),

          // Only used on staff roster
          // 0 = Staff Admin, 1 = Server Staff, 2 = Discord Staff & 3 = DMs & 4 = CL
          branch: s.getRange(i, LIBRARY_SETTINGS.dataCols.rank).getValue() == "Community Leadership" ? 4 : index,
          cooldown: s.getRange(i, LIBRARY_SETTINGS.dataCols.cooldown).getDisplayValue(),
          supervisor_name: s.getRange(i, LIBRARY_SETTINGS.dataCols.supervisor_name).getValue(),
          supervisor_playerId: s.getRange(i, LIBRARY_SETTINGS.dataCols.supervisor_playerId).getValue()
        };

      }
    });
  });

  if (stringify) { return JSON.stringify(data); } else { return data; }
}

/**
* @param {String} rank - Name of rank to get the last row of
* @param {Number} branch - Branch to search the rank in (range between 0 & 3)
*/
function getLastRankRow(rank, branch = 0) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!rank || typeof rank != "string") throw new Error("GetLastRankRow: No valid rank provided");

  // Abstractify branch (rosterIds.length - 1)
  branch = branch == 4 ? 0 : branch;
  if ((branch - 1) > LIBRARY_SETTINGS.rosterIds.length) branch = LIBRARY_SETTINGS.rosterIds.length - 1;

  const sheet = getCollect(LIBRARY_SETTINGS.rosterIds[Math.round(Number(branch))]);
  const total_rows = sheet.getMaxRows();
  
  for (let i = 2; i <= total_rows; i++) {
    // Check if current row != rank but previous row == rank
    if (sheet.getRange(i - 1, LIBRARY_SETTINGS.dataCols.rank).getValue() == rank && sheet.getRange(i, LIBRARY_SETTINGS.dataCols.rank).getValue() != rank) return i - 1;
  }
}

/**
* Gets first row of a rank, regardless if it is occupied or not
* @param {String} rank - Name of rank to get the start row of
* @param {Number} branch - Branch to search the rank in (range between 0 & 3)
*/
function getStartRankRow(rank, branch = 0) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!rank || typeof rank != "string") throw new Error("GetLastRankRow: No valid rank provided");

  branch = branch == 4 ? 0 : branch;
  if ((branch - 1) > LIBRARY_SETTINGS.rosterIds.length) branch = LIBRARY_SETTINGS.rosterIds.length - 1;

  const sheet = getCollect(LIBRARY_SETTINGS.rosterIds[Math.round(Number(branch))]);
  const total_rows = sheet.getMaxRows();

  for (let i = 1; i <= total_rows; i++) {
    if (sheet.getRange(i, LIBRARY_SETTINGS.dataCols.rank).getValue() == rank) return i;
  }
}

/**
 * Gets the first row in a given branch's roster with the specified rank and an empty Steam ID.
 *
 * @param {string} rank The rank to search for.
 * @param {number} branch The branch number (default: 0).
 * @returns {[number, GoogleAppsScript.Spreadsheet.Sheet]} An array containing the row number and sheet,
 *                                                          or [0, sheet] if no matching row is found.
 * @throws {Error} If the library is not initialized or if the rank is invalid.
 */
function getFirstRankRow(rank, branch = 0) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (typeof rank != "string") throw new Error("GetLastRankRow: No rank valid provided");

  branch = branch == 4 ? 0 : branch;
  if ((branch - 1) > LIBRARY_SETTINGS.rosterIds.length) branch = LIBRARY_SETTINGS.rosterIds.length - 1;

  const sheet = getCollect(LIBRARY_SETTINGS.rosterIds[Math.round(branch)]);
  const total_rows = sheet.getMaxRows();

  for (let i = LIBRARY_SETTINGS.dataCols.firstReqRow; i <= total_rows; i++) {
    // Check if col D = rank & playerId isn't empty
    if (sheet.getRange(i, LIBRARY_SETTINGS.dataCols.rank, 1, 1).getValue() === rank && sheet.getRange(i, LIBRARY_SETTINGS.dataCols.playerId, 1, 1).getValue() === '') {
      return [i, sheet];
    }
  }

  return [0, sheet];
}

/**
* Get the last row where the date has not yet been logged
* @param {Object} [LIBRARY_SETTINGS] - Only required if using sheetId
* @param {Object} [sheetObject] - Sheet object (use getCollect() to extract this object using sheet ID)
* @param {Number} [sheetId] - If a sheetObject is specified, sheetId is redundant
*/
function getLastRow(sheetObject = null, sheetId = 0) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (typeof sheetId != "number") throw new Error("No valid sheet id: sheetId has to be an integer");

  const sheet = sheetObject ? sheetObject : getCollect(sheetId);
  for (let r = 6; r <= sheet.getMaxRows(); r++) {
    if (sheet.getRange(r, 3).getValue() == '') {
      return r;
    }
  }
  return 7;
}

/**
 * Convert any date into milliseconds
 * @param {String} dateString
 * @returns {Number}
 */
function dateToMilliseconds(dateString) {
  if (!isInit) throw new Error("Library is not yet initialized");
  dateString = dateString.toString();
  if (typeof dateString != "string") throw new Error("dateString has to be a string");

  const parts = dateString.split("/");
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  // months are 0-indexed
  const date = new Date(year, month - 1, day);
  return date.getTime();
}

/**
 * Convert a date from yyyy-mm-dd to dd/mm/yyyy, used so dateToMilliseconds can read dates from HTML
 * @param {String} date - Date formatted as yyyy-mm-dd
 * @returns {String}
 */
function formatDate(date) {
  var parts = date.split("-");
  var formattedDate = parts[2] + "/" + parts[1] + "/" + parts[0];
  return formattedDate.toString();
}

/**
 * Get all email addresses currently stored on all rosters
 */
function getAllEmails() {
  if (!isInit) throw new Error("Library is not yet initialized");

  let emails = [];

  LIBRARY_SETTINGS.rosterIds.forEach((rosterId, i) => {
    if (i === LIBRARY_SETTINGS.rosterIds.length - 1) return;
    const sheet = getCollect(rosterId);
    sheet.getRange(LIBRARY_SETTINGS.firstMemberRow, LIBRARY_SETTINGS.dataCols.email, (sheet.getMaxRows() - LIBRARY_SETTINGS.firstMemberRow), 1).getValues().forEach(email => {
      if (!email[0] || email[0].toLowerCase() == "n/a" || !email[0].includes("@")) return;
      emails.push(email[0].toLowerCase());
    });
  });

  return emails;
}

/**
 * Filters inputData for quotes, to prevent code injection
 * @param {Object} inputData - data that you want to filter
 * @returns {Boolean}
 */
function filterQuotes(inputData) {
  if (!isInit) throw new Error("Library is not yet initialized");

  const values = Object.values(inputData);
  let valid = true;

  values.forEach(value => {
    value = value.toString();
    try {
      if (!value) return;
      if (value.includes('"') || value.includes("'") || value.includes("`") || value.includes("$") || value.includes("{")) valid = false;
    } catch(e) {
      Logger.log(value + " could not be evaluated");
    }
  });

  return valid;
}

/**
 * Use this function in order to load images into the web app
 * @param {Stirng} id - id of the image (open in different window)
 */
function loadImageBytes(id){
  if (!isInit) throw new Error("Library is not yet initialized");

  var bytes = DriveApp.getFileById(id).getBlob().getBytes();
  return Utilities.base64Encode(bytes);
}

/**
 * Helper to collectUnregisteredDocs
 */
function getOwnerEmail(fileOrFolder) {
  try {
    return fileOrFolder.getOwner().getEmail();
  } catch (e) {
    return "Unknown or No Access";
  }
}

/**
 * Time-based function (every 12h) to create a full roster backup, can be manually disabled through web app config
 * Head Function - Not to be used in other scripts
 */
function backupSheet() {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (LIBRARY_SETTINGS.backupEnabled == "false") return;

  const wbBackup = SpreadsheetApp.openById(LIBRARY_SETTINGS.spreadsheetId_backup);
  const wb = SpreadsheetApp.openById(LIBRARY_SETTINGS.spreadsheetId_main);
  const s = getCollect(LIBRARY_SETTINGS.rosterIds[0]);

  s.getRange(10, 1).setValue(LIBRARY_SETTINGS.manualEnabled.toString());

  wbBackup.getSheets().forEach(sheet => {
    try {
      const sheetId = sheet.getSheetId();
      const sourceSheet = wb.getSheetById(sheetId);
      const rows = sourceSheet.getMaxRows();
      const cols = sourceSheet.getMaxColumns();

      const formulas = sourceSheet.getRange(1, 1, rows, cols).getFormulas();
      const values = sourceSheet.getRange(1, 1, rows, cols).getValues();

      // Apply formulas where available, if not apply values
      const finalData = formulas.map((row, rowIndex) =>
        row.map((cell, colIndex) => (cell ? cell : values[rowIndex][colIndex]))
      );

      sheet.getRange(1, 1, rows, cols).setValues(finalData);
      console.log(`Backed ${sheet.getName()} up`);
    } catch(e) {
      console.log(e);
    }
  });
  // TODO: add discord notification
}

function getSizeInBytes(obj) {
  return encodeURIComponent(JSON.stringify(obj)).replace(/%[0-9A-F]{2}/g, "X").length;
}

/**
 * @param {String} title
 * @returns {JSON.Array}
 */
function getRankContent(title) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!title || typeof title !== "string") throw new Error("Invalid title");

  let returnArray = [];
  LIBRARY_SETTINGS.ranks.forEach((rank, i) => {
    if (rank === title) {
      returnArray = [
        rank,
        LIBRARY_SETTINGS.ranks[i + 1],
        LIBRARY_SETTINGS.folders[i].viewerAccess,
        LIBRARY_SETTINGS.folders[i].editorAccess,
        LIBRARY_SETTINGS.interviewRequired[i].toString(),
        LIBRARY_SETTINGS.promoReqs[i],
        LIBRARY_SETTINGS.group[i],
        LIBRARY_SETTINGS.minMeritScore[i]
      ];
    }
  });
  return JSON.stringify(returnArray);
}

/**
 * @param {String} inputValue - playerId that was input into the search bar
 * @returns {JSON.Array}
 */
function getSpreadsheetData(inputValue) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!inputValue || typeof inputValue !== "string") throw new Error("Invalid title");

  // Always Checks Column 8 => might make this configurable in the future
  const sheets = [
    { id: LIBRARY_SETTINGS.sheetId_rankchange, label: "Rank Change" },
    { id: LIBRARY_SETTINGS.sheetId_infraction, label: "Infraction" },
    { id: LIBRARY_SETTINGS.sheetId_loa, label: "LOA Log" },
    { id: LIBRARY_SETTINGS.sheetId_blacklist, label: "Suspension / Blacklist Log" },
  ];

  const results = [];

  sheets.forEach(sheetInfo => {
    const sheet = getCollect(sheetInfo.id);
    const sheetName = sheet.getName();
    try {
      if (!sheet) {
        Logger.log(`Sheet not found: ${sheetName}`);
        return;
      }

      // Get headers & data
      const headersRaw = sheet.getRange(6, 3, 1, sheet.getMaxColumns() - 3).getValues();
      const headers = headersRaw[0].filter(Boolean);
      const data = sheet.getRange(7, 3, sheet.getLastRow() - 6, sheet.getMaxColumns() - 3).getValues();

      const matchingData = data
        .filter(row => {
          // filter empty logs
          if (!row || row.length < 8 || !row[2]) return false;
          const cellValue = row[2].toString().trim().toLowerCase();
          const normalizedInput = inputValue.trim().toLowerCase();
          return cellValue === normalizedInput;
        })
        .map(row => {
          // compose object
          row = row.filter(Boolean);
          const rowObject = { sheetLabel: sheetInfo.label };
          headers.forEach((header, index) => {
            rowObject[header] = row[index] !== undefined ? row[index] : null;
          });
          return rowObject;
        });

      results.push(...matchingData);
    } catch (error) {
      Logger.log(`Error processing sheet ${sheetName}: ${error.message}`);
    }
  });

  return JSON.stringify(results);
}

/**
 * Gets the webhook url based on faction name
 */
function getDiscordWebhookUrls(authInput) {
  if (!isInit) throw new Error("Library is not yet initialized");

  const authKey = PropertiesService.getScriptProperties().getProperty("authKey");
  if (authInput !== authKey) throw new Error("Incorrect Auth Key");

  switch(LIBRARY_SETTINGS.factionName) {
    case "Security":
      return JSON.parse(PropertiesService.getScriptProperties().getProperty("securityWebhook"));
    case "Science":
      return JSON.parse(PropertiesService.getScriptProperties().getProperty("scienceWebhook"));
    case "Medical":
      return JSON.parse(PropertiesService.getScriptProperties().getProperty("medicalWebhookURL"));
    case "Staff":
      return JSON.parse(PropertiesService.getScriptProperties().getProperty("adminWebhookURL"));
    case "MTF O-45":
      return JSON.parse(PropertiesService.getScriptProperties().getProperty("O-45WebhookURL"));
    case "MTF E-11":
      return JSON.parse(PropertiesService.getScriptProperties().getProperty("E-11WebhookURL"));
    default:
      throw new Error(`${LIBRARY_SETTINGS.factionName} does not support discord messages yet`);
  }
}

/**
 * Check if a certain user is currently blacklisted, used when promoting/adding members
 * Will return undefined if no date was found
 * @param {String} playerId
 * @returns {Undefined|String}
 * @throws {Error} if library is not initialized or no valid playerId is provided
 */
function isUserBlacklisted(playerId) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!playerId) throw new Error("Invalid playerId");

  const s = getCollect(LIBRARY_SETTINGS.sheetId_blacklist);
  const rows = getLastRow(s);
  const todayTime = new Date().getTime();

  // in milliseconds
  let expiryTime;

  for (let i = 7; i <= rows; i++) {
    if (s.getRange(i, 5).getValue().toString() !== playerId) continue;
    if (s.getRange(i, 10).getValue() === true) continue;
    if (s.getRange(i, 8).getValue() === "") continue;
    if (s.getRange(i, 3).getValue() === "") continue;

    expiryTime = dateToMilliseconds(s.getRange(i, 8).getDisplayValue().toString());
    
    if (todayTime - expiryTime > 0) {
      expiryTime = undefined;
      break;
    }
  }

  return expiryTime;
}

/**
 * Get the Menu/JS file and add it to the web apps, this way I can have one centralized JS file in the library and distribute it across all web apps.
 */
function includeJS() {
  return HtmlService.createHtmlOutputFromFile('menu/Interfaces/JS').getContent();
}

function includeCSS() {
  return HtmlService.createHtmlOutputFromFile('menu/Interfaces/CSS').getContent();
}

/**
 * Add any type of log to the roster (Rank Change, LOA etc...)
 * @param {Object} sheet - The sheet object, retrieved using getCollect
 * @param {Array<number>} borderPairs - The pairs of borders (used for styling)
 * @param {(string|boolean|number[])[]} dataToInsert - The data that will be inserted into the new row
 * @param {Array<number>} checkboxes - Cell columns to add a checkbox | default: []
 * @param {Number} row - The row after which the new row will be made, & thus also the new row location | default: 7
 * @returns {Void}
 */
function addLog(sheet, borderPairs, dataToInsert, checkboxes = [], row = 7) {
  // Insert new row for log
  // :hardcode row to insert after
  sheet.insertRowBefore(row);
  
  // Style new row
  borderPairs.forEach(pair => {
    const colnum = pair[1] - pair[0] + 1;
    sheet.getRange(row, pair[0], 1, colnum)
      .setBorder(null, true, null, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK)
      .setBorder(true, null, true, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID)
      .setFontColor("white")
      .setFontFamily("Lexend")
      .setVerticalAlignment("middle")
      .setHorizontalAlignment("center")
      .setBackground("#666666");

    // If first log ever => set bottom border thick
    if (sheet.getRange(row + 1, pair[0]).getValue() === "") {
      sheet.getRange(row, pair[0], 1, colnum)
        .setBorder(null, null, true, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK)
    }
  });

  checkboxes.forEach(cell => {
    sheet.getRange(row, cell).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  });

  // Insert data
  sheet.getRange(row, 3, 1, dataToInsert[0].length).setValues(dataToInsert);
}