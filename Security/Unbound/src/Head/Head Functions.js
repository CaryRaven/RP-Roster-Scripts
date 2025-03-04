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
  const wbBackup = SpreadsheetApp.openById("1Dy34hbsmJFd2nZHsOFCDcwk7TpblQfgSNWPeUpTOv64");
  const wb = SpreadsheetApp.openById("1LpkjzBEoOSmw41dDLwONE2Gn9mhSGb5GaiCApnhI3JE");

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
  let ranks = JSON.parse(PropertiesService.getScriptProperties().getProperty("ranks"));
  let folders = JSON.parse(PropertiesService.getScriptProperties().getProperty("folders"));
  const exempt = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));
  exempt.push("micheal.labus@gmail.com");
  let flagArray = [];

  folders[2].forEach(folderId => {
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

    flagArray = flagArray.concat(ProcessPermissions(viewers, authed, exempt, "VIEW", folderName, folderId, folders, ranks));
    flagArray = flagArray.concat(ProcessPermissions(editors, authed, exempt, "EDIT", folderName, folderId, folders, ranks));

  });
  if (flagArray.length) SendDiscordPermissionReport(flagArray);
}

/**
 * Head Function - Not to be used in other scripts
 * @param {Array} users - All people with access to folder, regardless if they're allowed or not
 * @param {Array} authed - All people who could have access to the folder
 * @param {Array} exemptUsers - Users who should not be checked (owner of folder & Vigil)
 * @param {String} accessType - Type of access to check for: "VIEW" or "EDIT"
 * @return {Array}
 */
function ProcessPermissions(users, authed, exemptUsers, accessType, folderName, folderId, folderData, ranks) {
  var flagArray = [];
  users.forEach(user => {
    const email = user.getEmail().toLowerCase();
    if (exemptUsers.includes(email)) return "User is exempt";

    if (!authed.includes(email)) return flagArray.push({ email: email, folderName: folderName, currentPermission: accessType, reason: "Unauthorized access" });
    const userData = RosterService.getUserData(LIBRARY_SETTINGS, email);

    if (ranks[2].includes(userData.rank) || ranks[3].includes(userData.rank)) return "User is exempt";

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