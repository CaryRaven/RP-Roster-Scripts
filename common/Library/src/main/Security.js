/**
 * Get all files in a certain folder
 * @param {String} folderId
 */
function getAllDocsInFolder(folderId) {
  if (!isInit) throw new Error("Library is not yet initialized");

  try {
    const folder = DriveApp.getFolderById(folderId);
    const docs = [];

    const folderFiles = folder.getFiles();
    while (folderFiles.hasNext()) {
      docs.push(folderFiles.next().getId());
    }

    const subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
      const subfolder = subfolders.next();
      docs.push(subfolder.getId());
      docs.push(...getAllDocsInFolder(subfolder.getId()));
    }

    return docs;
  } catch(e) {
    sendDiscordError(e.toString(), "getAllDocsInFolder");
    throw new Error(e);
  }
}

/**
 * Checks all current staff Folders for unwanted access & reports it
 * @param {Array} exempt
 */
function permissionsGuard(exempt) {
  if (!isInit) throw new Error("Library is not yet initialized");

  try {
    let authed = getAllEmails();
    exempt.push("micheal.labus@gmail.com");
    let flagArray = [];

    // Check all docs
    const docs = getAllDocsInFolder(LIBRARY_SETTINGS.folderId_main);
    docs.forEach(id => {
      if (!id) return;
      let doc;

      try {
        doc = DriveApp.getFolderById(id);
      } catch (e) {
        try {
          doc = DriveApp.getFileById(id);
        } catch(ee) {
          console.log(ee);
          return flagArray.push({ email: "N/A", folderName: `Unknown File/Folder`, currentPermission: "None", reason: `${id} has not been shared with "dontorro208@gmail.com"` });
        }
      }

      // Make sure doc is owner by me (exception: pending docs)
      if (doc.getOwner().getEmail() !== "dontorro208@gmail.com" && !doc.getName().toLowerCase().includes("pending")) {
        return flagArray.push({ email: "N/A", folderName: `${doc.getName()}`, currentPermission: "N/A", reason: `Document should be owned by "dontorro208@gmail.com"` });
      }

      if (doc.getName().toLowerCase().includes("pending")) return;

      const viewers = doc.getViewers();
      const editors = doc.getEditors();

      console.log(doc.getName());

      flagArray = flagArray.concat(processPermissions(viewers, authed, exempt, "VIEW", doc));
      flagArray = flagArray.concat(processPermissions(editors, authed, exempt, "EDIT", doc));

    });

    // Going through all docs checking for unregistered
    const parentFolder = DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_main);
    const flaggedDocs = [];
    collectUnregisteredDocs(parentFolder, flaggedDocs);

    if (flagArray.length > 0 || flaggedDocs.length > 0) sendDiscordPermissionReport(flagArray, flaggedDocs);
  } catch(e) {
    sendDiscordError(e.toString(), "permissionsGuard");
    throw new Error(e);
  }
}

/**
 * Head Function - Not to be used in other scripts
 * @param {Array} users - All people with access to folder, regardless if they're allowed or not
 * @param {Array} authed - All people who could have access to the folder
 * @param {Array} exemptUsers - Users who should not be checked (owner of folder & Vigil)
 * @param {String} accessType - Type of access to check for: "VIEW" or "EDIT"
 * @return {Array}
 */
function processPermissions(users, authed, exemptUsers, accessType, doc) {
  if (!isInit) throw new Error("Library is not yet initialized");
  
  let flagArray = [];
  const ranks = LIBRARY_SETTINGS.ranks;
  const registeredDocs = LIBRARY_SETTINGS.folders;

  if (doc.getSharingPermission() === DriveApp.Access.ANYONE_WITH_LINK) return;

  users.forEach(user => {
    const email = user.getEmail().toLowerCase();
    if (exemptUsers.includes(email)) return "User is exempt";

    // Check if google account still exists / blocked me
    // Currently removed due to spamming users with emails (as an email is sent upon add/removeViewer)
    // Potential fix by using drive API advanced service (implement everywhere if added here)

    // try {
    //   DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).addViewer(email);
    //   DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).removeViewer(email);
    // } catch(e) {
    //   Logger.log(e);
    //   flagArray.push({ email: email, folderName: doc.getName(), currentPermission: accessType, reason: "Deleted/Blocked Google Account" });
    // }

    if (!authed.includes(email)) return flagArray.push({ email: email, folderName: doc.getName(), currentPermission: accessType, reason: "Unauthorized access" });

    const userData = getUserData(email.toString());

    if (LIBRARY_SETTINGS.adminRanks.includes(userData.rank)) return Logger.log(`${email} is exempt`);

    const allowedFolders = accessType === "VIEW" ? registeredDocs[ranks.indexOf(userData.rank)].viewerAccess : registeredDocs[ranks.indexOf(userData.rank)].editorAccess;
    const wrongFolders = accessType === "VIEW" ? registeredDocs[ranks.indexOf(userData.rank)].editorAccess : registeredDocs[ranks.indexOf(userData.rank)].viewerAccess;

    // Allow users to have access to files if they have access to a parent folder.
    let parents = doc.getParents();
    while (parents.hasNext()) {
      const parent = parents.next();
      const parentId = parent.getId();
      if (allowedFolders.includes(parentId)) return;
    }

    if (allowedFolders.includes(doc.getId())) return;

    if (wrongFolders.includes(doc.getId())) {
      return flagArray.push({ email: email, folderName: doc.getName(), expectedPermission: accessType === "VIEW" ? "EDIT" : "VIEW", reason: "Incorrect permissions" });
    } else {
      return flagArray.push({ email: email, folderName: doc.getName(), currentPermission: accessType, reason: "Unauthorized access" });
    }

  });
  return flagArray;
}

/**
 * Recursive function to check through all docs under a parent folder
 */
function collectUnregisteredDocs(folder, itemsArray) {
  if (!isInit) throw new Error("Library is not yet initialized");

  try {
    // Folder
    if (
      !LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].includes(folder.getId())
      && !folder.getName().includes("Interview")
      && !folder.getName().toLowerCase().includes("pending")) {
      itemsArray.push({
        type: "folder",
        name: folder.getName(),
        id: folder.getId(),
        owner: getOwnerEmail(folder)
      });
    }

    // Files
    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      if (
        !LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].includes(file.getId())
        && !file.getName().includes("Interview")
        && !file.getName().toLowerCase().includes("pending")) {
        itemsArray.push({
          type: "file",
          name: file.getName(),
          id: file.getId(),
          owner: getOwnerEmail(file)
        });
      }
    }

    // Move to next folder if possible
    const subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
      const subfolder = subfolders.next();
      collectUnregisteredDocs(subfolder, itemsArray);
    }
  } catch(e) {
    sendDiscordError(e.toString(), "collectUnregisteredDocs");
    throw new Error(e);
  }
}

/**
 * Get emails of people that aren't mentioned on the roster but should still get access to the admin menu
 * @returns {JSON.String[]}
 */
function getAllowedStaff() {
  if (!isInit) throw new Error("Library is not yet initialized");

  try {
    const staffAdminRoster = SpreadsheetApp.openById("1Y5vRfPV4v1NnD32eLJf4TWBRrur3xJpYjOBpgwRmHrU").getSheetById(591802026);
    let rows = staffAdminRoster.getMaxRows();
    let emails = [];

    staffAdminRoster.getRange(8, 8, rows, 1).getValues().forEach(row => {
        const email = row[0];
        if (!email) return;
        emails.push(email);
    });

    const seniorsRoster = SpreadsheetApp.openById('1H_7iso49sh1IfVQGEuUGAymPcAuoUdSygX7_sOM1wWw').getSheetById(675133232);
    rows = seniorsRoster.getMaxRows();
    
    seniorsRoster.getRange(8, 8, rows, 1).getValues().forEach((row, i) => {
      const email = row[0];
      if (!email) return;
      if (seniorsRoster.getRange(i + 8, 4).getValue().includes("Site")) emails.push(email);
    });

    console.log(emails);
    return JSON.stringify(emails);
  } catch(e) {
    sendDiscordError(e.toString(), "getAllowedStaff");
    throw new Error(e);
  }
}