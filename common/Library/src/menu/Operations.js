// TODO: Organize this file into different, cleaner files. "Operations" is too broad

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

  const sheet = this.getCollect(LIBRARY_SETTINGS.sheetId_rankchange);
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
  const roster = getCollect(LIBRARY_SETTINGS.rosterIds[Math.round(branch)]);
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

  // Remove Supervisor
  if (!LIBRARY_SETTINGS.supervisorsDisabled) roster.getRange(destinationRow, LIBRARY_SETTINGS.dataCols.supervisor_name, 1, 2).clearContent();
}

/**
 * Restore the entire spreadsheet to its latest backup
 */
function restoreSheet() {
  if (!isInit) throw new Error("Library is not yet initialized");

  const wbBackup = SpreadsheetApp.openById(LIBRARY_SETTINGS.spreadsheetId_backup);
  if (!wbBackup) throw new Error("Backup Sheet was not found");
  const wb = SpreadsheetApp.openById(LIBRARY_SETTINGS.spreadsheetId_main);

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
 * Add promotion requirements to a rank - Helper to manageRank
 */
function addReqRank(sheet, lastBeforeRow, inputData) {
  if (!isInit) throw new Error("Library is not yet initialized");
  
  sheet.insertRowAfter(lastBeforeRow + 1);
  sheet.insertRowAfter(lastBeforeRow);
  sheet.moveRows(sheet.getRange(lastBeforeRow + 1, 1), lastBeforeRow + 3);
  let insertRow = lastBeforeRow + 2;
  const hasMinMerits = inputData.minMeritScore > 0 ? 1 : 0;
  let borderPairs = [
    [3, 3], 
    [5, 6],
    [8, 7 + inputData.promoReqs.length + hasMinMerits]
  ];

  // Set styling & (in case of promo reqs) add title/desc row + styling
  borderPairs.forEach(cellpair => {
    let numcols = (cellpair[1] - cellpair[0]) + 1;
    let r = sheet.getRange(insertRow, cellpair[0], 1, numcols);
    r.setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    r.setBorder(null, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);

    // Set styling for promo req page
    if (cellpair[0] === 8) {
      console.log(inputData.promoReqs);

      if (hasMinMerits === 1) inputData.promoReqs.push({ title: `${inputData.minMeritScore} Merits`, desc: `Have a minimum of ${inputData.minMeritScore} merits on your name.`})

      addFirstReqRow(sheet, insertRow, inputData.promoReqs, cellpair, numcols);
      insertRow++;

      if (hasMinMerits === 1) inputData.promoReqs.pop();
    }
  });

  console.log(inputData.promoReqs);

  // Set data for promo reqs
  const reqFormulas = inputData.promoReqs.map((v, i) => `= IS_REQ_COMPLETED('Requirement Logs'!E:E, F${insertRow}, 'Requirement Logs'!G:G, D${insertRow}, 'Requirement Logs'!H:H, $${String.fromCharCode(72 + i)}$${insertRow - 1}, 'Requirement Logs'!C:C, ${Number(v.logcount)}, ${Number(v.expirydays)})`);
  hasMinMerits === 1 && reqFormulas.push(`= HAS_MIN_MERITS(GET_MERIT_COUNT(F${insertRow}, 'Merit Logs'!I:I, 'Merit Logs'!C:C, 'Merit Logs'!E:E), ${Number(inputData.minMeritScore)})`);
  const preData = [[inputData.title, inputData.title, "", "", ""]];
  let insertData = [preData[0].concat(reqFormulas)];

  console.log(insertData);

  // insert formulas
  sheet.getRange(insertRow, LIBRARY_SETTINGS.dataCols.firstCol, 1, insertData[0].length).setValues(insertData);

  /* Adding req rows if rank already had multiple slots
    So if a rank already had 5 slots, it will also add those 4 extra slots to the req roster
  */
  let startRankRow = getStartRankRow(inputData.title);
  let lastRankRow = getLastRankRow(inputData.title);

  let reqRowNum = lastRankRow - startRankRow;
  // If the rank only has one row, no extra slots need to be added
  reqRowNum = reqRowNum === 1 ? 0 : reqRowNum;
  addReqRow(inputData.title, reqRowNum, borderPairs, inputData.promoReqs, inputData.minMeritScore);

  // Only set this formula after as it can cause unwanted rows to be added
  sheet.getRange(insertRow, 5).setValue(`= IFERROR(FILTER('${LIBRARY_SETTINGS.factionName} Roster'!E:F, '${LIBRARY_SETTINGS.factionName} Roster'!D:D=D${insertRow}), "Rank Not found")`);
}

/**
 * Manage (add/edit) ranks on the roster
 * @param {Object} inputData - data input by the user
 * @param {Array[Array]} borderPairs - Cell pairs to draw borders between
 * @param {Object} userData
 * @param {Boolean} discordnotif - whether the function should sent a discord notification
 * @returns {Array|String}
 */
function manageRank(inputData, borderPairs, userData, discordnotif = true, reqsBeingEnabled = false) {
  if (!inputData || typeof inputData !== "object") throw new Error("Invalid input data");
  if (!borderPairs || typeof borderPairs !== "object") throw new Error("Invalid border pairs");
  if (!userData || typeof userData !== "object") throw new Error("Invalid User Data");
  if (!isInit) throw new Error("Library is not yet initialized");
  
  let valid = false;
  const originalBorderPairs = borderPairs;
  let message = inputData.editRank === "" ? `Successfully added ${inputData.title}`: `Successfully edited ${inputData.editRank}`;
  let viewerFolders = [];
  let editorFolders = [];
  let ss;
  let reqsDisabled = LIBRARY_SETTINGS.reqsDisabled;
  const editingRank =  inputData.editRank !== "" ? true : false;
  valid = filterQuotes(inputData);

  if (valid !== true) return "Invalid data";
  if (LIBRARY_SETTINGS.ranks.indexOf(inputData.title) >= 0 && inputData.editRank === "" && !reqsBeingEnabled) return "Rank Already exists";

  // Folder Operations ************************************************************

  // Get viewer folders & files from a string to an array
  if (inputData.viewerFolders) {

    inputData.viewerFolders = inputData.viewerFolders.replace(/\s+/g, '');
    viewerFolders = inputData.viewerFolders.split(",");
    ss = DriveApp.getFileById(LIBRARY_SETTINGS.spreadsheetId_main);

    for (folderId of viewerFolders) {
      try {
        let fo = DriveApp.getFolderById(folderId.toString());
        if (!LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].includes(folderId)) {

          return `Viewerfolder is unrelated to ${LIBRARY_SETTINGS.factionName}`;

        } else if (fo.getOwner().getEmail() !== ss.getOwner().getEmail()) {

          return `Viewerfolders must be owned by ${ss.getOwner().getEmail()}`;
        }
      } catch(e) {
        try {
          let fi = DriveApp.getFileById(folderId.toString());
          if (!LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].includes(folderId)) {

            return `Viewerfile is unrelated to ${LIBRARY_SETTINGS.factionName}`;

          } else if (fi.getOwner().getEmail() !== ss.getOwner().getEmail()) {

            return `Viewerfile must be owned by ${ss.getOwner().getEmail()}`;
          }
        } catch(ee) {

          return "ViewerFolders & Files: Invalid Folder/File ID";
        }
      }
    }
  } else { viewerFolders = []; }

  // Get editor folders from a string to an array
  if (inputData.editorFolders) {

    inputData.editorFolders = inputData.editorFolders.replace(/\s+/g, '');
    editorFolders = inputData.editorFolders.split(",");
    ss = DriveApp.getFileById(LIBRARY_SETTINGS.spreadsheetId_main);
    
    for (folderId of editorFolders) {
      try {
        let fo = DriveApp.getFolderById(folderId.toString());
        if (!LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].includes(folderId)) {

          return `EditorFolder is unrelated to ${LIBRARY_SETTINGS.factionName}`;

        } else if (fo.getOwner().getEmail() !== ss.getOwner().getEmail()) {

          return `EditorFolder must be owned by ${ss.getOwner().getEmail()}`;
        }

        // Check for duplicates
        if (viewerFolders.includes(folderId)) return "Cannot have duplicate file/folder permissions";
      } catch(e) {
        try {
          let fi = DriveApp.getFileById(folderId.toString());
          if (!LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].includes(folderId)) {

            return `EditorFile is unrelated to ${LIBRARY_SETTINGS.factionName}`;

          } else if (fi.getOwner().getEmail() !== ss.getOwner().getEmail()) {

            return `Editorfile must be owned by ${ss.getOwner().getEmail()}`;
          }

          // Check for duplicates
          if (viewerFolders.includes(folderId)) return "Cannot have duplicate file/folder permissions";
        } catch(ee) {

          return "EditorFolders & Files: Invalid Folder/File ID";
        }
      }
    }
  } else { editorFolders = []; }

  // Check for duplicates
  for (folderId of viewerFolders) {
    if (editorFolders.includes(folderId)) return "Cannot have duplicate file/folder permissions";
  }

  // **************************************************************

  // Check if the rank before is the last rank in the group
  // If that is the case & the group is different than that rank's group, we want to move the rank down on the roster to its chosen group.
  let rankBeforeIndex = LIBRARY_SETTINGS.ranks.indexOf(inputData.rankBefore);
  if (rankBeforeIndex < 0) rankBeforeIndex = LIBRARY_SETTINGS.ranks.indexOf(LIBRARY_SETTINGS.adminRanks[0]);
  const rankBeforeGroup = LIBRARY_SETTINGS.group[rankBeforeIndex];
  let rankBeforeGroup2;
  let changeGroup = false;

  if (rankBeforeIndex !== 0) {
    rankBeforeGroup2 = LIBRARY_SETTINGS.group[rankBeforeIndex - 1];

    if ((rankBeforeGroup === rankBeforeGroup2 && inputData.group !== rankBeforeGroup2)
      || (inputData.group !== rankBeforeGroup && inputData.group !== rankBeforeGroup2)
      || rankBeforeIndex === 0 && inputData.group !== rankBeforeGroup) return "Invalid group";
    if (rankBeforeGroup !== rankBeforeGroup2 && inputData.group === rankBeforeGroup2) changeGroup = true;
    if (editingRank && inputData.group === LIBRARY_SETTINGS.group[LIBRARY_SETTINGS.ranks.indexOf(inputData.editRank)]) changeGroup = false;
  }

  // if no rankBefore => add it at the top (before Sr CL4)
  let rankBeforeTop;
  if (!inputData.rankBefore) {
    inputData.rankBefore = LIBRARY_SETTINGS.adminRanks[0];
    rankBeforeTop = LIBRARY_SETTINGS.adminRanks[LIBRARY_SETTINGS.adminRanks.length - 1];
  }

  // If Editing => check if hierarchy changed => remove previous rank location
  const hierarchyChange = (LIBRARY_SETTINGS.ranks.indexOf(inputData.editRank) + 1 !== LIBRARY_SETTINGS.ranks.indexOf(inputData.rankBefore) && editingRank);

  // Determining if we're doing anything with promotion reqs
  // editReq = 0 if no, 1 if yes
  let editReq = 1
  if (inputData.promoReqs.length <= 0 && inputData.minMeritScore <= 0) editReq = 0;

  // Make sure that if promo reqs were all removed, it still registers it as a change in reqs
  try {
    if (editReq === 0 && editingRank && reqsDisabled.toString() === "false") {
      editReq = LIBRARY_SETTINGS.promoReqs[LIBRARY_SETTINGS.ranks.indexOf(inputData.editRank)].length > 0 ? 1 : editReq;
    }
  } catch(e) {
    editReq = editReq;
  }

  // editReq = reqsDisabled.toString() === "true" ? 0 : editReq;
  editReq = reqsBeingEnabled === true ? 1 : editReq;

  console.log(`editReq: ${editReq}`);

  // Store the amount of rows the rank had before making any edits
  // Only for editingRank
  let rownum = 0;
  if (editingRank) {
    rownum = (getLastRankRow(inputData.editRank) - getStartRankRow(inputData.editRank) + 2);
  }

  for (let i = 0; i <= editReq; i++) {
    let insertRow;
    let lastPromoRank;
    let lastBeforeRow;
    let sheet = getCollect(LIBRARY_SETTINGS.rosterIds[i]);

    lastBeforeRow = rankBeforeTop ? getLastRankRow(rankBeforeTop, i) : getLastRankRow(inputData.rankBefore, i);
    if (!lastBeforeRow) lastBeforeRow = LIBRARY_SETTINGS.dataCols.firstReqRow;

    if (editingRank) {
      // Editing existing rank

      let startRankRow = getStartRankRow(inputData.editRank, i);
      let lastRankRow = getLastRankRow(inputData.editRank, i);

      // Always remove rank from promo progress (won't error if not applicable)
      if (i === 1) {
        removeRank(inputData.editRank, false, i, true);

        // Determine where to place rank on promo progress, as not all ranks will have promo reqs
        lastPromoRank = sheet.getRange(sheet.getMaxRows() - 2, LIBRARY_SETTINGS.dataCols.rank).getValue();
        if (lastPromoRank !== "" && LIBRARY_SETTINGS.ranks.indexOf(lastPromoRank) >= LIBRARY_SETTINGS.ranks.indexOf(inputData.rankBefore)) {
          lastBeforeRow = sheet.getMaxRows() - 2;
        }
      }

      // Change title of rank if applicable
      if (startRankRow && lastRankRow &&  i === 0) {
        // title changed without hierarchy change?
        if (inputData.title !== inputData.editRank) {

          sheet.getRange(startRankRow, LIBRARY_SETTINGS.dataCols.firstCol).setValue(inputData.title);
          for (let j = startRankRow; j <= lastRankRow; j++) {
            sheet.getRange(j ,LIBRARY_SETTINGS.dataCols.rank).setValue(inputData.title);
          }
        }
      }

      if (hierarchyChange) {
        // Order of ranks changed?

        if (i === 1) {
          // Editing promo progress
          if ((inputData.promoReqs.length > 0 || inputData.minMeritScore > 0)) {
            // Only edit if there are promo reqs being added

            addReqRank(sheet, lastBeforeRow, inputData);
          }
        } else {
          console.log(`changeGroup: ${changeGroup}`);
          // Editing roster
          let moveBefore;
          if (changeGroup) {
            moveBefore = getStartRankRow(LIBRARY_SETTINGS.ranks[rankBeforeIndex - 1]);
            sheet.moveRows(sheet.getRange(startRankRow, 1, rownum, sheet.getMaxColumns()), moveBefore - 1);
          } else {
            moveBefore = getLastRankRow(inputData.rankBefore);
            sheet.moveRows(sheet.getRange(startRankRow, 1, rownum, sheet.getMaxColumns()), moveBefore + 2)
          }
        }

      } else {
        // Order of ranks remained the same

        if (i === 1) { 
          // Editing promo progress
          if ((inputData.promoReqs.length > 0 || inputData.minMeritScore > 0)) {
            console.log(inputData.promoReqs)
            addReqRank(sheet, lastBeforeRow, inputData);
          }

          if (changeGroup) {
            sheet.moveRows(sheet.getRange(startRankRow, 1, rownum, sheet.getMaxColumns()), getStartRankRow(LIBRARY_SETTINGS.ranks[rankBeforeIndex - 1]) - 1);
          }
        }
      }

    } else {
      // Adding new rank

      // Determine where to place rank on promo progress, as not all ranks will have promo reqs
      if (i === 1) {
        lastPromoRank = s.getRange(s.getMaxRows() - 2, LIBRARY_SETTINGS.dataCols.rank).getValue();
        if (lastPromoRank !== "" && LIBRARY_SETTINGS.ranks.indexOf(lastPromoRank) >= LIBRARY_SETTINGS.ranks.indexOf(inputData.rankBefore)) {
          lastBeforeRow = s.getMaxRows() - 2;
        }
      }
      
      /* Insert new rank / move rank
        |-> move rank is more of a "remove & re-add" rather than just moving it 
      */
      sheet.insertRowAfter(lastBeforeRow + 1);
      sheet.insertRowAfter(lastBeforeRow);
      sheet.moveRows(sheet.getRange(lastBeforeRow + 1, 1), lastBeforeRow + 3);
      insertRow = lastBeforeRow + 2;

      // Different borders to style for roster & promo progress
      if (i === 1) {
        addReqRank(sheet, lastBeforeRow, inputData);
      } else {
        originalBorderPairs.forEach(cellpair => {
          let numcols = (cellpair[1] - cellpair[0]) + 1;
          let r = sheet.getRange(insertRow, cellpair[0], 1, numcols);
          r.setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
          r.setBorder(null, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
        });

        // Map formulas into usable format (replace /row/ & /title/)
        let insertData;
        insertData = LIBRARY_SETTINGS.newRowData.map(col => 
          col.map(value => {
            if (typeof value === "string") {
              return value.replace(/\/row\//g, insertRow).replace(/\/title\//g, inputData.title);
            }
            return value;
          })
        );

        // Insert data
        sheet.getRange(insertRow, LIBRARY_SETTINGS.dataCols.firstCol, 1, insertData[0].length).setValues(insertData);

        // Set Task Assigned? && reqs completed? to a checkbox - always
        sheet.getRange(insertRow, LIBRARY_SETTINGS.dataCols.taskAssigned).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
        sheet.getRange(insertRow, LIBRARY_SETTINGS.dataCols.taskAssigned + 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());

        if (changeGroup) {
          sheet.moveRows(sheet.getRange(insertRow - 1, 1, 2, sheet.getMaxColumns()), getStartRankRow(LIBRARY_SETTINGS.ranks[rankBeforeIndex - 1]) - 1);
        }
      }
    }
  }

  // Don't add empty 2D array to promoReqs if no reqs were added
  inputData.promoReqs = inputData.promoReqs.length > 0 ? inputData.promoReqs : [];

  // Setting Operations ***************************************************************

  // Prepare settings
  let rankIndex = LIBRARY_SETTINGS.ranks.indexOf(inputData.editRank);

  if (hierarchyChange || !editingRank) {
    if (editingRank) {
      // Remove previous rank from settings if hierarchy changed

      LIBRARY_SETTINGS.ranks.splice(rankIndex, 1);
      LIBRARY_SETTINGS.folders.splice(rankIndex, 1);
      LIBRARY_SETTINGS.interviewRequired.splice(rankIndex, 1);
      LIBRARY_SETTINGS.promoReqs.splice(rankIndex, 1);
      LIBRARY_SETTINGS.group.splice(rankIndex, 1);

      if (LIBRARY_SETTINGS.modRanks.includes(inputData.editRank)) {
        rankIndex = LIBRARY_SETTINGS.modRanks.indexOf(inputData.editRank);
        LIBRARY_SETTINGS.modRanks.splice(rankIndex, 1);
      }
    }

    rankIndex = LIBRARY_SETTINGS.ranks.indexOf(inputData.rankBefore);

    // Settings if hierarchy changed => remove & add new
    LIBRARY_SETTINGS.folders.splice(rankIndex, 0, {
      "viewerAccess": viewerFolders,
      "editorAccess": editorFolders
    });

    LIBRARY_SETTINGS.interviewRequired.splice(rankIndex, 0, inputData.interviewRequired);
    LIBRARY_SETTINGS.promoReqs.splice(rankIndex, 0, inputData.promoReqs);
    LIBRARY_SETTINGS.group.splice(rankIndex, 0, inputData.group);
    LIBRARY_SETTINGS.minMeritScore.splice(rankIndex, 0, Number(inputData.minMeritScore));

    LIBRARY_SETTINGS.ranks.splice(rankIndex, 0, inputData.title); // Always change last
  } else {
    // Settings if no hierarchy change => replace existing
    LIBRARY_SETTINGS.folders.splice(rankIndex, 1, {
      "viewerAccess": viewerFolders,
      "editorAccess": editorFolders
    });

    LIBRARY_SETTINGS.interviewRequired.splice(rankIndex, 1, inputData.interviewRequired);
    LIBRARY_SETTINGS.promoReqs.splice(rankIndex, 1, inputData.promoReqs);
    LIBRARY_SETTINGS.group.splice(rankIndex, 1, inputData.group);
    LIBRARY_SETTINGS.minMeritScore.splice(rankIndex, 1, Number(inputData.minMeritScore));
    
    if (!hierarchyChange && inputData.title !== inputData.editRank && editingRank) {
      LIBRARY_SETTINGS.ranks.splice(rankIndex, 1, inputData.title); // Always change last
    }
  }

  // Change in mod/manager ranks
  if (editingRank) {
    if (LIBRARY_SETTINGS.modRanks.includes(inputData.editRank)) {
      LIBRARY_SETTINGS.modRanks.splice(LIBRARY_SETTINGS.modRanks.indexOf(inputData.editRank), 1, inputData.title);
    }

    if (LIBRARY_SETTINGS.managerRanks.includes(inputData.editRank)) {
      LIBRARY_SETTINGS.managerRanks.splice(LIBRARY_SETTINGS.managerRanks.indexOf(inputData.editRank), 1, inputData.title);
    }
  }

  // ********************************************************************************

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
    userData.promoReqs = inputData.promoReqs;
    userData.reqsDisabled = LIBRARY_SETTINGS.reqsDisabled;
    userData.minMeritScore = inputData.minMeritScore;
    
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
  if (!isInit) throw new Error("Library is not yet initialized");

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
  r.setBackground(LIBRARY_SETTINGS.rosterHex);
  r.clearContent();

  // Only do this if there is margin on the right (less then max (5) reqs)
  // If not, this might create extra columns
  if (12 - cellpair[1] > 0) {
    r = s.getRange(insertRow, cellpair[1] + 1, 1, 12 - cellpair[1]);
    r.setBackground(LIBRARY_SETTINGS.rosterHex);
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

  for (let j = cellpair[0]; j <= 13; j++) {
    r = s.getRange(insertRow, j);

    if (j <= cellpair[1]) {
      let rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
      r.setDataValidation(rule);
      r.setBackground("#666666");
      s.getRange(insertRow - 1, j).setBackground("#434343");
    } else {
      r.clearDataValidations();
      r.setBackground(LIBRARY_SETTINGS.rosterHex);
      r.clearContent();
    }
  }
}

/**
 * Add num amount of extra slots to the rank passed in as arg
 * @param {String} rank - Name of the rank to add a slot to
 * @param {Object} userData
 * @param {Array[Array]} borderPairs (optional) - default: undefined
 * @param {Number} num (optional) - default: 1
 * @param {Boolean} discordnotif (optional) - Send a discord notification or not, default: true
 * @returns {Void|String}
 */
function addRankRow(rank, userData, num = 1, discordnotif = true, borderPairs = undefined) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!rank) return "no";

  if (!borderPairs) borderPairs = [
    [5, 8], 
    [10, LIBRARY_SETTINGS.dataCols.blacklistEnd - 1], 
    [LIBRARY_SETTINGS.dataCols.notes, LIBRARY_SETTINGS.dataCols.notes]
  ]
  console.log(`num: ${num}`)

  let rowData = getFirstRankRow(rank);
  let lastRankRow = getLastRankRow(rank);
  let startMergedRange = getStartRankRow(rank);
  let reps = 0;

  do {
    if (reps > 0) Utilities.sleep(1000);
    
    lastRankRow = getLastRankRow(rank);

    if (!lastRankRow && reps > 10) throw new Error(`Could not find start or end row: ${startRow}, ${endRow}`);
  } while (!lastRankRow)

  let insertRow = lastRankRow + 1;
  let sheet = rowData[1];

  let insertData = [];
  let promoReqData = [];
  for (let i = 0; i < num; i++) {
    // Insert Row & Data
    const singleData = LIBRARY_SETTINGS.newRowData.map(col => 
      col.map(value => {
        if (typeof value === "string") {
          return value.replace(/\/row\//g, insertRow + i).replace(/\/title\//g, rank);
        }
        return value;
      })
    );

    insertData.push(singleData.flat());
    promoReqData.push(LIBRARY_SETTINGS.reqsDisabled.toString() === "true" 
      ? ["N/A"]
      : LIBRARY_SETTINGS.promoReqs[LIBRARY_SETTINGS.ranks.indexOf(rank)].length > 0 
      ? [`= REQS_CHECK(F${insertRow + i}, 'Promotion Progress'!F:F, 'Promotion Progress'!H:M)`] 
      : ["N/A"]);
  }

  sheet.insertRowsAfter(lastRankRow, num)
  sheet.getRange(insertRow, LIBRARY_SETTINGS.dataCols.firstCol, num, insertData[0].length).setValues(insertData);
  sheet.getRange(insertRow, LIBRARY_SETTINGS.dataCols.taskAssigned + 1, promoReqData.length, 1).setValues(promoReqData);

  borderPairs.forEach(cellpair => {
    let numcols = (cellpair[1] - cellpair[0]) + 1;
    // Set border styling
    sheet.getRange(insertRow, cellpair[0], num, numcols).setBorder(null, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    sheet.getRange(insertRow, cellpair[0], num, numcols).setBorder(true, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
    sheet.getRange(startMergedRange, cellpair[0], 1, numcols).setBorder(true, true, null, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    sheet.getRange(startMergedRange, cellpair[0], 1, numcols).setBorder(null, null, true, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);

    let mergedRange = sheet.getRange(startMergedRange, LIBRARY_SETTINGS.dataCols.firstCol, ((insertRow + num) - startMergedRange), 1);
    mergedRange.breakApart();
    mergedRange.merge();
    mergedRange.setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
  });

  if (discordnotif) sendDiscordConfigRankRow(rank, true, userData, num);
}

/**
 * Remove a slot from the rank (name) passed in as arg
 * @param {String} rank - Name of rank to remove a slot from
 * @param {Object} userData
 * @param {Number} num (optional) - default: 1
 * @param {Array[Array]} borderPairs (optional) - default: null
 * @returns {Void|String}
 */
function removeRankRow(rank, userData, num = 1, borderPairs = null) {
  for (let i = 1; i <= num; i++) {
    const rowData = getFirstRankRow(rank);
    const lastRankRow = getLastRankRow(rank);
    const startRankRow = getStartRankRow(rank);
    const sheet = rowData[1];

    if (!borderPairs) borderPairs = [
      [5, 8], 
      [10, LIBRARY_SETTINGS.dataCols.blacklistEnd - 1], 
      [LIBRARY_SETTINGS.dataCols.notes, LIBRARY_SETTINGS.dataCols.notes]
    ]

    if (rowData[0] == 0) return "Remove Rank Instead";
    if (startRankRow === lastRankRow || sheet.getRange(lastRankRow, LIBRARY_SETTINGS.dataCols.name, 1, 1).getDisplayValue() !== "") return "Population";

    sheet.deleteRow(lastRankRow);

    borderPairs.forEach(cellpair => {
      let numcols = (cellpair[1] - cellpair[0]) + 1;
      sheet.getRange(lastRankRow, cellpair[0], 1, numcols).setBorder(true, null, null, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    });

  }

  sendDiscordConfigRankRow(rank, false, userData, num);
}

/**
 * Add a rank slot to the pomotion requirements sheet
 * @param {String} rank
 * @param {Number} num (optional)
 * @param {Array[]} borderPairs (optional)
 */
// :hardcode
function addReqRow(rank, num = 1, borderPairs = [[3, 3], [5, 6]], promoReqs = [], minMeritScore) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!rank) return "no";
  if (num === 0) num = 1;
  const hasMinMerits = minMeritScore > 0 ? 1 : 0;

  // Add third (custom) if no borderPair provided
  // if (promoReqs.length <= 0) promoReqs = LIBRARY_SETTINGS.promoReqs[LIBRARY_SETTINGS.ranks.indexOf(rank)];
  // :hardcode
  if (borderPairs.length === 2) borderPairs.push([8, 7 + promoReqs.length + hasMinMerits]);
  const sheet = getCollect(LIBRARY_SETTINGS.rosterIds[LIBRARY_SETTINGS.rosterIds.length - 1]);

  console.log(borderPairs);

  const rows = sheet.getMaxRows();
  const rankCol = LIBRARY_SETTINGS.dataCols.rank;
  let startRow;
  let endRow;
  let reps = 0;

  // Get start & end rows of the rank (for reference)
  do {
    if (reps > 0) Utilities.sleep(500);

    for (let i = 8; i <= rows; i++) {
      if (sheet.getRange(i, rankCol).getValue() === rank && !startRow) {
        startRow = i;
      }

      if (sheet.getRange(i, rankCol).getValue() !== rank && sheet.getRange(i - 1, rankCol).getValue() === rank && !endRow) {
        endRow = i;
      }
    }

    if ((!startRow || !endRow) && reps > 50) throw new Error(`Could not find start or end row: ${startRow}, ${endRow}`);
    reps++;
  } while (!startRow || !endRow)

  let insertRow = startRow + 1;

  console.log(promoReqs);

  let reqs = [];
  for (let i = 0; i < num; i++) {
    let reqFormulas = promoReqs.map((v, j) => `= IS_REQ_COMPLETED('Requirement Logs'!E:E, F${insertRow + i}, 'Requirement Logs'!G:G, D${insertRow + i}, 'Requirement Logs'!H:H, $${String.fromCharCode(72 + j)}$${startRow - 1}, 'Requirement Logs'!C:C, ${Number(v.logcount)}, ${Number(v.expirydays)})`);
    hasMinMerits === 1 && reqFormulas.push(`= HAS_MIN_MERITS(GET_MERIT_COUNT(F${insertRow + i}, 'Merit Logs'!I:I, 'Merit Logs'!C:C, 'Merit Logs'!E:E), ${Number(minMeritScore)})`);
    const preData = [rank, "", "", ""];
    const insertData = preData.concat(reqFormulas);
    reqs.push(insertData);
  }

  // Insert row
  sheet.insertRowsAfter(startRow, num);
  borderPairs.forEach(cellpair => {
    const numcols = (cellpair[1] - cellpair[0]) + 1;

    console.log(`${cellpair} -> ${numcols}`);

    // Set border styles
    sheet.getRange(insertRow, cellpair[0], num, numcols).setBorder(null, true, null, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    sheet.getRange(insertRow, cellpair[0], num, numcols).setBorder(true, null, true, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
    sheet.getRange((endRow + num) - 1, cellpair[0], 1, numcols).setBorder(null, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);

    // clear data
    if (cellpair[0] === 8) {
      // Set formulas to automatically check completion
      sheet.getRange(insertRow, 4, num, reqs[0].length).setValues(reqs);
    }
  });

  // Merge rank title
  const mergeRange = sheet.getRange(startRow, LIBRARY_SETTINGS.dataCols.firstCol, (endRow + num) - startRow, 1);
  mergeRange.merge();
  mergeRange.setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
}

// :hardcode
function removeReqRow(rank, num = 1, borderPairs = [[3, 3], [5, 6]]) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!rank) return "no";

  const hasMinMerits = LIBRARY_SETTINGS.minMeritScore[LIBRARY_SETTINGS.ranks.indexOf(rank)] > 0 ? 1 : 0;;
  borderPairs.push([8, 7 + LIBRARY_SETTINGS.promoReqs[LIBRARY_SETTINGS.ranks.indexOf(rank)].length + hasMinMerits]);

  // :hardcode roster length
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
  let rankIndex = LIBRARY_SETTINGS.ranks.indexOf(rank);
  if ((!rank || rankIndex < 0) && !override) return "Invalid rank";

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
    LIBRARY_SETTINGS.group.splice(rankIndex, 1);

    if (LIBRARY_SETTINGS.modRanks.includes(rank)) {
      rankIndex = LIBRARY_SETTINGS.modRanks.indexOf(rank);
      LIBRARY_SETTINGS.modRanks.splice(rankIndex, 1);
    }

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
  return ["Success", LIBRARY_SETTINGS];
}

/**
 * Throws an error if there are no supervisor columns to delete
 * @param {Boolean} value - false: enabling, true: disabling
 */
function supervisors_toggle(value) {
  const roster = getCollect(LIBRARY_SETTINGS.rosterIds[0]);

  if (value) {
    // Disabling supervisors
    if (roster.getRange(4, LIBRARY_SETTINGS.dataCols.blacklistEnd + 1).getValue() !== "Supvr Name") throw new Error("Supervisors are not properly configured");
    roster.deleteColumns(LIBRARY_SETTINGS.dataCols.blacklistEnd + 1, 3);
  } else {
    // Enabling supervisors
    if (roster.getRange(4, LIBRARY_SETTINGS.dataCols.blacklistEnd + 1).getValue() === "Supvr Name") throw new Error("Supervisors are not properly configured");

    // Add two columns (supervisor name & playerId)
    ["", "", ""].forEach(() => roster.insertColumnAfter(LIBRARY_SETTINGS.dataCols.blacklistEnd));
    
    // Styling columns
    const col1 = LIBRARY_SETTINGS.dataCols.blacklistEnd + 1;
    const col2 = LIBRARY_SETTINGS.dataCols.blacklistEnd + 2;

    roster.setColumnWidth(col1, 164);
    roster.setColumnWidth(col2, 114);

    roster.getRange(4, col1, 1, 2)
      .setBackground("#434343")
      .setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK)
      .setBorder(null, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID)
      .setFontColor("#ffffff")
      .setVerticalAlignment("middle")
      .setHorizontalAlignment("center")
      .setFontWeight("bold");

    roster.getRange(4, col1).setValue("Supvr Name");
    roster.getRange(4, col2).setValue("Supvr PlayerID");

    // Style supervisor slots
    let [startcol, currRank] = [0, ""];
    for (let i = 8; i < roster.getMaxRows(); i++) {
      const rank = roster.getRange(i, 4).getValue();
      const nextRank = roster.getRange(i + 1, 4).getValue();

      if (rank === "") continue;

      // Styling for ranks with a special supervisor (who can't be assigned one)
      if (LIBRARY_SETTINGS.adminRanks.includes(rank)) {
        if (rank === LIBRARY_SETTINGS.adminRanks[LIBRARY_SETTINGS.adminRanks.length - 1]) {
          roster.getRange(i, col1, 1, 2).setValues([["N/A", "N/A"]]);
        } else {
          // :hardcode
          roster.getRange(i, col1, 1, 2).setValues([["OSM Liaison", "OSM Liaison"]]);
        }
      }

      // nex rank found? -> store and continue if nextRank is equal
      if (!currRank) {
        currRank = rank;
        startcol = i;
        if (rank === nextRank) {
          continue;
        }
      }

      // Found end of rank
      if (rank !== nextRank) {
        roster.getRange(startcol, col1, i - startcol + 1, 2)
          .setBackground("#666666")
          .setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK)
          .setBorder(null, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID)
          .setFontColor("#ffffff")
          .setVerticalAlignment("middle")
          .setHorizontalAlignment("center")
          .setFontSize(10)
          .setFontFamily("Lexend");

        currRank = "";
      }
    }
  }
}