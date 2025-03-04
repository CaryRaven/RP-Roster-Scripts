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

  cols = cols.filter((col) => col >= 4);
  const moveData = cols.map(col => {
    const r = roster.getRange(rowToSearch, col);
    if (!r.getFormula()) {
      dataCols.push(col);
      return r.getValue();
    }
    return null;
  }).filter(data => data != null);

  dataCols.forEach(col => roster.getRange(rowToSearch, col).clearContent());
  if (destinationRow || destinationRow != 0) dataCols.forEach((col, i) => roster.getRange(destinationRow, col).setValue(moveData[i]));
}

/**
 * Restores all document access for all staff members, used when lockdown is deactivated
 * @param {AppsScript.ScriptProperty} allowedStaff
 */
function restoreAllDocAccess(allowedStaff) {
  let allStaff = getAllEmails();
  let unaffected = ["dontorro208@gmail.com", "micheal.labus@gmail.com", "rykitala@gmail.com"];
  const sheet = getCollect(LIBRARY_SETTINGS.rosterIds[0]);
  unaffected = unaffected.concat(allowedStaff);

  sheet.getRange(LIBRARY_SETTINGS.firstMemberRow, LIBRARY_SETTINGS.dataCols.email, (sheet.getMaxRows() - LIBRARY_SETTINGS.firstMemberRow), 1).getValues().forEach((email, i) => {
    if (!email[0] || !email[0].includes("@")) return;
    i = i + LIBRARY_SETTINGS.firstMemberRow;
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