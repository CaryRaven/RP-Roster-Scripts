/**
* Protect cells when logged so data cannot be griefed
* @param {String} type - Single character: N (normal), A (Appealable) or S (Single)
* @param {Object} sh - Sheet Object (use getCollect() to extract this object using sheet ID)
* @param {Number|Null} unprotectedCell - Column number of cell to leave unprotected (null in case of N type)
* @param {Number|Null} empty_row - Number of row to protect
* @returns {Void}
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
  const dataToInsert = [[new Date(), targetData.name, targetData.playerId, targetData.discordId, targetData.rank, inputData.rankchangetype, newRank, inputData.reason, "", userData.name, userData.playerId, userData.rank]];
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
  if (destinationRow && destinationRow != 0) dataCols.forEach((col, i) => roster.getRange(destinationRow, col).setValue(moveData[i].val).setNote(moveData[i].note));
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
    try {
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
    } catch(e) {
      console.log(`Failed at sheet with id ${sheet.getSheetId()}`);
    }
  });
}

/**
 * Manage (add/edit) ranks on the roster
 * @param {Object} inputData - data input by the user
 * @param {Array[Array]} borderPairs - Cell pairs to draw borders between
 * @param {Object} userData
 * @param {ScriptProperty} reqsEnabled
 * @param {Boolean} discordnotif - whether the function should sent a discord notification
 * @returns {Array|String}
 */
function manageRank(inputData, borderPairs, userData, reqsEnabled, discordnotif = true) {
  if (!inputData || typeof inputData !== "object") throw new Error("Invalid input data");
  if (!borderPairs || typeof borderPairs !== "object") throw new Error("Invalid border pairs");
  if (!userData || typeof userData !== "object") throw new Error("Invalid User Data");
  if (!isInit) throw new Error("Library is not yet initialized");
  
  let valid = false;
  const originalBorderPairs = borderPairs;
  let message = inputData.editRank === "" ? `Successfully added ${inputData.title}`: `Successfully edited ${inputData.editRank}`;
  let viewerFolders = [];
  let editorFolders = [];
  valid = filterQuotes(inputData);

  if (valid !== true) return "Invalid data";
  if (LIBRARY_SETTINGS.ranks.indexOf(inputData.title) >= 0 && inputData.editRank === "") return "Rank Already exists";

  // Get viewer folders & files from a string to an array
  if (inputData.viewerFolders) {
    inputData.viewerFolders = inputData.viewerFolders.replace(/\s+/g, '');
    viewerFolders = inputData.viewerFolders.split(",");
    let ss = DriveApp.getFileById(LIBRARY_SETTINGS.spreadsheetId);
    viewerFolders.forEach(folderId => {
      try {
        let fo = DriveApp.getFolderById(folderId.toString());
        if (!LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].includes(folderId)) {
          valid = false;
          message = "Viewerfolder is unrelated to Security";
        } else if (fo.getOwner().getEmail() !== ss.getOwner().getEmail()) {
          // TODO: check if folder is owner by me before adding it to a rank
          valid = false;
          message = `Viewerfolders must be owned by ${ss.getOwner().getEmail()}`;
        }
      } catch(e) {
        try {
          let fi = DriveApp.getFileById(folderId.toString());
          if (!LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].includes(folderId)) {
            valid = false;
            message = "Viewerfile is unrelated to Security";
          } else if (fo.getOwner().getEmail() !== ss.getOwner().getEmail()) {
            // TODO: check if folder is owner by me before adding it to a rank
            valid = false;
            message = `Viewerfile must be owned by ${ss.getOwner().getEmail()}`;
          }
        } catch(ee) {
          valid = false;
          message = "ViewerFolders & Files: Invalid Folder/File ID";
        }
      }
    });
    if (valid !== true) return message;
  } else { viewerFolders = []; }

  // Get editor folders from a string to an array
  if (inputData.editorFolders) {
    inputData.editorFolders = inputData.editorFolders.replace(/\s+/g, '');
    editorFolders = inputData.editorFolders.split(",");
    editorFolders.forEach(folderId => {

      // Try to get folder
      try {
        DriveApp.getFolderById(folderId.toString());
        if (!LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].includes(folderId)) {
          valid = false;
          message = "Editorfolder is unrelated to Security";
        }
      } catch(e) {
        // If no folder, try to get file
        try {
          DriveApp.getFileById(folderId.toString());
          if (!LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].includes(folderId)) {
            valid = false;
            message = "Editorfile is unrelated to Security";
          }
        } catch(ee) {
          // No folder or file? -> fail
          valid = false;
          message = "EditorFolders & Files: Invalid Folder/File ID"
        }
      }
    });
    if (valid !== true) return message;
  } else { editorFolders = []; }

  // if no rankBefore => add it at the top (before Sr CL4)
  let rankBeforeChief;
  if (!inputData.rankBefore) {
    inputData.rankBefore = LIBRARY_SETTINGS.ranks[LIBRARY_SETTINGS.ranks.length - 2];
    rankBeforeChief = LIBRARY_SETTINGS.ranks[LIBRARY_SETTINGS.ranks.length - 1];
  }

  // If Editing => check if hierarchy changed => remove previous rank location
  const hierarchyChange = (LIBRARY_SETTINGS.ranks.indexOf(inputData.editRank) + 1 !== LIBRARY_SETTINGS.ranks.indexOf(inputData.rankBefore) && inputData.editRank != "");

  // Check if rank still has active members
  let rownum = 0;
  if (hierarchyChange) {
    rownum = getLastRankRow(inputData.editRank) - getStartRankRow(inputData.editRank);
    valid = removeRank(inputData.editRank, false);
    if (!Array.isArray(valid)) return "Cannot move a rank with active members";
  }

  let editReq = inputData.promoReqs.length > 0 ? 1 : 0;

  // Make sure that if promo reqs were all removed, it still registers it as a change in reqs
  try {
    if (editReq === 0 && inputData.editRank !== "" && reqsEnabled.toString() === "false") {
      editReq = LIBRARY_SETTINGS.promoReqs[LIBRARY_SETTINGS.ranks.indexOf(inputData.editRank)].length > 0 ? 1 : editReq;
    }
  } catch(e) {
    editReq = editReq;
  }

  for (let i = 0; i <= editReq; i++) {
    const s = getCollect(LIBRARY_SETTINGS.rosterIds[i]);

    // Operations if no hierarchy change
    if (!hierarchyChange && inputData.editRank !== "") {
      let firstRankRow = getStartRankRow(inputData.editRank, i);
      let lastRankRow = getLastRankRow(inputData.editRank, i);

      // Only do this if the rank rows were found
      if (firstRankRow && lastRankRow) {
        // title changed without hierarchy change?
        if (inputData.title !== inputData.editRank) {
          s.getRange(firstRankRow, LIBRARY_SETTINGS.dataCols.firstCol).setValue(inputData.title);
          for (let j = firstRankRow; j <= lastRankRow; j++) {
            s.getRange(j ,LIBRARY_SETTINGS.dataCols.rank).setValue(inputData.title);
          }
        }
      }

      // Promo reqs change without hierarchy change?
      if (i === 1) {
        /* Remove from promo req roster
          Always do this, regardless of hierarchy change or not. If not it won't erase the previous req block
          TODO: change the branch to be automatic
        */
        removeRank(inputData.editRank, false, i, true);

        const lastRowRankBefore = getLastRankRow(inputData.rankBefore, i);
        let lastBeforeRow = lastRowRankBefore ? lastRowRankBefore : getLastRankRow(LIBRARY_SETTINGS.ranks[LIBRARY_SETTINGS.ranks.length - 1], i);
        if (!lastBeforeRow) lastBeforeRow = LIBRARY_SETTINGS.dataCols.firstReqRow;

        if (inputData.promoReqs.length > 0) {
          s.insertRowAfter(lastBeforeRow + 1);
          s.insertRowAfter(lastBeforeRow);
          s.moveRows(s.getRange(lastBeforeRow + 1, 1), lastBeforeRow + 3);
          let insertRow_2 = lastBeforeRow + 2;
          borderPairs = [
            [3, 3], 
            [5, 6],
            [8, 7 + inputData.promoReqs.length]
          ];

          console.log(`Borderpairs: ${borderPairs}`);

          // Set styling & (in case of promo reqs) add title/desc row + styling
          borderPairs.forEach(cellpair => {
            let numcols = (cellpair[1] - cellpair[0]) + 1;
            let r = s.getRange(insertRow_2, cellpair[0], 1, numcols);
            r.setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
            r.setBorder(null, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);

            // Set styling for promo req page
            if (i === 1 && cellpair[0] === 8) {
              addFirstReqRow(s, insertRow_2, inputData.promoReqs, cellpair, numcols);
              insertRow_2++;
            }
          });

          // Set data for promo reqs
          const reqFormulas = inputData.promoReqs.map((_, i) => `= IS_REQ_COMPLETED('Requirement Logs'!E:E, F${insertRow_2}, 'Requirement Logs'!G:G, D${insertRow_2}, 'Requirement Logs'!H:H, $${String.fromCharCode(72 + i)}$${insertRow_2 - 1}, 'Requirement Logs'!C:C)`);
          const preData = [[inputData.title, inputData.title, "", "", ""]];
          insertData = [preData[0].concat(reqFormulas)];

          // insert formulas
          s.getRange(insertRow_2, LIBRARY_SETTINGS.dataCols.firstCol, 1, insertData[0].length).setValues(insertData);

          /* Adding req rows if rank already had multiple slots
            So if a rank already had 5 slots, it will also add those 4 extra slots to the req roster
          */
          firstRankRow = getStartRankRow(inputData.editRank);
          lastRankRow = getLastRankRow(inputData.editRank);

          let reqRowNum = lastRankRow - firstRankRow;
          // If the rank only has one row, no extra slots need to be added
          reqRowNum = reqRowNum === 1 ? 0 : reqRowNum;
          addReqRow(inputData.editRank, reqRowNum, borderPairs, inputData.promoReqs);

          // Only set this formula after as it can cause unwanted rows to be added
          s.getRange(insertRow_2, 5).setValue(`= IFERROR(FILTER('Security Roster'!E:F, 'Security Roster'!D:D=D${insertRow_2}), "Rank Not found")`);
        }
      }
    }

    let g_insertRow;

    // Insert into roster if new rank or hierarchy change
    if (hierarchyChange || inputData.editRank === "") {

      let lastBeforeRow = rankBeforeChief ? getLastRankRow(rankBeforeChief, i) : getLastRankRow(inputData.rankBefore, i);
      if (!lastBeforeRow) lastBeforeRow = LIBRARY_SETTINGS.dataCols.firstReqRow;
      
      /* Insert new rank / move rank
        |-> move rank is more of a "remove & re-add" rather than just moving it 
      */
      s.insertRowAfter(lastBeforeRow + 1);
      s.insertRowAfter(lastBeforeRow);
      s.moveRows(s.getRange(lastBeforeRow + 1, 1), lastBeforeRow + 3);
      let insertRow = lastBeforeRow + 2;

      if (i === 1) {
        borderPairs = [
          [3, 3], 
          [5, 6],
          [8, 7 + inputData.promoReqs.length]
        ];
      } else {
        borderPairs = originalBorderPairs;
      }

      // Set styling & (in case of promo reqs) add title/desc row + styling
      borderPairs.forEach(cellpair => {
        let numcols = (cellpair[1] - cellpair[0]) + 1;
        let r = s.getRange(insertRow, cellpair[0], 1, numcols);
        r.setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
        r.setBorder(null, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);

        // Set styling for promo req page
        if (i === 1 && cellpair[0] === 8) {
          addFirstReqRow(s, insertRow, inputData.promoReqs, cellpair, numcols);
          insertRow++;
        }
      });

      // Map formulas into usable format (replace /row/ & /title/)
      let insertData;
      if (i === 0) {
        insertData = LIBRARY_SETTINGS.newRowData.map(col => 
          col.map(value => {
            if (typeof value === "string") {
              return value.replace(/\/row\//g, insertRow).replace(/\/title\//g, inputData.title);
            }
            return value;
          })
        );
      } else {
        const reqFormulas = inputData.promoReqs.map((_, i) => `= IS_REQ_COMPLETED('Requirement Logs'!E:E, F${insertRow}, 'Requirement Logs'!G:G, D${insertRow}, 'Requirement Logs'!H:H, $${String.fromCharCode(72 + i)}$${insertRow - 1}, 'Requirement Logs'!C:C)`);
        const preData = [[inputData.title, inputData.title, "", "", ""]];
        insertData = [preData[0].concat(reqFormulas)];
        g_insertRow = insertRow;
      }

      // insert formulas
      s.getRange(insertRow, LIBRARY_SETTINGS.dataCols.firstCol, 1, insertData[0].length).setValues(insertData);
    }

    // Add all ranks slots back to new loc
    if (hierarchyChange) {
      addRankRow(inputData.title, userData, rownum, false);

      // Only set this formula after as it can cause extra rows to be added
      if (g_insertRow) s.getRange(g_insertRow, 5).setValue(`= IFERROR(FILTER('Security Roster'!E:F, 'Security Roster'!D:D=D${insertRow}), "Rank Not found")`);
    }
  }

  // Don't add empty 2D array to promoReqs if no reqs were added
  inputData.promoReqs = inputData.promoReqs.length > 0 ? inputData.promoReqs : [];

  // Prepare settings
  if (hierarchyChange || inputData.editRank === "") {
    // Settings if hierarchy changed => remove & add new
    LIBRARY_SETTINGS.folders.splice(LIBRARY_SETTINGS.ranks.indexOf(inputData.rankBefore), 0, {
      "viewerAccess": viewerFolders,
      "editorAccess": editorFolders
    });

    LIBRARY_SETTINGS.interviewRequired.splice(LIBRARY_SETTINGS.ranks.indexOf(inputData.rankBefore), 0, inputData.interviewRequired);
    LIBRARY_SETTINGS.promoReqs.splice(LIBRARY_SETTINGS.ranks.indexOf(inputData.rankBefore), 0, inputData.promoReqs);

    LIBRARY_SETTINGS.ranks.splice(LIBRARY_SETTINGS.ranks.indexOf(inputData.rankBefore), 0, inputData.title); // Always change last
  } else {
    // Settings if no hierarchy change => replace existing
    LIBRARY_SETTINGS.folders.splice(LIBRARY_SETTINGS.ranks.indexOf(inputData.editRank), 1, {
      "viewerAccess": viewerFolders,
      "editorAccess": editorFolders
    });

    LIBRARY_SETTINGS.interviewRequired.splice(LIBRARY_SETTINGS.ranks.indexOf(inputData.editRank), 1, inputData.interviewRequired);
    LIBRARY_SETTINGS.promoReqs.splice(LIBRARY_SETTINGS.ranks.indexOf(inputData.editRank), 1, inputData.promoReqs);
    
    if (!hierarchyChange && inputData.title !== inputData.editRank && inputData.editRank !== "") {
      LIBRARY_SETTINGS.ranks.splice(LIBRARY_SETTINGS.ranks.indexOf(inputData.editRank), 1, inputData.title); // Always change last
    }
  }

  // Send discord message
  if (inputData.editRank == "") {
    if (discordnotif) sendDiscordNewRank(inputData.title);
  } else {
    userData.title = inputData.title;
    userData.editRank = inputData.editRank;
    userData.rankBefore = inputData.rankBefore;
    userData.viewerAccess = viewerFolders;
    userData.editorAccess = editorFolders;
    userData.interviewRequired = inputData.interviewRequired;
    
    if (discordnotif) sendDiscordConfig("rankEdit", false, userData);
  }

  return [message, LIBRARY_SETTINGS];
}

/**
 * Create the first row of a rank inside the promo reqs sheet
 * @param {Number} insertRow
 * @param {Array} reqs
 * @param {Array} cellpair
 * @returns {Void}
 */
function addFirstReqRow(s, insertRow, reqs, cellpair, numcols) {
  s.insertRowBefore(insertRow);
  let titles = reqs.map(req => req.title);
  let r = s.getRange(insertRow, cellpair[0], 1, titles.length);
  r.clearDataValidations();
  r.clearContent();
  r.setValues([titles]);
  
  let descriptions = reqs.map(req => req.desc);
  r.setNotes([descriptions]);
  r = s.getRange(insertRow, cellpair[0], 1, numcols);
  r.setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
  r.setBorder(null, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
  r.setHorizontalAlignment("center");

  r = s.getRange(insertRow, 2, 1, 5);
  r.setBorder(null, null, null, null, null, null);
  r.setBackground("#2b547e");
  r.clearContent();

  // Only do this if there is margin on the right (less then max (5) reqs)
  // If not, this might create extra columns
  if (12 - cellpair[1] > 0) {
    r = s.getRange(insertRow, cellpair[1] + 1, 1, 12 - cellpair[1]);
    r.setBackground("#2b547e");
    r.clearDataValidations();
    r.clearContent();
  }

  insertRow++;

  r = s.getRange(insertRow, 3);
  r.setBackground("#666666");
  r.setHorizontalAlignment("center");
  r.setFontSize(12);
  r.setFontWeight("bold");

  r = s.getRange(insertRow, 5, 1, 2);
  r.setBackground("#666666");
  r.setHorizontalAlignment("center");
  r.setFontSize(10);

  for (let j = cellpair[0]; j <= 12; j++) {
    r = s.getRange(insertRow, j);

    if (j <= cellpair[1]) {
      let rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
      r.setDataValidation(rule);
      r.setBackground("#666666");
      s.getRange(insertRow - 1, j).setBackground("#434343");
    } else {
      r.clearDataValidations();
      r.setBackground("#2b547e");
      r.clearContent();
    }
  }
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
function addRankRow(rank, userData, num = 1, discordnotif = true, borderPairs = [[5, 8], [10, 16], [18, 18]]) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!rank) return "no";

  for (let i = 1; i <= num; i++) {
    let rowData = getFirstRankRow(rank);
    let lastRankRow = getLastRankRow(rank);
    let startMergedRange = getStartRankRow(rank);
    let insertRow = lastRankRow + 1;
    let sheet = rowData[1];

    // Insert Row & Data
    const insertData = LIBRARY_SETTINGS.newRowData.map(col => 
      col.map(value => {
        if (typeof value === "string") {
          return value.replace(/\/row\//g, insertRow).replace(/\/title\//g, rank);
        }
        return value;
      })
    );

    sheet.insertRowAfter(lastRankRow);
    sheet.getRange(insertRow, LIBRARY_SETTINGS.dataCols.firstCol, 1, insertData[0].length).setValues(insertData);

    borderPairs.forEach(cellpair => {
      let numcols = (cellpair[1] - cellpair[0]) + 1;
      // Set border styling
      sheet.getRange(insertRow, cellpair[0], 1, numcols).setBorder(null, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      sheet.getRange(insertRow, cellpair[0], 1, numcols).setBorder(true, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
      sheet.getRange(startMergedRange, cellpair[0], 1, numcols).setBorder(true, true, null, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      sheet.getRange(startMergedRange, cellpair[0], 1, numcols).setBorder(null, null, true, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);

      let mergedRange = sheet.getRange(startMergedRange, LIBRARY_SETTINGS.dataCols.firstCol, (insertRow - startMergedRange) + 1, 1);
      mergedRange.merge();
      mergedRange.setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    });
  }

  if (discordnotif) sendDiscordConfigRankRow(rank, true, userData, num);
}

/**
 * Remove a slot from the rank (name) passed in as arg
 * @param {String} rank - Name of rank to remove a slot from
 * @param {Object} userData
 * @param {Number} num (optional) - default: 1
 * @param {Array[Array]} borderPairs (optional) - default: [[5, 8], [10, 16], [18, 18]]
 * @returns {Void|String}
 */
function removeRankRow(rank, userData, num = 1, borderPairs = [[5, 8], [10, 16], [18, 18]]) {
  for (let i = 1; i <= num; i++) {
    const rowData = getFirstRankRow(rank);
    const lastRankRow = getLastRankRow(rank);
    const startRankRow = getStartRankRow(rank);
    const removeRow = rowData[0] + 1;
    const sheet = rowData[1];
    let specialRow = false;

    if (rowData[0] == 0) return "no";
    if (startRankRow === lastRankRow || sheet.getRange(lastRankRow, 5, 1, 1).getDisplayValue() !== "") return "Population";

    // Determine if you're inserting a row at the bottom (different borders & clamp)
    // TODO: Rethink 'specialRow', not really needed
    if ((rowData[0] + 1) >= Number(lastRankRow)) {
      rowData[0] = rowData[0] - 1;
      specialRow = true;
    } else if (rowData[0] == 0) {
      rowData[0] = lastRankRow;
      specialRow = true;
    }

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

/**
 * Add a rank slot to the pomotion requirements sheet
 * @param {String} rank
 * @param {Number} num (optional)
 * @param {Array[]} borderPairs (optional)
 */
function addReqRow(rank, num = 1, borderPairs = [[3, 3], [5, 6]], promoReqs = []) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!rank) return "no";
  if (num === 0) num = 1;

  // Add third (custom) if no borderPair provided
  if (borderPairs.length === 2) borderPairs.push([8, 7 + LIBRARY_SETTINGS.promoReqs[LIBRARY_SETTINGS.ranks.indexOf(rank)].length]);
  const sheet = getCollect(LIBRARY_SETTINGS.rosterIds[LIBRARY_SETTINGS.rosterIds.length - 1]);

  for (let i = 1; i <= num; i++) {
    const rows = sheet.getMaxRows();
    const rankCol = LIBRARY_SETTINGS.dataCols.rank;
    let startRow;
    let endRow;

    // Get start & end rows of the rank (for reference)
    for (let i = 8; i <= rows; i++) {
      if (sheet.getRange(i, rankCol).getValue() === rank && !startRow) {
        startRow = i;
      }

      if (sheet.getRange(i, rankCol).getValue() !== rank && sheet.getRange(i - 1, rankCol).getValue() === rank && !endRow) {
        endRow = i;
      }
    }

    let insertRow = startRow + 1;

    // Insert row
    sheet.insertRowAfter(startRow);
    borderPairs.forEach(cellpair => {
      const numcols = (cellpair[1] - cellpair[0]) + 1;

      // Set border styles
      sheet.getRange(insertRow, cellpair[0], 1, numcols).setBorder(null, true, null, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      sheet.getRange(insertRow, cellpair[0], 1, numcols).setBorder(true, null, true, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
      sheet.getRange(endRow, cellpair[0], 1, numcols).setBorder(null, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);

      // clear data
      if (cellpair[0] === 5) sheet.getRange(insertRow, cellpair[0], 1, numcols).clearContent();
      if (cellpair[0] === 8) {
        // Set formulas to automatically check completion
        let reqs = [promoReqs.map((_, i) => `= IS_REQ_COMPLETED('Requirement Logs'!E:E, F${insertRow}, 'Requirement Logs'!G:G, D${insertRow}, 'Requirement Logs'!H:H, $${String.fromCharCode(72 + i)}$${insertRow - 2}, 'Requirement Logs'!C:C)`)];
        console.log(reqs);
        sheet.getRange(insertRow, cellpair[0], 1, reqs[0].length).setValues(reqs);
      }

      sheet.getRange(insertRow, 4, 1, 1).setValue(rank);
    });

    // Merge rank title
    const mergeRange = sheet.getRange(startRow, LIBRARY_SETTINGS.dataCols.firstCol, (endRow - startRow) + 1, 1);
    mergeRange.merge();
    mergeRange.setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
  }
}

function removeReqRow(rank, num = 1, borderPairs = [[3, 3], [5, 6]]) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!rank) return "no";

  borderPairs.push([8, 7 + LIBRARY_SETTINGS.promoReqs[LIBRARY_SETTINGS.ranks.indexOf(rank)].length]);
  const sheet = getCollect(LIBRARY_SETTINGS.rosterIds[LIBRARY_SETTINGS.rosterIds.length - 1]);

  for (let i = 1; i <= num; i++) {
    const rows = sheet.getMaxRows();
    const rankCol = LIBRARY_SETTINGS.dataCols.rank;
    let startRow;
    let endRow;

    // Get start & end rows of the rank (for reference)
    for (let i = 8; i <= rows; i++) {
      if (sheet.getRange(i, rankCol).getValue() === rank && !startRow) {
        startRow = i;
      }

      if (sheet.getRange(i, rankCol).getValue() !== rank && sheet.getRange(i - 1, rankCol).getValue() === rank && !endRow) {
        endRow = i - 1;
      }
    }

    if (startRow === endRow || sheet.getRange(endRow, 5, 1, 1).getDisplayValue() !== "") return "Population";

    sheet.deleteRow(endRow);
    endRow = endRow - 1;
    
    borderPairs.forEach(cellpair => {
      const numcols = (cellpair[1] - cellpair[0]) + 1;
      sheet.getRange(startRow, cellpair[0], 1, numcols).setBorder(true, true, null, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      sheet.getRange(endRow, cellpair[0], 1, numcols).setBorder(null, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    });
  }
}

/**
 * Remove an entire rank
 * @param {String} rank
 * @returns {String|Array}
 */
function removeRank(rank, discordnotif = true, branch = 0, override = false) {
  const rankIndex = LIBRARY_SETTINGS.ranks.indexOf(rank);
  if (!rank || rankIndex < 0) return "Invalid rank";

  let firstRankRow = getFirstRankRow(rank, branch);
  firstRankRow = firstRankRow[0];
  let startRankRow = getStartRankRow(rank, branch);
  let lastRankRow = getLastRankRow(rank, branch);
  let sheet;

  if (firstRankRow != startRankRow && !override) return "Cannot remove a rank with active members";

  if (branch !== LIBRARY_SETTINGS.rosterIds.length - 1) {
    // Remove rank in settings if not from req sheet
    LIBRARY_SETTINGS.ranks.splice(rankIndex, 1);
    LIBRARY_SETTINGS.folders.splice(rankIndex, 1);
    LIBRARY_SETTINGS.interviewRequired.splice(rankIndex, 1);
    LIBRARY_SETTINGS.promoReqs.splice(rankIndex, 1);

    // Normal removal
    sheet = getCollect(LIBRARY_SETTINGS.rosterIds[branch]);
    sheet.deleteRows(startRankRow - 1, lastRankRow - startRankRow + 2);
  } else {
    // Remove promo reqs
    startRankRow = getStartRankRow(rank, LIBRARY_SETTINGS.rosterIds.length - 1);
    if (startRankRow >= 6) {
      lastRankRow = getLastRankRow(rank, LIBRARY_SETTINGS.rosterIds.length - 1);
      sheet = getCollect(LIBRARY_SETTINGS.rosterIds[LIBRARY_SETTINGS.rosterIds.length - 1]);
      sheet.deleteRows(startRankRow - 1, lastRankRow - startRankRow + 3);
    }
  }

  if (discordnotif) sendDiscordNewRank(rank, false);
  if (branch === 0 && LIBRARY_SETTINGS.ranks.includes(rank)) return "Operation Failed";
  console.log(LIBRARY_SETTINGS);
  return ["Success", LIBRARY_SETTINGS];
}