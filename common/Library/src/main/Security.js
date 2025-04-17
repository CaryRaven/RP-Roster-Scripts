/**
 * Get all files in a certain folder
 * @param {String} folderId
 */
function getAllDocsInFolder(folderId) {
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
}

/**
 * Checks all current staff Folders for unwanted access & reports it
 * @param {Array} exempt
 */
function permissionsGuard(exempt) {
  if (!isInit) throw new Error("Library is not yet initialized");

  let authed = getAllEmails();
  let folders = LIBRARY_SETTINGS.folders;
  exempt.push("micheal.labus@gmail.com");
  let flagArray = [];

  authed.forEach(email => {
    // Check if google account still exists / blocked me
    try {
      DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).addViewer(email);
      DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).removeViewer(email);
    } catch(e) {
      const user = getUserData(email);
      flagArray.push({ email: email, folderName: `${LIBRARY_SETTINGS.factionName} Documentation Drive`, currentPermission: user.rank, reason: "Deleted/Blocked Google Account" });
    }
  });

  // Check registered folders
  folders[folders.length - 1].forEach(folderId => {
    if (!folderId) return;
    let folder;

    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (e) {
      try {
        folder = DriveApp.getFileById(folderId);
      } catch(ee) {
        return console.log(`Error found at ${folderId}`);
      }
    }

    const folderName = folder.getName();
    const viewers = folder.getViewers();
    const editors = folder.getEditors();

    flagArray = flagArray.concat(processPermissions(viewers, authed, exempt, "VIEW", folderName, folderId, folders));
    flagArray = flagArray.concat(processPermissions(editors, authed, exempt, "EDIT", folderName, folderId, folders));

  });

  // Going through all docs checking for unregistered
  const parentFolder = DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_main);
  const flaggedDocs = [];
  collectUnregisteredDocs(parentFolder, flaggedDocs);

  if (flagArray.length > 0 || flaggedDocs.length > 0) sendDiscordPermissionReport(flagArray, flaggedDocs);
}

/**
 * Head Function - Not to be used in other scripts
 * @param {Array} users - All people with access to folder, regardless if they're allowed or not
 * @param {Array} authed - All people who could have access to the folder
 * @param {Array} exemptUsers - Users who should not be checked (owner of folder & Vigil)
 * @param {String} accessType - Type of access to check for: "VIEW" or "EDIT"
 * @return {Array}
 */
function processPermissions(users, authed, exemptUsers, accessType, folderName, folderId, folderData) {
  if (!isInit) throw new Error("Library is not yet initialized");
  let flagArray = [];
  const ranks = LIBRARY_SETTINGS.ranks;

  users.forEach(user => {
    const email = user.getEmail().toLowerCase();
    if (exemptUsers.includes(email)) return "User is exempt";

    // Check if google account still exists / blocked me
    try {
      DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).addViewer(email);
      DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).removeViewer(email);
    } catch(e) {
      flagArray.push({ email: email, folderName: folderName, currentPermission: accessType, reason: "Deleted/Blocked Google Account" });
    }

    if (!authed.includes(email)) return flagArray.push({ email: email, folderName: folderName, currentPermission: accessType, reason: "Unauthorized access" });

    const userData = getUserData(email.toString());

    if (ranks[ranks.length - 2].includes(userData.rank) || ranks[ranks.length - 1].includes(userData.rank)) return "User is exempt";

    const allowedFolders = accessType === "VIEW" ? folderData[ranks.indexOf(userData.rank)].viewerAccess : folderData[ranks.indexOf(userData.rank)].editorAccess;
    const wrongFolders = accessType === "VIEW" ? folderData[ranks.indexOf(userData.rank)].editorAccess : folderData[ranks.indexOf(userData.rank)].viewerAccess;

    // Allow users to have access to files if they have access to a parent folder.
    // TODO: testing required
    let parents;
    try {
      parents = DriveApp.getFolderById(folderId).getParents();
      while (parents.hasNext()) {
        const parent = parents.next();
        const parentId = parent.getId();
        if (allowedFolders.includes(parentId)) return;
      }
    } catch(e) {
      try {
        parents = DriveApp.getFileById(folderId).getParents();
        while (parents.hasNext()) {
          const parent = parents.next();
          const parentId = parent.getId();
          if (allowedFolders.includes(parentId)) return;
        }
      } catch(ee) { }
    }

    if (allowedFolders.includes(folderId)) return;

    if (wrongFolders.includes(folderId)) {
      return flagArray.push({ email: email, folderName: folderName, expectedPermission: accessType === "VIEW" ? "EDIT" : "VIEW", reason: "Incorrect permissions" });
    } else {
      return flagArray.push({ email: email, folderName: folderName, currentPermission: accessType, reason: "Unauthorized access" });
    }

  });
  return flagArray;
}

/**
 * Recursive function to check through all docs under a parent folder
 */
function collectUnregisteredDocs(folder, itemsArray) {
  // Folder
  if (
    !LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].includes(folder.getId())
    && !folder.getName().includes("Interview")) {
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
      && !file.getName().includes("Interview")) {
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
}