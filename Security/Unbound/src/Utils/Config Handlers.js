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

  let unaffected = ["dontorro208@gmail.com", "micheal.labus@gmail.com", "rykitala@gmail.com"];
  let folders = JSON.parse(PropertiesService.getScriptProperties().getProperty("folders"));
  const sheet = getCollect(2063800821);
  sheet.getRange(6, 8, (sheet.getMaxRows() - 6), 1).getValues().forEach((email, i) => {
    if (!email[0]) return;
    i = i + 6;
    if (sheet.getRange(i, 4).getValue() !== "Security Chief" || sheet.getRange(i, 4).getValue() !== "Site Management") return;
    unaffected.push(email[0].toLowerCase());
  });

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