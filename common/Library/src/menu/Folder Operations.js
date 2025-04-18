/**
* Add viewer/editor perms to folders (used in rank changes & email editing)
* @param {Number} foldersIndex - Index of folders property to use
* @param {String} emailToAdd - Gmail address of the target to add access to
*/
function addDocAccess(foldersIndex, emailToAdd, togglingLockdown = false) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!foldersIndex && foldersIndex !== 0) throw new Error("addDocAccess: no folders index provided");
  if (!emailToAdd) throw new Error("addDocAccess: no email provided");

  const folders = LIBRARY_SETTINGS.folders[foldersIndex];
  if ((!folders.viewerAccess || !folders.editorAccess) && !togglingLockdown) throw new Error("addDocAccess: invalid folders index");

  let folder;
  // let accessFolders = JSON.parse(PropertiesService.getUserProperties().getProperty("accessFolders"));
  let folderChangeList = [];
  try {
    if (folders.viewerAccess.length) folders.viewerAccess.forEach(folderId => {
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch(ee) {
        folder = DriveApp.getFileById(folderId);
      }

      folder.addViewer(emailToAdd);
      console.log(`Added viewer access to ${emailToAdd} in ${folder.getName()}`);
      folderChangeList.push({ folderName: folder.getName(), permission: "Viewer"});
    });
    
    if (folders.editorAccess.length) folders.editorAccess.forEach(folderId => {
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch(ee) {
        folder = DriveApp.getFileById(folderId);
      }
      
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
      let folder;
      try {
        folder = DriveApp.getFolderById(folderId.toString());
      } catch(e) {
        try {
          folder = DriveApp.getFileById(folderId.toString());
        } catch(ee) {
          return `Error at ${folderId.toString()}`;
        }
      }
      docAccessHandler(folder, emailToRemove);
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
  const sheet = getCollect(LIBRARY_SETTINGS.rosterIds[0]);

  sheet.getRange(6, LIBRARY_SETTINGS.dataCols.email, (sheet.getMaxRows() - 6), 1).getValues().forEach((email, i) => {
    if (!email[0] || !email[0].includes("@")) return;
    i = i + 6;
    console.log(sheet.getRange(i, LIBRARY_SETTINGS.dataCols.rank).getValue());
    console.log(email);
    if (!LIBRARY_SETTINGS.adminRanks.includes(sheet.getRange(i, LIBRARY_SETTINGS.dataCols.rank).getValue())) return;
    
    unaffected.push(email[0].toLowerCase());
  });

  unaffected = unaffected.concat(allowedStaff);

  const allDocs = getAllDocsInFolder(LIBRARY_SETTINGS.folderId_main);

  allDocs.forEach(id => {
    try {
      let doc;
      try {
        doc = DriveApp.getFolderById(id);
      } catch(e) {
        try {
          doc = DriveApp.getFileById(id);
        } catch(ee) {
          return `Error occured at ${id}`;
        }
      }

      if (!doc) return;
      const editors = doc.getEditors();
      const viewers = doc.getViewers();

      editors.forEach(editor => {
        const editorEmail = editor.getEmail();
        if (unaffected.includes(editorEmail)) return;
        doc.removeEditor(editorEmail);
        Logger.log(`Removed editor access from ${editorEmail} in ${doc.getName()}`);
      });

      viewers.forEach(viewer => {
        const viewerEmail = viewer.getEmail();
        if (unaffected.includes(viewerEmail)) return;
        doc.removeViewer(viewerEmail);
        Logger.log(`Removed viewer access from ${viewerEmail} in ${doc.getName()}`);
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
function updateAccess(rankToAdd, currentRank, mod = true) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!rankToAdd || typeof rankToAdd !== "string") return "Invalid Rank";
  if (!currentRank || typeof currentRank !== "string") throw new Error("No valid currentRank");

  if (LIBRARY_SETTINGS.ranks.indexOf(rankToAdd) >= LIBRARY_SETTINGS.ranks.indexOf(currentRank) && currentRank !== "Blackshadow Staff") return "Invalid Perms";

  // Get array of current allowed ranks
  let adminRankArray;

  // If adminRankArray is LIBRARY_SETTINGS.modRanks, this will be LIBRARY_SETTINGS.managerRanks & vice-versa
  let secondaryRankArray;

  if (mod) {
    adminRankArray = LIBRARY_SETTINGS.modRanks;
    secondaryRankArray = LIBRARY_SETTINGS.managerRanks;
  } else {
    adminRankArray = LIBRARY_SETTINGS.managerRanks;
    secondaryRankArray = LIBRARY_SETTINGS.modRanks;
  }

  if (adminRankArray.indexOf(rankToAdd) >= 0) {
    // If rank is already in array => remove them
    adminRankArray.splice(adminRankArray.indexOf(rankToAdd), 1);
  } else {
    // If not => add them
    let rosterParents = DriveApp.getFileById(LIBRARY_SETTINGS.spreadsheetId_main).getParents();
    let ssId = LIBRARY_SETTINGS.spreadsheetId_main;

    let parentIds = [];
    while (rosterParents.hasNext()) {
      let parent = rosterParents.next();
      parentIds.push(parent.getId());
    }

    if ((!LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.ranks.indexOf(rankToAdd)].editorAccess.includes(ssId) || parentIds.includes(ssId))
      && !mod ) return "Needs Roster Editor";
      
    adminRankArray.push(rankToAdd);
  }

  if (secondaryRankArray.includes(rankToAdd)) {
    secondaryRankArray.splice(secondaryRankArray.indexOf(rankToAdd), 1);
  }

  if (mod) {
    LIBRARY_SETTINGS.modRanks = adminRankArray;
    LIBRARY_SETTINGS.managerRanks = secondaryRankArray;
  } else {
    LIBRARY_SETTINGS.managerRanks = adminRankArray;
    LIBRARY_SETTINGS.modRanks = secondaryRankArray;
  }
  
  Logger.log(adminRankArray);
  return [LIBRARY_SETTINGS];
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
    if (!LIBRARY_SETTINGS.adminRanks.includes(sheet.getRange(i, LIBRARY_SETTINGS.dataCols.rank).getValue())) return;
    unaffected.push(email[0].toLowerCase());
  });

  allStaff.forEach(email => {
    if (unaffected.includes(email)) return;
    let userData = getUserData(email);
    addDocAccess(LIBRARY_SETTINGS.ranks.indexOf(userData.rank), email, true);
  });
}