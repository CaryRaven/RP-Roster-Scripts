/**
 * Time based trigger
 * @returns {Void}
 */
function GetAllowedStaff() {
  PropertiesService.getScriptProperties().setProperty("allowedStaff", RosterService.getAllowedStaff());
}

/**
 * Time-based function (every 12h) to create a full roster backup, can be manually disabled through web app config
 * Head Function - Not to be used in other scripts
 * @deprecated
 */
function BackupSheet() {
  const backupEnabled = PropertiesService.getScriptProperties().getProperty("backupEnabled");
  if (backupEnabled == "false") return;
  const wbBackup = SpreadsheetApp.openById(LIBRARY_SETTINGS.backupsbeetId);
  const wb = SpreadsheetApp.openById(LIBRARY_SETTINGS.spreadsheetId);

  const value = PropertiesService.getScriptProperties().getProperty("manualEnabled");
  const s = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);
  s.getRange(10, 1).setValue(value);

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
  PropertiesService.getScriptProperties().setProperty("backupTime", JSON.stringify(new Date()));
  // TODO: add discord notification
}

/**
 * Head Function - Not to be used in other scripts
 * Checks all current staff Folders for unwanted access & reports it
 */
function PermissionsGuard() {
  let authed = RosterService.getAllEmails();
  let ranks = LIBRARY_SETTINGS.ranks;
  let folders = LIBRARY_SETTINGS.folders;
  const exempt = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));
  exempt.push("micheal.labus@gmail.com");
  let flagArray = [];

  folders[folders.length - 1].forEach(folderId => {
    if (!folderId) return;
    let folder;

    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (e) {
      return console.log(`Error found at ${folderId}`);
    }

    const folderName = folder.getName();
    const viewers = folder.getViewers();
    const editors = folder.getEditors();

    flagArray = flagArray.concat(RosterService.processPermissions(viewers, authed, exempt, "VIEW", folderName, folderId, folders, ranks));
    flagArray = flagArray.concat(RosterService.processPermissions(editors, authed, exempt, "EDIT", folderName, folderId, folders, ranks));

  });
  if (flagArray.length) RosterService.sendDiscordPermissionReport(flagArray);
}