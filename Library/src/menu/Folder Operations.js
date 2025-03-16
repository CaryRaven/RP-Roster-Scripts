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