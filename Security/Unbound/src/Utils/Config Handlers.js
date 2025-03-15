function SubmitChange(changes) {
  const changeArray = changes.split(/\s*,\s*/);
  PropertiesService.getScriptProperties().setProperty("lastestChangeLog", JSON.stringify({
    fields: changeArray,
    date: new Date()
  }));
  RosterService.sendDiscordChangeLog(changeArray, ScriptApp.getService().getUrl().toString());
}

function GetChangeNotes() {
  return PropertiesService.getScriptProperties().getProperty("lastestChangeLog");
}

function GetRanks() {
  return JSON.stringify(LIBRARY_SETTINGS.ranks);
}

function AddNewRank(inputData) {
  if (!inputData) return "No input data";
  
  let valid = false;
  let message = inputData.editRank === "" ? `Successfully added ${inputData.title}`: `Successfully edited ${inputData.editRank}`;
  let viewerFolders = [];
  let editorFolders = [];
  valid = RosterService.filterQuotes(inputData);

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
    rownum = RosterService.getLastRankRow(inputData.editRank) - RosterService.getStartRankRow(inputData.editRank);
    valid = RemoveRank(inputData.editRank, false);
    if (valid !== "Success") return "Cannot move a rank with active members";
  }

  const s = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);

  // title changed without hierarchy change?
  if (!hierarchyChange && inputData.title !== inputData.editRank && inputData.editRank !== "") {
    const firstRankRow = RosterService.getStartRankRow(inputData.editRank)
    s.getRange(firstRankRow, 3).setValue(inputData.title);
    const lastRankRow = RosterService.getLastRankRow(inputData.editRank);

    for (let i = firstRankRow; i <= lastRankRow; i++) {
      s.getRange(i, 4).setValue(inputData.title);
    }
  }

  // Insert into roster if new rank or hierarchy change
  if (hierarchyChange || inputData.editRank === "") {
    const lastBeforeRow = RosterService.getLastRankRow(inputData.rankBefore);

    s.insertRowAfter(lastBeforeRow + 1);
    s.insertRowAfter(lastBeforeRow);
    s.moveRows(s.getRange(lastBeforeRow + 1, 1), lastBeforeRow + 3);
    const insertRow = lastBeforeRow + 2;

    [[3, 3], [5, 8], [10, 15], [17, 17]].forEach(cellpair => {
      let numcols = (cellpair[1] - cellpair[0]) + 1;
      s.getRange(insertRow, cellpair[0], 1, numcols).setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      s.getRange(insertRow, cellpair[0], 1, numcols).setBorder(null, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
    });

    s.getRange(insertRow, 3, 1, 15).setValues([[
      inputData.title, inputData.title, "", "", "", "", "", 
      `= INFRACTIONS(F${insertRow}, Infractions!E:E, Infractions!C:C, Infractions!H:H, Infractions!I:I)`,
      `= STATUS(F${insertRow}, G${insertRow}, E${insertRow}, H${insertRow}, 'LOA Logs'!E:E, N${insertRow}, Infractions!H:H, Infractions!E:E, Infractions!I:I, Infractions!C:C, P${insertRow})`,
      "",
      `= LAST_RANKCHANGE(F${insertRow}, 'Rank Changes'!E:E, 'Rank Changes'!C:C)`,
      `= LOA_DATE(F${insertRow}, 'LOA Logs'!E:E, 'LOA Logs'!G:G)`,
      false,
      `= BLACKLIST_DATE(F${insertRow}, 'Suspensions / Blacklists'!E:E, 'Suspensions / Blacklists'!H:H, 'Suspensions / Blacklists'!J:J)`, ""
    ]]);
  }

  if (hierarchyChange) AddRankRow(inputData.title, rownum, false);

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

  // Update settings
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));
  RosterService.init(LIBRARY_SETTINGS);

  if (inputData.editRank == "") {
    RosterService.sendDiscordNewRank(inputData.title);
  } else {
    let userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
    userData.title = inputData.title;
    userData.editRank = inputData.editRank;
    userData.rankBefore = inputData.rankBefore;
    userData.viewerAccess = viewerFolders;
    userData.editorAccess = editorFolders;
    
    RosterService.sendDiscordConfig("rankEdit", false, userData);
  }
  return message;
}

/**
 * Remove an entire rank
 * @param {String} rank
 * @returns {String}
 */
function RemoveRank(rank, discordnotif = true) {
  const rankIndex = LIBRARY_SETTINGS.ranks.indexOf(rank);
  if (!rank || rankIndex < 0) return console.log("Invalid rank");

  let firstRankRow = RosterService.getFirstRankRow(rank);
  firstRankRow = firstRankRow[0];
  const startRankRow = RosterService.getStartRankRow(rank);
  const lastRankRow = RosterService.getLastRankRow(rank);

  if (firstRankRow != startRankRow) return console.log("Cannot remove a rank with active members");

  const sheet = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);
  sheet.deleteRows(startRankRow - 1, (lastRankRow - startRankRow) + 2);

  console.log(LIBRARY_SETTINGS);
  LIBRARY_SETTINGS.ranks.splice(rankIndex, 1);
  LIBRARY_SETTINGS.folders.splice(rankIndex, 1);
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));

  if (discordnotif) RosterService.sendDiscordNewRank(rank, false);
  return `Success`;
}

/**
 * Add one extra slot to the rank passed in as arg
 * @param {String} rank - Name of the rank to add a slot to
 * @param {Number} num (optional)
 * @returns {Void|String}
 */
function AddRankRow(rank, num = 1, discordnotif = true) {
  if (!rank) return "no";

  for (let i = 1; i <= num; i++) {
    const rowData = RosterService.getFirstRankRow(rank);
    const lastRankRow = RosterService.getLastRankRow(rank);
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
      `= BLACKLIST_DATE(F${insertRow}, 'Suspensions / Blacklists'!E:E, 'Suspensions / Blacklists'!H:H, 'Suspensions / Blacklists'!J:J)`, ""
    ]]);

    if (specialRow) {
      [[5, 8], [10, 15], [17, 17]].forEach(cellpair => {
        let numcols = (cellpair[1] - cellpair[0]) + 1;
        sheet.getRange(insertRow, cellpair[0], 1, numcols).setBorder(null, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
        sheet.getRange(insertRow, cellpair[0], 1, numcols).setBorder(true, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
      });
      const startMergedRange = RosterService.getStartRankRow(rank);
      sheet.getRange(startMergedRange, 3, ((insertRow - startMergedRange) + 1), 1).merge();
    } else {
      [[5, 8], [10, 15], [17, 17]].forEach(cellpair => {
        let numcols = (cellpair[1] - cellpair[0]) + 1;
        sheet.getRange(insertRow, cellpair[0], 1, numcols).setBorder(null, true, null, true, null, null,"black", SpreadsheetApp.BorderStyle.SOLID_THICK);
        sheet.getRange(insertRow, cellpair[0], 1, numcols).setBorder(true, null, true, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
      });
    }
  }

  if (discordnotif) RosterService.sendDiscordConfigRankRow(rank, true, JSON.parse(PropertiesService.getUserProperties().getProperty("userData")), num);
}

/**
 * Remove a slot from the rank (name) passed in as arg
 * @param {String} rank - Name of rank to remove a slot from
 * @param {Number} num (optional)
 * @returns {Void|String}
 */
function RemoveRankRow(rank, num = 1) {
  for (let i = 1; i <= num; i++) {
    const rowData = RosterService.getFirstRankRow(rank);
    const lastRankRow = RosterService.getLastRankRow(rank);
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

    const startRow = RosterService.getStartRankRow(rank);
    sheet.getRange(startRow, 3).setValue(rank);
  }

  RosterService.sendDiscordConfigRankRow(rank, false, JSON.parse(PropertiesService.getUserProperties().getProperty("userData")), num);
}

function ToggleTerminal(value) {
  PropertiesService.getUserProperties().setProperty("configShowTerminal", value);
  return PropertiesService.getUserProperties().getProperty("configShowTerminal");
}

function ReturnTerminalSetting() {
  return PropertiesService.getUserProperties().getProperty("configShowTerminal");
}

function ToggleManualEditing(value) {
  value = value == true ? false : true;
  PropertiesService.getScriptProperties().setProperty("manualEnabled", value);
  const sheet = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);
  sheet.getRange(10, 1).setValue(value);
  RosterService.sendDiscordConfig("manualEdit", value, JSON.parse(PropertiesService.getUserProperties().getProperty("userData")));
}

function ReturnManualEditing() {
  let properties = PropertiesService.getScriptProperties();
  let manualValue = properties.getProperty("manualEnabled");
  console.log(manualValue);

  return manualValue;
}

function ToggleBackup(value) {
  PropertiesService.getScriptProperties().setProperty("backupEnabled", value);
  RosterService.sendDiscordConfig("backup", value, JSON.parse(PropertiesService.getUserProperties().getProperty("userData")));
}

function ReturnBackup() {
  let properties = PropertiesService.getScriptProperties();
  let backupValue = properties.getProperty("backupEnabled");
  return backupValue;
}

function TogglePings(value) {
  LIBRARY_SETTINGS.pings = Boolean(value);
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));
  RosterService.init(LIBRARY_SETTINGS);
}

function ReturnPings() {
  return LIBRARY_SETTINGS.pings.toString();
}

function ToggleLockdown(value) {
  if (value) {
    RemoveAllDocAccess();
    PropertiesService.getScriptProperties().setProperty("backupEnabled", false);
  } else {
    RestoreAllDocAccess();
  }
  PropertiesService.getScriptProperties().setProperty("lockdownEnabled", value);
  RosterService.sendDiscordConfig("lockdown", value, JSON.parse(PropertiesService.getUserProperties().getProperty("userData")));
}

/**
 * @returns {String}
 */
function ReturnLockdown() {
  let properties = PropertiesService.getScriptProperties();
  let lockdownValue = properties.getProperty("lockdownEnabled");
  return lockdownValue;
}

function ResetPermissions() {
  RemoveAllDocAccess();
  RestoreAllDocAccess();
  console.log("Staff Documentation Permissions reset");
  RosterService.sendDiscordConfig("resetPerms", null, JSON.parse(PropertiesService.getUserProperties().getProperty("userData")));
  PermissionsGuard();
}

/**
 * @returns {Number}
 */
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
  let folders = LIBRARY_SETTINGS.folders;
  const allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));
  const sheet = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);

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
      RosterService.sendDiscordError(e);
      console.log(e);
    }
  });
}

/**
 * Restores all document access for all staff members, used when lockdown is deactivated
 */
function RestoreAllDocAccess() {
  let allStaff = RosterService.getAllEmails();
  const allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));
  let unaffected = ["dontorro208@gmail.com", "micheal.labus@gmail.com", "rykitala@gmail.com"];
  const sheet = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);
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
    let userData = RosterService.getUserData(email);
    RosterService.addDocAccess(LIBRARY_SETTINGS.ranks.indexOf(userData.rank), email);
  });
}

/**
 * @param {String} inputValue - SteamID that was input into the search bar
 */
function GetSpreadsheetData(inputValue) {
  if (!inputValue) return;
  // Always Checks Column 8 => might make this configurable in the future
  const sheets = [
    { id: LIBRARY_SETTINGS.rankchangeId, label: "Rank Change" },
    { id: 343884184, label: "Infraction" },
    { id: 977408594, label: "LOA Log" },
    { id: 1787594911, label: "Suspension / Blacklist Log" },
  ];

  const results = [];

  sheets.forEach(sheetInfo => {
    const sheet = RosterService.getCollect(sheetInfo.id);
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
      RosterService.sendDiscordError(error);
      Logger.log(`Error processing sheet ${sheetName}: ${error.message}`);
    }
  });

  Logger.log(`Combined Results: ${JSON.stringify(results)}`);
  return JSON.stringify(results);
}

/**
 * @param {String} rankToAdd
 * @param {String} currentRank
 */
function UpdateAccess(rankToAdd, currentRank) {
  if (rankToAdd === "") return;
  if (LIBRARY_SETTINGS.ranks.indexOf(rankToAdd) >= LIBRARY_SETTINGS.ranks.indexOf(currentRank) && currentRank !== "Blackshadow Staff") return;

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
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));
  RosterService.init(LIBRARY_SETTINGS);
  
  Logger.log(adminRankArray);
  return JSON.stringify(adminRankArray);
}

function RestoreSheet() {
  const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
  RosterService.restoreSheet();
  RosterService.sendDiscordConfig("restoreSpreadSheet", false, userData);
}

/**
 * Add a new specialization to the list / edit existing one
 * @param {String} title
 * @param {String} desc - description
 * @param {String} edit - title of specialization to edit
 * @returns {String}
 */
function AddSpec(title, desc, edit) {
  if (!title || !desc) return "Do not try to overcome validation";
  if (title.length > 20 || desc.length > 250) return "Do not try to overcome validation";

  let taken = true;
  LIBRARY_SETTINGS.specializations.forEach(spec => {
    if (spec.title.includes(title)) taken = false;
  })
  
  if (taken !== true && edit === "") return "Cannot have duplicate specializations";

  // Meaning we're adding a new one
  if (edit === "") {
    LIBRARY_SETTINGS.specializations.push({
      title: title,
      desc: desc
    });
  } else {
    let found = false;
    let nothingChanged = false;
    LIBRARY_SETTINGS.specializations.forEach((spec, i) => {
      if (spec.title === edit) {
        if (spec.title === title && spec.desc === desc) return nothingChanged = true;
        LIBRARY_SETTINGS.specializations.splice(i, 1, { title: title, desc: desc });
        found = true;
      }
    });
    if (nothingChanged) return "Nothing was edited"
    if (!found) return "Specialization not found";
  }

  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));
  RosterService.init(LIBRARY_SETTINGS);
  return `${edit === "" ? "Specialization Added" : "Specialization Edited"}`;
}

/**
 * @param {String} title
 */
function RemoveSpec(title) {
  if (!title) return "No title provided";

  let found = false;
  LIBRARY_SETTINGS.specializations.forEach((spec, i) => {
    if (spec.title === title) {
      LIBRARY_SETTINGS.specializations.splice(i, 1);
      found = true;
    }
  });
  if (!found) return "Specialization not found";

  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));
  RosterService.init(LIBRARY_SETTINGS);
  return "Specialization Removed";
}

/**
 * @param {String} title
 * @returns {JSON.string}
 */
function GetSpecContent(title) {
  let returnArray = [];
  LIBRARY_SETTINGS.specializations.forEach(spec => {
    if (spec.title === title) {
      returnArray = [spec.title, spec.desc];
    }
  });
  return JSON.stringify(returnArray);
}

/**
 * @param {String} title
 */
function GetRankContent(title) {
  let returnArray = [];
  LIBRARY_SETTINGS.ranks.forEach((rank, i) => {
    if (rank === title) {
      returnArray = [
        rank,
        LIBRARY_SETTINGS.ranks[i + 1],
        LIBRARY_SETTINGS.folders[i].viewerAccess,
        LIBRARY_SETTINGS.folders[i].editorAccess
      ];
    }
  });
  return JSON.stringify(returnArray);
}