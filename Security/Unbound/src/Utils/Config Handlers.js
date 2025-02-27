/**
 * Add one extra slot to the rank passed in as arg
 * @param {String} rank - Name of the rank to add a slot to
 * @returns {Void|String}
 */
function AddRankRow(rank) {
  if (!rank) return "no";
  const rowData = GetFirstRankRow(rank);
  const lastRankRow = GetLastRankRow(rank);
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
  sheet.insertRowAfter(rowData[0]);
  sheet.getRange(insertRow, 4, 1, 14).setValues([[
    rank, "", "", "", "", "", 
    `= INFRACTIONS(F${insertRow}, Infractions!E:E, Infractions!C:C, Infractions!H:H, Infractions!I:I)`,
    `= STATUS(F${insertRow}, G${insertRow}, E${insertRow}, H${insertRow}, 'LOA Logs'!E:E, N${insertRow}, Infractions!H:H, Infractions!E:E, Infractions!I:I, Infractions!C:C, P${insertRow})`,
    "",
    `= LAST_RANKCHANGE(F${insertRow}, 'Rank Changes'!E:E, 'Rank Changes'!C:C)`,
    `= LOA_DATE(F${insertRow}, 'LOA Logs'!E:E, 'LOA Logs'!G:G)`,
    false,
    `= BLACKLIST_DATE(F${insertRow}, 'Suspensions / Blacklists'!E:E, 'Suspensions / Blacklists'!C:C)`, ""
  ]]);

  if (specialRow) {
    [[5, 8], [10, 15], [17, 17]].forEach(cellpair => {
      let numcols = (cellpair[1] - cellpair[0]) + 1;
      sheet.getRange(insertRow, cellpair[0], 1, numcols).setBorder(null, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      sheet.getRange(insertRow, cellpair[0], 1, numcols).setBorder(true, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
    });
    const startMergedRange = GetStartRankRow(rank);
    sheet.getRange(startMergedRange, 3, ((insertRow - startMergedRange) + 1), 1).merge();
  }

  SendDiscordConfigRankRow(rank, true);
}

/**
 * Remove a slot from the rank (name) passed in as arg
 * @param {String} rank - Name of rank to remove a slot from
 * @returns {Void|String}
 */
function RemoveRankRow(rank) {
  const rowData = GetFirstRankRow(rank);
  const lastRankRow = GetLastRankRow(rank);
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
    [[5, 8], [10, 15], [17, 17]].forEach(cellpair => {
      let numcols = (cellpair[1] - cellpair[0]) + 1;
      sheet.getRange(removeRow, cellpair[0], 1, numcols).setBorder(true, null, null, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    });
  }

  SendDiscordConfigRankRow(rank, false);
}

function ToggleManualEditing(value) {
  value = value == true ? false : true;
  PropertiesService.getScriptProperties().setProperty("manualEnabled", value);
  SendDiscordConfig("manualEdit", value);
}

function ReturnManualEditing() {
  let properties = PropertiesService.getScriptProperties();
  let manualValue = properties.getProperty("manualEnabled");
  console.log(manualValue);

  return manualValue;
}

function ToggleSheetRestore(value) {
  PropertiesService.getScriptProperties().setProperty("restoreType", value);
  SendDiscordConfig("restoreType", value);
}

function ReturnRestoreType() {
  let properties = PropertiesService.getScriptProperties();
  let restoreValue = properties.getProperty("restoreType");
  console.log(restoreValue);

  return restoreValue;
}

function ToggleBackup(value) {
  PropertiesService.getScriptProperties().setProperty("backupEnabled", value);
  SendDiscordConfig("backup", value);
}

function ReturnBackup() {
  let properties = PropertiesService.getScriptProperties();
  let backupValue = properties.getProperty("backupEnabled");
  console.log(backupValue);

  return backupValue;
}

function ToggleLockdown(value) {
  PropertiesService.getScriptProperties().setProperty("lockdownEnabled", value);
  if (value) {
    RemoveAllDocAccess();
  } else {
    RestoreAllDocAccess();
  }
  SendDiscordConfig("lockdown", value);
}

function ReturnLockdown() {
  let properties = PropertiesService.getScriptProperties();
  let lockdownValue = properties.getProperty("lockdownEnabled");
  console.log(lockdownValue);

  return lockdownValue;
}

function ResetPermissions() {
  RemoveAllDocAccess();
  RestoreAllDocAccess();
  console.log("Staff Documentation Permissions reset");
  SendDiscordConfig("resetPerms", null);
  PermissionsGuard();
}

function GetLastBackupTime() {
  const backupTime = JSON.parse(PropertiesService.getScriptProperties().getProperty("backupTime"));
  const backupDate = backupTime ? new Date(backupTime) : new Date();
  const date = new Date();
  return Math.round(((date.valueOf() - backupDate.valueOf()) / 60000));
}

/**
 * Used when initializing a lockdown, removes all access to all folders
 */
function RemoveAllDocAccess() {
  let unaffected = ["micheal.labus@gmail.com", "rykitala@gmail.com"];
  let folders = JSON.parse(PropertiesService.getScriptProperties().getProperty("folders"));
  const allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));
  const sheet = getCollect(2063800821);

  sheet.getRange(6, 8, (sheet.getMaxRows() - 6), 1).getValues().forEach((email, i) => {
    if (!email[0] || !email[0].includes("@")) return;
    i = i + 6;
    if (sheet.getRange(i, 4).getValue() !== "Security Chief" && sheet.getRange(i, 4).getValue() !== "Site Management") return;
    unaffected.push(email[0].toLowerCase());
  });

  unaffected = unaffected.concat(allowedStaff);

  folders[2].forEach(folderID => {
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
 * Restores all document access for all staff members, used when lockdown is deactivated
 */
function RestoreAllDocAccess() {
  let allStaff = GetAllEmails();
  let folders = JSON.parse(PropertiesService.getScriptProperties().getProperty("folders"));
  let ranks = JSON.parse(PropertiesService.getScriptProperties().getProperty("ranks"));
  const allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));
  let unaffected = ["dontorro208@gmail.com", "micheal.labus@gmail.com", "rykitala@gmail.com"];
  const sheet = getCollect(2063800821);
  unaffected = unaffected.concat(allowedStaff);

  sheet.getRange(6, 8, (sheet.getMaxRows() - 6), 1).getValues().forEach((email, i) => {
    if (!email[0] || !email[0].includes("@")) return;
    i = i + 6;
    if (sheet.getRange(i, 4).getValue() !== "Security Chief" && sheet.getRange(i, 4).getValue() !== "Site Management") return;
    unaffected.push(email[0].toLowerCase());
  });

  allStaff.forEach(email => {
    if (unaffected.includes(email)) return;
    let userData = GetUserData(email);
    AddDocAccess(folders[ranks.indexOf(userData.rank)], email);
  });
}

function GetSpreadsheetData(inputValue) {
  if (!inputValue) return;
  // Always Checks Column 8 => might make this configurable in the future
  const sheets = [
    { id: 789793193, label: "Rank Change" },
    { id: 343884184, label: "Infraction" },
    { id: 977408594, label: "LOA Log" },
    { id: 1787594911, label: "Suspension / Blacklist Log" },
  ];

  const results = [];

  sheets.forEach(sheetInfo => {
    try {
      const sheet = getCollect(sheetInfo.id);
      const sheetName = sheet.getName();

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

  Logger.log(`Combined Results: ${JSON.stringify(results)}`);
  return JSON.stringify(results);
}