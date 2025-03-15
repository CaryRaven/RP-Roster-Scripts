/**
* Add viewer/editor perms to folders (used in rank changes & email editing)
* @param {Number} foldersIndex - Index of folders property to use
* @param {String} emailToAdd - Gmail address of the target to add access to
*/
function addDocAccess(foldersIndex, emailToAdd) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!foldersIndex && foldersIndex !== 0) throw new Error("addDocAccess: no folders index provided");
  if (!emailToAdd) throw new Error("addDocAccess: no email provided");

  const folders = LIBRARY_SETTINGS.folders[foldersIndex];
  if (!folders.viewerAccess || !folders.editorAccess) throw new Error("addDocAccess: invalid folders index");

  let folder;
  // let accessFolders = JSON.parse(PropertiesService.getUserProperties().getProperty("accessFolders"));
  let folderChangeList = [];
  try {
    if (folders.viewerAccess.length) folders.viewerAccess.forEach(folderId => {
      folder = DriveApp.getFolderById(folderId);
      folder.addViewer(emailToAdd);
      console.log(`Added viewer access to ${emailToAdd} in ${folder.getName()}`);
      folderChangeList.push({ folderName: folder.getName(), permission: "Viewer"});
    });
    
    if (folders.editorAccess.length) folders.editorAccess.forEach(folderId => {
      folder = DriveApp.getFolderById(folderId);
      folder.addEditor(emailToAdd);
      console.log(`Added editor access to ${emailToAdd} in ${folder.getName()}`);
      folderChangeList.push({ folderName: folder.getName(), permission: "Editor"});
    });
    // PropertiesService.getUserProperties().setProperty("accessFolders", JSON.stringify(folderChangeList));
  } catch(e) {
    console.log(`Error: ${e}`);
  }
}

/**
* Reset a person document access
* @param {String} emailToRemove - Gmail address of the target to remove access from
*/
function removeDocAccess(emailToRemove) {
  if (!isInit) throw new Error("Library is not yet initialized");

  try {
    LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].forEach(folderId => {
      this.docAccessHandler(DriveApp.getFolderById(folderId.toString()), emailToRemove);
    });
    // PropertiesService.getUserProperties().deleteProperty("accessFolders");
  } catch(e)  {
    console.log(`Invalid Folder ID. Error: ${e}`);
  }
}

/**
* Helper function to RemoveDocAccess
* @param {Object} folder 
* @param {String} emailToRemove
*/
function docAccessHandler(folder, emailToRemove) {
  if (!isInit) throw new Error("Library is not yet initialized");

  try {
    let access = folder.getAccess(emailToRemove).name();
    if(access !== "NONE"){
      folder.revokePermissions(emailToRemove);
      folder.getAccess(emailToRemove).name() === "NONE" && console.log("Successfully removed " + access.toLowerCase() + " perms from " + folder.getName());
    }
  } catch(e) {
    console.log(`Error at ${folder.getName()}: ${e}`);
  }
}

function removeAllDocAccess(allowedStaff) {
  if (!isInit) throw new Error("Library is not yet initialized");

  let unaffected = ["micheal.labus@gmail.com", "rykitala@gmail.com"];
  let folders = LIBRARY_SETTINGS.folders;
  const sheet = getCollect(LIBRARY_SETTINGS.rosterIds[0]);

  sheet.getRange(6, LIBRARY_SETTINGS.dataCols.email, (sheet.getMaxRows() - 6), 1).getValues().forEach((email, i) => {
    if (!email[0] || !email[0].includes("@")) return;
    i = i + 6;
    if (sheet.getRange(i, LIBRARY_SETTINGS.dataCols.rank).getValue() !== "Security Chief" 
    && sheet.getRange(i, LIBRARY_SETTINGS.dataCols.rank).getValue() !== "Site Management") return;
    
    unaffected.push(email[0].toLowerCase());
  });

  unaffected = unaffected.concat(allowedStaff);

  folders[folders.length - 1].forEach(folderID => {
    try {
      let folder = DriveApp.getFolderById(folderID);
      if (!folder) return;
      const editors = folder.getEditors();
      const viewers = folder.getViewers();

      editors.forEach(editor => {
        const editorEmail = editor.getEmail();
        if (unaffected.includes(editorEmail)) return;
        folder.removeEditor(editorEmail);
        Logger.log(`Removed editor access from ${editorEmail} in ${folder.getName()}`);
      });

      viewers.forEach(viewer => {
        const viewerEmail = viewer.getEmail();
        if (unaffected.includes(viewerEmail)) return;
        folder.removeViewer(viewerEmail);
        Logger.log(`Removed viewer access from ${viewerEmail} in ${folder.getName()}`);
      });
    } catch (e) {
      console.log(e);
    }
  });
}

/**
 * @param {String} rankToAdd
 * @param {String} currentRank
 */
function updateAccess(rankToAdd, currentRank) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!rankToAdd || typeof rankToAdd !== "string") throw new Error("No valid rankToAdd");
  if (!currentRank || typeof currentRank !== "string") throw new Error("No valid currentRank");

  if (LIBRARY_SETTINGS.ranks.indexOf(rankToAdd) >= LIBRARY_SETTINGS.ranks.indexOf(currentRank) && currentRank !== "Blackshadow Staff") return "";

  // Get array of current allowed ranks
  const adminRankArray = LIBRARY_SETTINGS.adminRanks;

  if (adminRankArray.indexOf(rankToAdd) >= 0) {
    // If rank is already in array => remove them
    adminRankArray.splice(adminRankArray.indexOf(rankToAdd), 1);
  } else {
    // If not => add them
    adminRankArray.push(rankToAdd);
  }

  LIBRARY_SETTINGS.adminRanks = adminRankArray;
  
  Logger.log(adminRankArray);
  return [JSON.stringify(adminRankArray), LIBRARY_SETTINGS];
}

/**
* Protect cells when logged so data cannot be griefed
* @param {String} type - Single character: N (normal), A (Appealable) or S (Single)
* @param {Object} sh - Sheet Object (use getCollect() to extract this object using sheet ID)
* @param {Number|Null} unprotectedCell - Column number of cell to leave unprotected (null in case of N type)
* @param {Number|Null} empty_row - Number of row to protect
* return {Void}
*/
function protectRange(type, sh, unprotectedCell, empty_row) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!type) throw new Error("protectRange: no type was provided");
  if (!sh) throw new Error("protectRange: no sheet object was provided");
  if (!empty_row) throw new Error("protectRange: no empty row provided");

  let protections;
  switch (type) {
    // NORMAL (full row)
    case "N":
      protections = sh.getRange(empty_row, 1, 1, sh.getMaxColumns()).protect();

      protections.removeEditors(protections.getEditors());
      if (protections.canDomainEdit()) {
        protections.setDomainEdit(false);
      }
      break;
    // APPEALABLE (leave one cell unprotected => unprotectedCell)
    case "A":
      if (!unprotectedCell) throw new Error("protectRange: no unprotected cell provided");
      
      protections = sh.getRange(empty_row, 1, 1, (unprotectedCell - 1)).protect();
      protections.removeEditors(protections.getEditors());
      if (protections.canDomainEdit()) {
        protections.setDomainEdit(false);
      }
      protections = sh.getRange(empty_row, (unprotectedCell + 1), 1, sh.getMaxColumns()).protect();
      protections.removeEditors(protections.getEditors());
      if (protections.canDomainEdit()) {
        protections.setDomainEdit(false);
      }
      break;
    // SINGLE (protect a single cell => unprotectedCell)
    case "S":
      if (!unprotectedCell) throw new Error("protectRange: no unprotected cell provided");

      protections = sh.getRange(empty_row, unprotectedCell, 1, 1).protect();
      protections.removeEditors(protections.getEditors());
      if (protections.canDomainEdit()) {
        protections.setDomainEdit(false);
      }
      break;
  }
}

/**
 * Insert a rank change log
 * @param {String} newRank - The name of the new rank of the target
 * @param {Number} insertLogRow - the number of the row to insert the rank change
 */
function insertRankChangeLog(inputData, userData, targetData, newRank, insertLogRow) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!inputData) throw new Error("insertRankChangeLog: no inputData provided");
  if (!userData) throw new Error("insertRankChangeLog: no userData provided");
  if (!targetData) throw new Error("insertRankChangeLog: no targetData provided");
  if (!newRank) throw new Error("insertRankChangeLog: no newRank provided");
  if (!insertLogRow) throw new Error("insertRankChangeLog: no insertLogRow provided");

  const sheet = this.getCollect(LIBRARY_SETTINGS.rankchangeId);
  const dataToInsert = [[new Date(), targetData.name, targetData.steamId, targetData.discordId, targetData.rank, inputData.rankchangetype, newRank, inputData.reason, "", userData.name, userData.steamId, userData.rank]];
  sheet.getRange(insertLogRow, 3, 1, dataToInsert[0].length).setValues(dataToInsert);
}

/**
* Move data of a member from rowToSearch to destinationRow
* @param {Number} branch 
* @param {Number} rowToSearch 
* @param {Number} destinationRow
* @returns {Void}
*/
function moveMember(rowToSearch, destinationRow, branch = 0) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!rowToSearch) throw new Error("moveMember: no row to search for was provided");
  if (!destinationRow) console.log("moveMember: no destination row was provided, removing member");

  const libCols = LIBRARY_SETTINGS.dataCols;
  const roster = this.getCollect(LIBRARY_SETTINGS.rosterIds[Math.round(branch)]);
  let cols = Object.values(libCols);
  let dataCols = [];

  cols = cols.filter((col) => col > 4);
  const moveData = cols.map(col => {
    const r = roster.getRange(rowToSearch, col);
    if (!r.getFormula()) {
      dataCols.push(col);
      return {val: r.getValue(), note: r.getNote()};
    }
    return null;
  }).filter(data => data != null);

  dataCols.forEach(col => roster.getRange(rowToSearch, col).clearContent().clearNote());
  if (destinationRow || destinationRow != 0) dataCols.forEach((col, i) => roster.getRange(destinationRow, col).setValue(moveData[i].val).setNote(moveData[i].note));
}

/**
 * Restores all document access for all staff members, used when lockdown is deactivated
 * @param {AppsScript.ScriptProperty} allowedStaff
 */
function restoreAllDocAccess(allowedStaff) {
  if (!isInit) throw new Error("Library is not yet initialized");
  let allStaff = getAllEmails();
  let unaffected = ["dontorro208@gmail.com", "micheal.labus@gmail.com", "rykitala@gmail.com"];
  const sheet = getCollect(LIBRARY_SETTINGS.rosterIds[0]);
  unaffected = unaffected.concat(allowedStaff);

  sheet.getRange(LIBRARY_SETTINGS.firstMemberRow, LIBRARY_SETTINGS.dataCols.email, (sheet.getMaxRows() - LIBRARY_SETTINGS.firstMemberRow), 1).getValues().forEach((email, i) => {
    if (!email[0] || !email[0].includes("@")) return;
    i = i + 6;
    if (sheet.getRange(i, LIBRARY_SETTINGS.dataCols.rank).getValue() !== LIBRARY_SETTINGS.ranks[LIBRARY_SETTINGS.ranks.length - 2] 
      && sheet.getRange(i, LIBRARY_SETTINGS.dataCols.rank).getValue() !== LIBRARY_SETTINGS.ranks[LIBRARY_SETTINGS.ranks.length - 1]) return;
    unaffected.push(email[0].toLowerCase());
  });

  allStaff.forEach(email => {
    if (unaffected.includes(email)) return;
    let userData = getUserData(email);
    addDocAccess(LIBRARY_SETTINGS.ranks.indexOf(userData.rank), email);
  });
}

/**
 * Head Function - Not to be used in other scripts
 * @param {Array} users - All people with access to folder, regardless if they're allowed or not
 * @param {Array} authed - All people who could have access to the folder
 * @param {Array} exemptUsers - Users who should not be checked (owner of folder & Vigil)
 * @param {String} accessType - Type of access to check for: "VIEW" or "EDIT"
 * @return {Array}
 */
function processPermissions(users, authed, exemptUsers, accessType, folderName, folderId, folderData, ranks) {
  if (!isInit) throw new Error("Library is not yet initialized");
  var flagArray = [];
  users.forEach(user => {
    const email = user.getEmail().toLowerCase();
    if (exemptUsers.includes(email)) return "User is exempt";

    if (!authed.includes(email)) return flagArray.push({ email: email, folderName: folderName, currentPermission: accessType, reason: "Unauthorized access" });
    const userData = getUserData(email.toString());

    if (ranks[ranks.length - 2].includes(userData.rank) || ranks[ranks.length - 1].includes(userData.rank)) return "User is exempt";

    const allowedFolders = accessType === "VIEW" ? folderData[ranks.indexOf(userData.rank)].viewerAccess : folderData[ranks.indexOf(userData.rank)].editorAccess;
    const wrongFolders = accessType === "VIEW" ? folderData[ranks.indexOf(userData.rank)].editorAccess : folderData[ranks.indexOf(userData.rank)].viewerAccess;
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
 * Restore the entire spreadsheet to its latest backup
 */
function restoreSheet() {
  if (!isInit) throw new Error("Library is not yet initialized");

  const wbBackup = SpreadsheetApp.openById(LIBRARY_SETTINGS.backupsbeetId);
  if (!wbBackup) throw new Error("Backup Sheet was not found");
  const wb = SpreadsheetApp.openById(LIBRARY_SETTINGS.spreadsheetId);

  wb.getSheets().forEach(sheet => {
    const sheetId = sheet.getSheetId();
    const sourceSheet = wbBackup.getSheetById(sheetId);
    if (!sourceSheet) throw new Error("Cannot open backup sheet with ID " + sheetId);
    let rows = sheet.getMaxRows();
    let cols = sheet.getMaxColumns();

    if (sourceSheet.getLastRow() > rows) {
      rows = sourceSheet.getLastRow();
      cols = sourceSheet.getLastColumn();
    }

    const formulas = sourceSheet.getRange(1, 1, rows, cols).getFormulas();
    const values = sourceSheet.getRange(1, 1, rows, cols).getValues();

    // Apply formulas where available, otherwise apply values
    const finalData = formulas.map((row, rowIndex) =>
      row.map((cell, colIndex) => (cell ? cell : values[rowIndex][colIndex]))
    );

    sheet.getRange(1, 1, rows, cols).setValues(finalData);
  });
}

/**
 * Manage (add/edit) ranks on the roster
 * @param {Object} inputData - data input by the user
 * @param {Array[Array]} borderPairs - Cell pairs to draw borders between
 * @param {Object} userData
 * @returns {Array|String}
 */
function manageRank(inputData, borderPairs, userData) {
  if (!inputData || typeof inputData !== "object") throw new Error("Invalid input data");
  if (!borderPairs || typeof borderPairs !== "object") throw new Error("Invalid border pairs");
  if (!userData || typeof userData !== "object") throw new Error("Invalid User Data");
  if (!isInit) throw new Error("Library is not yet initialized");
  
  let valid = false;
  let message = inputData.editRank === "" ? `Successfully added ${inputData.title}`: `Successfully edited ${inputData.editRank}`;
  let viewerFolders = [];
  let editorFolders = [];
  valid = filterQuotes(inputData);

  if (valid !== true) return "Invalid data";
  if (LIBRARY_SETTINGS.ranks.indexOf(inputData.title) >= 0 && inputData.editRank === "") return "Rank Already exists";

  // Add new row to settings (backend)
  if (inputData.viewerFolders) {
    inputData.viewerFolders = inputData.viewerFolders.replace(/\s+/g, '');
    viewerFolders = inputData.viewerFolders.split(",");
    viewerFolders.forEach(folderId => {
      try {
        DriveApp.getFolderById(folderId.toString());
        if (!LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].includes(folderId)) {
          valid = false;
          message = "Viewerfolder is unrelated to Security";
        }
      } catch(e) {
        valid = false;
        message = "ViewerFolders: Invalid Folder ID"
      }
    });
    if (valid !== true) return message;
  } else { viewerFolders = []; }

  if (inputData.editorFolders) {
    inputData.editorFolders = inputData.editorFolders.replace(/\s+/g, '');
    editorFolders = inputData.editorFolders.split(",");
    editorFolders.forEach(folderId => {
      try {
        DriveApp.getFolderById(folderId.toString());
        if (!LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].includes(folderId)) {
          valid = false;
          message = "Editorfolder is unrelated to Security";
        }
      } catch(e) {
        valid = false;
        message = "EditorFolders: Invalid Folder ID"
      }
    });
    if (valid !== true) return message;
  } else { editorFolders = []; }

  // If Editing => check if hierarchy changed => remove previous rank location
  let rownum = 0;
  const hierarchyChange = (LIBRARY_SETTINGS.ranks.indexOf(inputData.editRank) + 1 !== LIBRARY_SETTINGS.ranks.indexOf(inputData.rankBefore) && inputData.editRank != "");

  if (hierarchyChange) {
    rownum = getLastRankRow(inputData.editRank) - getStartRankRow(inputData.editRank);
    valid = removeRank(inputData.editRank, false);
    if (!Array.isArray(valid)) return "Cannot move a rank with active members";
  }

  const s = getCollect(LIBRARY_SETTINGS.rosterIds[0]);

  // title changed without hierarchy change?
  if (!hierarchyChange && inputData.title !== inputData.editRank && inputData.editRank !== "") {
    const firstRankRow = getStartRankRow(inputData.editRank)
    s.getRange(firstRankRow, 3).setValue(inputData.title);
    const lastRankRow = getLastRankRow(inputData.editRank);

    for (let i = firstRankRow; i <= lastRankRow; i++) {
      s.getRange(i, 4).setValue(inputData.title);
    }
  }

  // Insert into roster if new rank or hierarchy change
  if (hierarchyChange || inputData.editRank === "") {
    const lastBeforeRow = getLastRankRow(inputData.rankBefore);

    s.insertRowAfter(lastBeforeRow + 1);
    s.insertRowAfter(lastBeforeRow);
    s.moveRows(s.getRange(lastBeforeRow + 1, 1), lastBeforeRow + 3);
    const insertRow = lastBeforeRow + 2;

    borderPairs.forEach(cellpair => {
      let numcols = (cellpair[1] - cellpair[0]) + 1;
      s.getRange(insertRow, cellpair[0], 1, numcols).setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      s.getRange(insertRow, cellpair[0], 1, numcols).setBorder(null, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
    });


    const insertData = LIBRARY_SETTINGS.newRowData.map(col => 
      col.map(value => {
        if (typeof value === "string") {
          return value.replace(/\/row\//g, insertRow).replace(/\/title\//g, inputData.title);
        }
        return value;
      })
    );

    s.getRange(insertRow, 3, 1, 15).setValues(insertData);
  }

  if (hierarchyChange) addRankRow(inputData.title, userData, rownum, false);

  // Prepare settings
  if (hierarchyChange || inputData.editRank === "") {
    LIBRARY_SETTINGS.folders.splice(LIBRARY_SETTINGS.ranks.indexOf(inputData.rankBefore), 0, {
      "viewerAccess": viewerFolders,
      "editorAccess": editorFolders
    });

    LIBRARY_SETTINGS.ranks.splice(LIBRARY_SETTINGS.ranks.indexOf(inputData.rankBefore), 0, inputData.title);
  } else {
    LIBRARY_SETTINGS.folders.splice(LIBRARY_SETTINGS.ranks.indexOf(inputData.editRank), 1, {
      "viewerAccess": viewerFolders,
      "editorAccess": editorFolders
    });
    
    if (!hierarchyChange && inputData.title !== inputData.editRank && inputData.editRank !== "") {
      LIBRARY_SETTINGS.ranks.splice(LIBRARY_SETTINGS.ranks.indexOf(inputData.editRank), 1, inputData.title);
    }
  }

  if (inputData.editRank == "") {
    sendDiscordNewRank(inputData.title);
  } else {
    userData.title = inputData.title;
    userData.editRank = inputData.editRank;
    userData.rankBefore = inputData.rankBefore;
    userData.viewerAccess = viewerFolders;
    userData.editorAccess = editorFolders;
    
    sendDiscordConfig("rankEdit", false, userData);
  }
  return [message, LIBRARY_SETTINGS];
}

/**
 * Add num amount of extra slots to the rank passed in as arg
 * @param {String} rank - Name of the rank to add a slot to
 * @param {Object} userData
 * @param {Array[Array]} borderPairs (optional) - default: [[5, 8], [10, 15], [17, 17]]
 * @param {Number} num (optional) - default: 1
 * @param {Boolean} discordnotif (optional) - Send a discord notification or not, default: true
 * @returns {Void|String}
 */
function addRankRow(rank, userData, num = 1, discordnotif = true, borderPairs = [[5, 8], [10, 15], [17, 17]]) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!rank) return "no";

  for (let i = 1; i <= num; i++) {
    const rowData = getFirstRankRow(rank);
    const lastRankRow = getLastRankRow(rank);
    let specialRow = false;

    // Determine if you're inserting a row at the bottom (different borders & clamp)
    if (rowData[0] >= Number(lastRankRow)) {
      specialRow = true;
    } else if (rowData[0] == 0) {
      rowData[0] = lastRankRow;
      specialRow = true;
    }
    const insertRow = rowData[0] + 1;
    const sheet = rowData[1];

    // Insert Row & Data
    const insertData = LIBRARY_SETTINGS.newRowData.map(col => 
      col.map(value => {
        if (typeof value === "string") {
          return value.replace(/\/row\//g, insertRow).replace(/\/title\//g, rank);
        }
        return value;
      })
    );

    sheet.insertRowAfter(rowData[0]);
    sheet.getRange(insertRow, LIBRARY_SETTINGS.dataCols.firstCol, 1, insertData[0].length).setValues(insertData);

    if (specialRow) {
      borderPairs.forEach(cellpair => {
        let numcols = (cellpair[1] - cellpair[0]) + 1;
        sheet.getRange(insertRow, cellpair[0], 1, numcols).setBorder(null, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
        sheet.getRange(insertRow, cellpair[0], 1, numcols).setBorder(true, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
      });
      const startMergedRange = getStartRankRow(rank);
      sheet.getRange(startMergedRange, LIBRARY_SETTINGS.dataCols.firstCol, ((insertRow - startMergedRange) + 1), 1).merge();
    } else {
      borderPairs.forEach(cellpair => {
        let numcols = (cellpair[1] - cellpair[0]) + 1;
        sheet.getRange(insertRow, cellpair[0], 1, numcols).setBorder(null, true, null, true, null, null,"black", SpreadsheetApp.BorderStyle.SOLID_THICK);
        sheet.getRange(insertRow, cellpair[0], 1, numcols).setBorder(true, null, true, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
      });
    }
  }

  if (discordnotif) sendDiscordConfigRankRow(rank, true, userData, num);
}

/**
 * Remove an entire rank
 * @param {String} rank
 * @returns {String|Array}
 */
function removeRank(rank, discordnotif = true) {
  const rankIndex = LIBRARY_SETTINGS.ranks.indexOf(rank);
  if (!rank || rankIndex < 0) return "Invalid rank";

  let firstRankRow = getFirstRankRow(rank);
  firstRankRow = firstRankRow[0];
  const startRankRow = getStartRankRow(rank);
  const lastRankRow = getLastRankRow(rank);

  if (firstRankRow != startRankRow) return "Cannot remove a rank with active members";

  const sheet = getCollect(LIBRARY_SETTINGS.rosterIds[0]);
  sheet.deleteRows(startRankRow - 1, (lastRankRow - startRankRow) + 2);

  LIBRARY_SETTINGS.ranks.splice(rankIndex, 1);
  LIBRARY_SETTINGS.folders.splice(rankIndex, 1);

  if (discordnotif) sendDiscordNewRank(rank, false);
  return [`Success`, LIBRARY_SETTINGS];
}

/**
 * Remove a slot from the rank (name) passed in as arg
 * @param {String} rank - Name of rank to remove a slot from
 * @param {Object} userData
 * @param {Number} num (optional) - default: 1
 * @param {Array[Array]} borderPairs (optional) - default: [[5, 8], [10, 15], [17, 17]]
 * @returns {Void|String}
 */
function removeRankRow(rank, userData, num = 1, borderPairs = [[5, 8], [10, 15], [17, 17]]) {
  for (let i = 1; i <= num; i++) {
    const rowData = getFirstRankRow(rank);
    const lastRankRow = getLastRankRow(rank);
    let specialRow = false;

    if (rowData[0] == 0) return "no";

    // Determine if you're inserting a row at the bottom (different borders & clamp)
    if ((rowData[0] + 1) >= Number(lastRankRow)) {
      rowData[0] = rowData[0] - 1;
      specialRow = true;
    } else if (rowData[0] == 0) {
      rowData[0] = lastRankRow;
      specialRow = true;
    }
    const removeRow = rowData[0] + 1;
    const sheet = rowData[1];
    sheet.deleteRow(removeRow);

    if (specialRow) {
      borderPairs.forEach(cellpair => {
        let numcols = (cellpair[1] - cellpair[0]) + 1;
        sheet.getRange(removeRow, cellpair[0], 1, numcols).setBorder(true, null, null, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      });
    }

    const startRow = getStartRankRow(rank);
    sheet.getRange(startRow, 3).setValue(rank);
  }

  sendDiscordConfigRankRow(rank, false, userData, num);
}