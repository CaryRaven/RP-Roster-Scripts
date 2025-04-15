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
  const wb = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.openById(LIBRARY_SETTINGS.spreadsheetId);
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

    const s = this.getCollect(rosterId);
    const r = s.getRange(LIBRARY_SETTINGS.firstMemberRow, colToSearch ? colToSearch : LIBRARY_SETTINGS.dataCols.email, s.getMaxRows(), 1).getValues();

    r.forEach((email, i) => {
      email = email[0];
      i = i + LIBRARY_SETTINGS.firstMemberRow;
      if (email == query) {

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

          // Only used on security roster
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

  const sheet = this.getCollect(LIBRARY_SETTINGS.rosterIds[Math.round(Number(branch))]);
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

  const sheet = this.getCollect(LIBRARY_SETTINGS.rosterIds[Math.round(Number(branch))]);
  const total_rows = sheet.getMaxRows();

  for (let i = 1; i <= total_rows; i++) {
    if (sheet.getRange(i, LIBRARY_SETTINGS.dataCols.rank).getValue() == rank) return i;
  }
}

/**
* Get the first empty slot of a certian rank, not to be confused with GetStartRankRow()
* @param {String} rank - Rank name of the target
* @returns {Array} Array with length of 2: [rowNumber, sheetObject]
*/
/**
 * Get the first empty slot of a certian rank, not to be confused with GetStartRankRow()
 * @param {String} rank - Rank name of the target
 * @returns {Array} Array with length of 2: [rowNumber, sheetObject]
 */
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

  const sheet = sheetObject ? sheetObject : this.getCollect(sheetId);
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
 * Get all email addresses currently stored on all rosters
 */
function getAllEmails() {
  if (!isInit) throw new Error("Library is not yet initialized");

  let emails = [];

  LIBRARY_SETTINGS.rosterIds.forEach(rosterId => {
    const sheet = this.getCollect(rosterId);
    sheet.getRange(LIBRARY_SETTINGS.firstMemberRow, LIBRARY_SETTINGS.dataCols.email, (sheet.getMaxRows() - LIBRARY_SETTINGS.firstMemberRow), 1).getValues().forEach(email => {
      if (!email[0] || email[0].toLowerCase() == "n/a" || !email[0].includes("@")) return;
      emails.push(email[0].toLowerCase());
    });
  });

  return emails;
}

/**
 * Get emails of people that aren't mentioned on the roster but should still get access to the admin menu
 * @returns {JSON.String[]}
 */
function getAllowedStaff() {
  // if (!isInit) throw new Error("Library is not yet initialized");

  const staffAdminRoster = SpreadsheetApp.openById("1Y5vRfPV4v1NnD32eLJf4TWBRrur3xJpYjOBpgwRmHrU").getSheetById(591802026);
  let rows = staffAdminRoster.getMaxRows();
  let emails = [];

  staffAdminRoster.getRange(8, 8, rows, 1).getValues().forEach(row => {
      const email = row[0];
      if (!email) return;
      emails.push(email);
  });

  const seniorsRoster = SpreadsheetApp.openById('1H_7iso49sh1IfVQGEuUGAymPcAuoUdSygX7_sOM1wWw').getSheetById(675133232);
  rows = seniorsRoster.getMaxRows();
  
  seniorsRoster.getRange(8, 8, rows, 1).getValues().forEach((row, i) => {
    const email = row[0];
    if (!email) return;
    if (seniorsRoster.getRange(i + 8, 4).getValue().includes("Site")) emails.push(email);
  });
  
  console.log(emails);
  return JSON.stringify(emails);
}

/**
 * Filters inputData for quotes, to prevent code injection
 * @param {Object} inputData - data that you want to filter
 * @returns {Boolean}
 */
function filterQuotes(inputData) {
  const values = Object.values(inputData);
  let valid = true;

  values.forEach(value => {
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
  var bytes = DriveApp.getFileById(id).getBlob().getBytes();
  return Utilities.base64Encode(bytes);
}

/**
 * Checks all current staff Folders for unwanted access & reports it
 * @param {Array} exempt
 */
function permissionsGuard(exempt) {
  if (!isInit) throw new Error("Library is not yet initialized");

  let authed = getAllEmails();
  let folders = LIBRARY_SETTINGS.folders;
  exempt.push("micheal.labus@gmail.com");
  let flagArray = [];

  authed.forEach(email => {
    // Check if google account still exists / blocked me
    try {
      DriveApp.getFolderById(LIBRARY_SETTINGS.publicDocsFolderId).addViewer(email);
      DriveApp.getFolderById(LIBRARY_SETTINGS.publicDocsFolderId).removeViewer(email);
    } catch(e) {
      const user = getUserData(email);
      flagArray.push({ email: email, folderName: `${LIBRARY_SETTINGS.factionName} Documentation Drive`, currentPermission: user.rank, reason: "Deleted/Blocked Google Account" });
    }
  });

  // Check registered folders
  folders[folders.length - 1].forEach(folderId => {
    if (!folderId) return;
    let folder;

    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (e) {
      try {
        folder = DriveApp.getFileById(folderId);
      } catch(ee) {
        return console.log(`Error found at ${folderId}`);
      }
    }

    const folderName = folder.getName();
    const viewers = folder.getViewers();
    const editors = folder.getEditors();

    flagArray = flagArray.concat(processPermissions(viewers, authed, exempt, "VIEW", folderName, folderId, folders));
    flagArray = flagArray.concat(processPermissions(editors, authed, exempt, "EDIT", folderName, folderId, folders));

  });

  // Going through all docs checking for unregistered
  const parentFolder = DriveApp.getFolderById(LIBRARY_SETTINGS.parentFolderId);
  const flaggedDocs = [];
  collectUnregisteredDocs(parentFolder, flaggedDocs);

  if (flagArray.length > 0 || flaggedDocs.length > 0) sendDiscordPermissionReport(flagArray, flaggedDocs);
}

/**
 * Head Function - Not to be used in other scripts
 * @param {Array} users - All people with access to folder, regardless if they're allowed or not
 * @param {Array} authed - All people who could have access to the folder
 * @param {Array} exemptUsers - Users who should not be checked (owner of folder & Vigil)
 * @param {String} accessType - Type of access to check for: "VIEW" or "EDIT"
 * @return {Array}
 */
function processPermissions(users, authed, exemptUsers, accessType, folderName, folderId, folderData) {
  if (!isInit) throw new Error("Library is not yet initialized");
  let flagArray = [];
  const ranks = LIBRARY_SETTINGS.ranks;

  users.forEach(user => {
    const email = user.getEmail().toLowerCase();
    if (exemptUsers.includes(email)) return "User is exempt";

    // Check if google account still exists / blocked me
    try {
      DriveApp.getFolderById(LIBRARY_SETTINGS.publicDocsFolderId).addViewer(email);
      DriveApp.getFolderById(LIBRARY_SETTINGS.publicDocsFolderId).removeViewer(email);
    } catch(e) {
      flagArray.push({ email: email, folderName: folderName, currentPermission: accessType, reason: "Deleted/Blocked Google Account" });
    }

    if (!authed.includes(email)) return flagArray.push({ email: email, folderName: folderName, currentPermission: accessType, reason: "Unauthorized access" });

    const userData = getUserData(email.toString());

    if (ranks[ranks.length - 2].includes(userData.rank) || ranks[ranks.length - 1].includes(userData.rank)) return "User is exempt";

    const allowedFolders = accessType === "VIEW" ? folderData[ranks.indexOf(userData.rank)].viewerAccess : folderData[ranks.indexOf(userData.rank)].editorAccess;
    const wrongFolders = accessType === "VIEW" ? folderData[ranks.indexOf(userData.rank)].editorAccess : folderData[ranks.indexOf(userData.rank)].viewerAccess;

    // Allow users to have access to files if they have access to a parent folder.
    // TODO: testing required
    let parents;
    try {
      parents = DriveApp.getFolderById(folderId).getParents();
      while (parents.hasNext()) {
        const parent = parents.next();
        const parentId = parent.getId();
        if (allowedFolders.includes(parentId)) return;
      }
    } catch(e) {
      try {
        parents = DriveApp.getFileById(folderId).getParents();
        while (parents.hasNext()) {
          const parent = parents.next();
          const parentId = parent.getId();
          if (allowedFolders.includes(parentId)) return;
        }
      } catch(ee) { }
    }

    if (allowedFolders.includes(folderId)) return;

    if (wrongFolders.includes(folderId)) {
      return flagArray.push({ email: email, folderName: folderName, expectedPermission: accessType === "VIEW" ? "EDIT" : "VIEW", reason: "Incorrect permissions" });
    } else {
      return flagArray.push({ email: email, folderName: folderName, currentPermission: accessType, reason: "Unauthorized access" });
    }

  });
  return flagArray;
}

/**
 * Recursive function to check through all docs under a parent folder
 */
function collectUnregisteredDocs(folder, itemsArray) {
  // Folder
  if (
    !LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].includes(folder.getId())
    && !folder.getName().includes("Interview")) {
    itemsArray.push({
      type: "folder",
      name: folder.getName(),
      id: folder.getId(),
      owner: getOwnerEmail(folder)
    });
  }

  // Files
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (
      !LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].includes(file.getId())
      && !file.getName().includes("Interview")) {
      itemsArray.push({
        type: "file",
        name: file.getName(),
        id: file.getId(),
        owner: getOwnerEmail(file)
      });
    }
  }

  // Move to next folder if possible
  const subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    const subfolder = subfolders.next();
    collectUnregisteredDocs(subfolder, itemsArray);
  }
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
function backupSheet(backupEnabled, manualEnabled) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (backupEnabled == "false") return;

  const wbBackup = SpreadsheetApp.openById(LIBRARY_SETTINGS.backupsbeetId);
  const wb = SpreadsheetApp.openById(LIBRARY_SETTINGS.spreadsheetId);
  const s = getCollect(LIBRARY_SETTINGS.rosterIds[0]);

  s.getRange(10, 1).setValue(manualEnabled);

  wbBackup.getSheets().forEach(sheet => {
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
        LIBRARY_SETTINGS.promoReqs[i]
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
    { id: LIBRARY_SETTINGS.rankchangeId, label: "Rank Change" },
    { id: LIBRARY_SETTINGS.infractionId, label: "Infraction" },
    { id: LIBRARY_SETTINGS.loaId, label: "LOA Log" },
    { id: LIBRARY_SETTINGS.blId, label: "Suspension / Blacklist Log" },
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
      const headersRaw = sheet.getRange(6, 3, 1, sheet.getMaxColumns()).getValues();
      const headers = headersRaw[0].filter(Boolean);
      const data = sheet.getRange(7, 3, sheet.getLastRow() - 6, 11).getValues();

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