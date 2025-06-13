/**
 * Processes a log 
 * 
 * @param {Object} inputData - Data object input by the user
 * @param {Boolean} threshold - Was this function ran because of the infraction threshold?
 * @param {String} accessType - Access level of the user (visitor, mod, manager, admin, dev)
 * @returns {String}
 */
function ProcessLog(inputData, threshold = false, accessType) {
  const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
  const allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));
  const filter = RosterService.filterQuotes(inputData);
  if (!filter) return "No special characters allowed";

  // :hardcode
  if (accessType === "manager" || accessType === "admin" || accessType === "dev") {
    // Normal log
    return RosterService.processLog(inputData, userData, allowedStaff, threshold);
  } else {
    // Permission Checks
    if (accessType === "visitor") inputData.email = Session.getActiveUser().getEmail();
    if (accessType === "visitor" && inputData.email !== userData.email) return "You cannot manage others";
    let type = inputData.type === "Rank Change" ? inputData.rankchangetype : inputData.type === "Blacklist" ? inputData.blacklist_type : inputData.type;

    if (!Array.isArray(inputData.users)) inputData.users = [inputData.users];

    // For appeals, no users are provided
    if (inputData.type.includes("Appeal")) {
      const roster = getCollect(LIBRARY_SETTINGS.rosterIds[0]);

      for (let i = 6; i <= roster.getMaxRows(); i++) {
        const name = roster.getRange(i, 5).getValue();
        if (name !== "") inputData.users = [name];
      }
    }

    if (inputData.users.length > 10) return "You cannot select more than 10 members at once";

    // Check the submitted data
    const returnVal = RosterService.processLog(inputData, userData, allowedStaff, threshold, true, accessType);
    if (typeof returnVal === "string") return returnVal;

    let requests = JSON.parse(PropertiesService.getScriptProperties().getProperty("requests"));

    for (user of inputData.users) {
      // Submit log to the request system for review
      const targetData = accessType === "visitor" ? RosterService.getUserData(inputData.email) : RosterService.getUserData(user, 5);
      requests = !requests ? [] : requests;

      let prefix = "";
      if (type === "Passed Interview") {
        type = LIBRARY_SETTINGS.ranks[0] + " Acceptance";
        prefix = "New";
        targetData.name = inputData.name;
      }

      let logData = {
        id: Math.random() * 1000,
        title: `${prefix} ${LIBRARY_SETTINGS.factionName} ${type}`,

        // Long description
        // :hardcode
        desc: `${userData.name} has requested a ${prefix} ${type} to be performed on ${type === "New Member" ? inputData.name : targetData.name} ${inputData.type === "Requirement Log" ? "with the proof" : "for the reason"}: "${inputData.reason}".
          ${inputData.type === "Requirement Log" ? `Please make sure that the evidence provided is valid for the completion of this requirement, misuse of approvals will result in harsh repercussions.`: ""}
          ${type === "LOA Log" ? `\nThis LOA will end on ${inputData.end_date}.` : inputData.type === "Blacklist" ? `This ${inputData.blacklist_type} will end on ${inputData.end_date}.` : ""}`,
        logger: userData.name,
        type: inputData.type,
        userData: userData,
        inputData: inputData,
        targetName: type === "New Member" ? inputData.name : targetData.name,
        reqName: inputData.reqName
      };

      // :hardcode
      if (inputData.type === "Requirement Log") logData.desc += `\nRequirement Logged: ${inputData.reqName}`;

      requests.push(logData);
    }
    
    PropertiesService.getScriptProperties().setProperty("requests", JSON.stringify(requests));
    return "Requests Submitted";
  }
}

function ProcessInputEdits(inputData, accessType) {
  const allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));
  const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
  const filter = RosterService.filterQuotes(inputData);
  if (!filter) return "No special characters allowed";

  // :hardcode
  if (accessType === "admin" || accessType === "dev") {
    // Normal log
    return RosterService.processEdit(inputData, allowedStaff, userData);
  } else {
    // Permission Checks
    if (accessType === "visitor" && inputData.email !== userData.email) return "You cannot manage others";
    if (accessType !== "visitor") {
      let targetDataCheck = RosterService.getUserData(inputData.email);
      let ranks = LIBRARY_SETTINGS.ranks;
      if (!targetDataCheck.row) return "User not found";
      if (targetDataCheck.playerId == userData.playerId) return "You cannot manage yourself";
      if (ranks[ranks.length - 1].includes(targetDataCheck.rank) || ranks[ranks.length - 2].includes(targetDataCheck.rank)) return "You cannot manage Senior CL4 members";
      if (allowedStaff.includes(inputData.email) || allowedStaff.includes(targetDataCheck.email)) return "You cannot manage Staff from this menu";
      if (!allowedStaff.includes(inputData.email) && ranks.indexOf(targetDataCheck.rank) > ranks.indexOf(userData.rank)) {
        return "You cannot manage people with a higher rank than you."
      }
    }

    // Submit log to the request system for review
    let requests = JSON.parse(PropertiesService.getScriptProperties().getProperty("requests"));
    requests = !requests ? [] : requests;

    const type = inputData.type.replace("Edit ", "");
    const targetData = RosterService.getUserData(inputData.current_email);
    let logData = {
      id: Math.random() * 1000,
      title: `${inputData.type}`,
      desc: `${userData.name} has requested to change the ${type} of ${targetData.name} to ${inputData[type.toLowerCase()]}.`,
      logger: userData.name,
      type: inputData.type,
      userData: userData,
      inputData: inputData,
      targetName: targetData.name
    };

    requests.push(logData);
    PropertiesService.getScriptProperties().setProperty("requests", JSON.stringify(requests));
    return "Request Submitted";
  }
}

function ManageRequests(action, id) {
  id = Number(id);
  if (!id) return "Invalid ID";
  const requests = JSON.parse(PropertiesService.getScriptProperties().getProperty("requests"));
  if (action === "accepted") {
    let returnVal;
    let result;

    // Loop through requests
    requests.forEach((request, i) => {
      if (request.id != id) return;
      
      const allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));
      const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));

      // If a dev is accepting request (not on roster)
      if (request.inputData.email === request.userData.email) request.userData = userData;
      if (allowedStaff.includes(Session.getActiveUser().getEmail())) request.userData.email = Session.getActiveUser().getEmail();

      request.inputData.reqName = request.reqName;

      if (request.type.includes("Edit")) {
        returnVal = RosterService.processEdit(request.inputData, allowedStaff, request.userData);
      } else {
        returnVal = RosterService.processLog(request.inputData, request.userData, allowedStaff, false);
      }

      try { returnVal = JSON.parse(returnVal); } catch(e) {}
      if (Array.isArray(returnVal) || returnVal == "Information Edited") {
        requests.splice(i, 1);
        PropertiesService.getScriptProperties().setProperty("requests", JSON.stringify(requests));
      } else {
        console.log(returnVal);
        if (returnVal.includes("interview")) {
          const match = returnVal.match(/^([^"]*"[^"]*")/);
          result = match ? match[1] : returnVal;
        }
      }
    });
    
    return result ? result.toString() : returnVal;
  } else if (action === "denied") {
    requests.forEach((request, i) => {
      if (request.id != id) return "Invalid ID";
      requests.splice(i, 1);
      const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
      PropertiesService.getScriptProperties().setProperty("requests", JSON.stringify(requests));
      RosterService.sendDiscordRequestDenied(request, userData);
    });
  } else return 'Something went wrong';
}

function SubmitChange(changes) {
  // Remove spaces before & after comma
  const changeArray = changes.split(/\s*,\s*/);

  // Set property for changelog pop-up on web app open
  PropertiesService.getScriptProperties().setProperty("lastestChangeLog", JSON.stringify({
    fields: changeArray,
    date: new Date()
  }));

  RosterService.sendDiscordChangeLog(changeArray, ScriptApp.getService().getUrl().toString());
}

// Get property set above
function GetChangeNotes() {
  return PropertiesService.getScriptProperties().getProperty("lastestChangeLog");
}

function GetRequests() {
  const requests = JSON.parse(PropertiesService.getScriptProperties().getProperty("requests"));
  const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
  let filteredRequests = requests;

  if (!requests) return;

  if (userData.rank !== "Blackshadow Staff") {
    filteredRequests = requests.filter(request => LIBRARY_SETTINGS.ranks.indexOf(request.userData.rank) < LIBRARY_SETTINGS.ranks.indexOf(userData.rank));
  }

  return JSON.stringify(filteredRequests);
}

// Get the current ranks
function GetRanks() {
  return JSON.stringify(LIBRARY_SETTINGS.ranks);
}

function AddNewRank(inputData) {
  if (!inputData) return "No input data";
  let valid = RosterService.filterQuotes(inputData);
  if (!valid) return "No special characters allowed";

  const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
  const borderPairs = [
    [3, 3],
    [5, 8], 
    [10, LIBRARY_SETTINGS.dataCols.blacklistEnd - 1], 
    [LIBRARY_SETTINGS.dataCols.notes, LIBRARY_SETTINGS.dataCols.notes]
  ];
  const returnVal = RosterService.manageRank(inputData, borderPairs, userData);

  if (typeof returnVal === "string") {
    return JSON.stringify([returnVal, ""]);
  } else if (Array.isArray(returnVal) && returnVal.length === 2) {
    PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(returnVal[1]));
    return JSON.stringify(returnVal);
  }
}

/**
 * Remove an entire rank
 * @param {String} rank
 * @returns {String}
 */
function RemoveRank(rank, discordnotif = true) {
  // Remove from req roster -> has to be removed first
  let returnVal = RosterService.removeRank(rank, false, LIBRARY_SETTINGS.rosterIds.length - 1, true);

  if (typeof returnVal === "string") {
    return returnVal;
  } else if (Array.isArray(returnVal)) {
    returnVal = RosterService.removeRank(rank, discordnotif);
    if (typeof returnVal === "string") {
      return returnVal;
    } else if (Array.isArray(returnVal)) {
      PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(returnVal[1]));
      LIBRARY_SETTINGS = returnVal[1];
      RosterService.init(returnVal[1]);
      return returnVal[0];
    }
  }
}

/**
 * Remove a slot from the rank (name) passed in as arg
 * @param {String} rank - Name of rank to remove a slot from
 * @param {Number} num (optional)
 * @returns {Void|String}
 */
function RemoveRankRow(rank, num = 1) {
  if (!rank || typeof rank !== "string") return "no";
  const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
  let returnVal;
  
  if (LIBRARY_SETTINGS.promoReqs[LIBRARY_SETTINGS.ranks.indexOf(rank)].length > 0 || LIBRARY_SETTINGS.minMeritScore[LIBRARY_SETTINGS.ranks.indexOf(rank)] > 0) {
    returnVal = RosterService.removeReqRow(rank.toString(), num);
  }

  returnVal = RosterService.removeRankRow(rank, userData, num);
  return returnVal;
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
  LIBRARY_SETTINGS.manualEnabled = Boolean(value);
  RosterService.init(LIBRARY_SETTINGS);
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));

  const sheet = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);
  sheet.getRange(10, 1).setValue(value);
  RosterService.sendDiscordConfig("manualEdit", value, JSON.parse(PropertiesService.getUserProperties().getProperty("userData")));
}

function ReturnSliders() {
  const manualValue = LIBRARY_SETTINGS.manualEnabled.toString();
  const backupValue = LIBRARY_SETTINGS.backupEnabled.toString();
  const lockdownValue = LIBRARY_SETTINGS.lockdownEnabled.toString();
  const modsOnlySupervised = LIBRARY_SETTINGS.modsOnlySupervised.toString();
  const managersOnlySupervised = LIBRARY_SETTINGS.managersOnlySupervised.toString();

  return JSON.stringify([manualValue, LIBRARY_SETTINGS.pings.toString(), backupValue, lockdownValue, modsOnlySupervised, managersOnlySupervised]);
}

function ReturnCooldown() {
  return JSON.stringify([LIBRARY_SETTINGS.cooldown_loa, LIBRARY_SETTINGS.cooldown_promotion]);
}

function ReturnThreshold() {
  return JSON.stringify([LIBRARY_SETTINGS.threshold_num, LIBRARY_SETTINGS.threshold_action]);
}

function ToggleBackup(value) {

  // Edit settings
  LIBRARY_SETTINGS.backupEnabled = Boolean(value);
  RosterService.init(LIBRARY_SETTINGS);
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));

  RosterService.sendDiscordConfig("backup", value, JSON.parse(PropertiesService.getUserProperties().getProperty("userData")));
}

function TogglePings(value) {
  LIBRARY_SETTINGS.pings = Boolean(value);
  RosterService.init(LIBRARY_SETTINGS);
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));
  RosterService.sendDiscordConfig("pingChange", value, JSON.parse(PropertiesService.getUserProperties().getProperty("userData")));
}

function ToggleLockdown() {
  let value = LIBRARY_SETTINGS.lockdownEnabled.toString();
  value = value === "true" ? false : true;

  if (value) {
    
    RosterService.removeAllDocAccess(JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff")))
    LIBRARY_SETTINGS.backupEnabled = false;
  } else {
    const all = RosterService.getAllEmails();

    // Check for any blocked/Deleted google accounts on the roster
    for (email of all) {
      try {
        DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).addViewer(email);
        DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).removeViewer(email);
      } catch(e) {
        return `Unknown: ${email}`;
      }
    }
    
    RosterService.restoreAllDocAccess(JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff")));
  }

  // Edit Settings
  LIBRARY_SETTINGS.lockdownEnabled = value;
  RosterService.init(LIBRARY_SETTINGS);
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));

  RosterService.sendDiscordConfig("lockdown", value, JSON.parse(PropertiesService.getUserProperties().getProperty("userData")));
  return value;
}

function ToggleReqs() {
  let value = ReturnReqsDisabled();
  console.log(value);
  value = value === "true" ? false : true;
  const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
  const r = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);

  if (value) {
    console.log("removing")

    // Hide sheets related to promo reqs
    // :hardcode
    for (sheetId of [46188961, 1535565949]) {
      const s = RosterService.getCollect(Number(sheetId));
      s.hideSheet();
    }

    // Hiding column -> Handled by bound
    // r.hideColumn(r.getRange(1, LIBRARY_SETTINGS.dataCols.blacklistEnd - 1));
  } else {
    console.log("re-adding");
    // Show sheets related to promo reqs
    // :hardcode
    for (sheetId of [46188961, 1535565949]) {
      const s = RosterService.getCollect(Number(sheetId));
      s.showSheet();
    }

    // Show column -> handled by bound
    // r.unhideColumn(r.getRange(1, LIBRARY_SETTINGS.dataCols.blacklistEnd - 1));
  }

  LIBRARY_SETTINGS.reqsDisabled = value;
  RosterService.init(LIBRARY_SETTINGS);
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));

  RosterService.sendDiscordConfig("reqChange", value, userData);
  return value;
}

function ReturnReqsDisabled() {
  return LIBRARY_SETTINGS.reqsDisabled.toString();
}

function ResetPermissions() {
  const allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));
  const all = RosterService.getAllEmails();

  // Check for any blocked/Deleted google accounts on the roster
  for (email of all) {
    try {
      DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).addViewer(email);
      DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).removeViewer(email);
    } catch(e) {
      return `Unknown: ${email}`;
    }
  }

  RosterService.removeAllDocAccess(allowedStaff)
  RosterService.restoreAllDocAccess(allowedStaff);
  console.log(`${LIBRARY_SETTINGS.factionName} Documentation Permissions reset`);
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
 * @param {String} inputValue - playerId that was input into the search bar
 */
function GetSpreadsheetData(inputValue) {
  return RosterService.getSpreadsheetData(inputValue);
}

/**
 * @param {String} rankToAdd
 * @param {String} currentRank
 * @returns {Array}
 */
function UpdateAccess(rankToAdd, currentRank, mod) {
  const returnVal = RosterService.updateAccess(rankToAdd, currentRank, mod);

  if (typeof returnVal === "string") {
    console.log(returnVal);
    return returnVal;
  } else if (Array.isArray(returnVal)) {
    RosterService.init(returnVal[0]);
    PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(returnVal[0]));
    return JSON.stringify([returnVal[0].modRanks, returnVal[0].managerRanks]);
  }
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

  const returnVal = RosterService.manageSpec(title, desc, edit);

  if (typeof returnVal === "string") {
    return returnVal;
  } else if (Array.isArray(returnVal)) {
    PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(returnVal[1]));
    RosterService.init(returnVal[1]);
    return returnVal[0];
  }
}

/**
 * @param {String} title
 */
function RemoveSpec(title) {
  const returnVal = RosterService.removeSpec(title);

  // Update settings if success
  if (typeof returnVal === "string") {
    return returnVal;
  } else if (Array.isArray(returnVal)) {
    PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(returnVal[1]));
    RosterService.init(returnVal[1]);
    return returnVal[0];
  }

  return "Did not work"; // :)
}

/**
 * @param {String} title
 * @returns {JSON.Array}
 */
function GetSpecContent(title) {
  return RosterService.getSpecContent(title);
}

/**
 * @param {String} title
 */
function GetRankContent(title) {
  return RosterService.getRankContent(title);
}

/**
 * Add a folder to the total collection (folders[folders.length - 1]) so they can be used to validate access
 * A folder that isn't added to this list, is ignored by PermissionsGuard etc...
 */
function AddFolder(id) {
  if (!id) throw new Error("No ID provided");
  let valid = RosterService.filterQuotes(id);
  if (!valid) return "No quotes allowed";
  const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
  let folder;

  try {
    folder = DriveApp.getFolderById(id.toString());
  } catch(e) {
    try {
      folder = DriveApp.getFileById(id.toString());
    } catch(ee) {
      return "Invalid Folder/File ID"; 
    }
  }

  if (folder.getOwner().getEmail() !== "dontorro208@gmail.com") return "Invalid Ownership";

  let message;
  if (LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].indexOf(id) >= 0) {
    LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].splice(LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].indexOf(id), 1);
    message = `${folder.getName()} removed from list`;
    userData.title = folder.getName();
    RosterService.sendDiscordConfig("folderEdit", false, userData);
  } else {
    LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1].push(id.toString());
    message = `${folder.getName()} added to list`;
    userData.title = folder.getName();
    RosterService.sendDiscordConfig("folderEdit", true, userData);
  }

  RosterService.init(LIBRARY_SETTINGS);
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));
  return message;
}

/**
 * @param {String|Number} days - cooldown in days
 */
function ChangeLOACooldown(days) {
  days = Number(days);
  if (!days || days > 60 || days < 0) return "no";

  LIBRARY_SETTINGS.cooldown_loa = days;
  RosterService.init(LIBRARY_SETTINGS);
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));

  const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
  userData.days = days;
  RosterService.sendDiscordConfig("cooldownChange", true, userData);
  return;
}

/**
 * @param {String|Number} days - cooldown in days
 */
function ChangePromoCooldown(days) {
  days = Number(days);
  if (!days || days > 60 || days < 0) return "no";

  LIBRARY_SETTINGS.cooldown_promotion = days;
  RosterService.init(LIBRARY_SETTINGS);
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));

  const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
  userData.days = days;
  RosterService.sendDiscordConfig("cooldownChange", false, userData);
  return;
}

function ManageThreshold(threshold, action) {
  threshold = Number(threshold);
  if (Number(threshold) > 10 || Number(threshold) < 1 || !threshold) return "No valid threshold provided";
  if (!action) return "No action provided";

  LIBRARY_SETTINGS.threshold_num = threshold;
  LIBRARY_SETTINGS.threshold_action = action.toString();
  RosterService.init(LIBRARY_SETTINGS);
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));

  return "Infraction Threshold Edited";
}

/**
 * Get the promotion requirements of a rank based on the rank's name
 * @param {String} rank
 * @param {String} email - Check for an email if you're not logging your own prom req
 * @returns {JSON.Array}
 */
function GetReqs(rank, name = null) {
  if (name) {
    let data = RosterService.getUserData(name, LIBRARY_SETTINGS.dataCols.name);
    rank = data.rank;
  }

  if (!rank) return rank;
  const rankIndex = LIBRARY_SETTINGS.ranks.indexOf(rank);
  if (rankIndex < 0) return;
  return JSON.stringify(LIBRARY_SETTINGS.promoReqs[rankIndex]);
}

/**
 * Return all registered files/folders and their names
 * @returns {JSON.Array[Object]}
 */
function ReturnRegistered() {
  const ids = LIBRARY_SETTINGS.folders[LIBRARY_SETTINGS.folders.length - 1];
  let returnArray = [];

  ids.forEach(id => {
    let data = {
      id: id.toString()
    }

    let doc;
    try {
      doc = DriveApp.getFolderById(id);
      data.title = doc.getName();
      data.type = "Folder";
    } catch(e) {
      try {
        doc = DriveApp.getFileById(id);
        data.title = doc.getName();
        data.type = "File";
      } catch(ee) {
        data.title = "Unknown";
        data.type = "Unknown";
      }
    }

    if (!data.id || !data.title || !data.type) throw new Error("Invalid id");
    return returnArray.push(data);
  });

  return JSON.stringify(returnArray);
}

/**
 * Return the total amount of slots a rank currently has based on its name.
 * @param {String} rank - rank to get slots of
 * @returns {Number}
 */
function ReturnTotalSlots(rank) {
  return (RosterService.getLastRankRow(rank) - RosterService.getStartRankRow(rank)) + 1;
}

/**
 * Get the current merit actions from the server
 */
function GetMeritActions() {
  let meritActions = [];
  for (action of LIBRARY_SETTINGS.meritActions) {
    meritActions.push(action.title);
  }

  return JSON.stringify(meritActions);
}

/**
 * Add/Edit a merit action
 * @returns {String}
 */
function ManageMeritAction(title, desc, meritCount, editTitle) {
  const returnVal = RosterService.merit_manageAction(title, desc, meritCount, editTitle);

  if (editTitle) {
    const s = RosterService.getCollect(2063800821);
    s.unhideColumn(s.getRange(1, 11));
    RosterService.getCollect(1635403376).showSheet();
  }

  if (!Array.isArray(returnVal)) return returnVal;

  RosterService.init(returnVal[1]);
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(returnVal[1]));

  return returnVal[0];
}

/**
 * Remove a merit action completely
 * @param {String} title - title of the action to remove
 */
function RemoveMeritAction(title) {
  const returnVal = RosterService.merit_removeAction(title);

  if (!Array.isArray(returnVal)) return returnVal;

  RosterService.init(returnVal[1]);
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(returnVal[1]));

  if (returnVal[1].meritActions.length <= 0) {
    const s = RosterService.getCollect(2063800821);
    s.hideColumn(s.getRange(1, 11));
    RosterService.getCollect(1635403376).hideSheet();
  }

  return returnVal[0]
}

function FillMerit(title) {
  for (action of LIBRARY_SETTINGS.meritActions) {
    if (action.title === title) {
      return JSON.stringify([action.title, action.desc, action.meritCount]);
    }
  }

  return JSON.stringify(["", "", 0]);
}

/**
 * Get the URL of the version the web application is opened in
 */
function GetScriptUrl() {
  PropertiesService.getUserProperties().setProperty("showTerminal", false);
  return ScriptApp.getService().getUrl();
}

/**
 * Add one extra slot to the rank passed in as arg
 * @param {String} rank - Name of the rank to add a slot to
 * @param {Number} num (optional)
 * @returns {Void|String}
 */
function AddRankRow(rank, num = 1, discordnotif = true) {
  console.log(rank);
  const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
  const rankIndex = LIBRARY_SETTINGS.ranks.indexOf(rank);
  
  if (LIBRARY_SETTINGS.promoReqs[rankIndex].length > 0 || LIBRARY_SETTINGS.minMeritScore[rankIndex] > 0) {
    RosterService.addReqRow(rank.toString(), num, undefined, LIBRARY_SETTINGS.promoReqs[rankIndex], LIBRARY_SETTINGS.minMeritScore[rankIndex]);
  }

  const returnVal = RosterService.addRankRow(rank.toString(), userData, num, discordnotif); // Actual func
  return returnVal; // Only returns something if no proper rank was given
}

/**
 * Add a HTML file into the Admin Menu (or another HTML file)
 * Only works for files located in this project
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Returns the userData to the client (HTML)
 * @param {Boolean} bool - Should the output be stringified (in this case yes, since we're sending data to the client)
 */
function ReturnUserData(name, bool) {
  return RosterService.getUserData(name, 5, bool);
}

/**
 * Workaround to get images (located in drive) to load into the web app
 * Found solution on stackoverflow
 */
function loadImageBytes(id) {
  return RosterService.loadImageBytes(id);
}

/**
 * Returns the current settings for specializations
 * Used to populate config fields when editing an existing specialization
 */
function ReturnSpecs() {
  return JSON.stringify(LIBRARY_SETTINGS.specializations);
}

/**
 * Get all the names to fill in the user selects on menu
 * @returns {JSON.Array}
 */
function GetAllNames() {
  const emails = RosterService.getAllEmails();
  let names = [];
  for (email of emails) {
    const data = RosterService.getUserData(email);
    if (data.status === "Missing Data") continue;
    names.push(data.name);
  }

  return JSON.stringify(names);
}

/**
 * Toggles the option for supervisors, if enabled you will see a bunch of new config options
 * and you will be able to assign a supervisors to everybody
 * @returns {Boolean}
 */
function ToggleSupervisors() {
  let value = LIBRARY_SETTINGS.supervisorsDisabled.toString();
  value = value === "true" ? false : true;

  RosterService.supervisors_toggle(value);

  if (value) {
    LIBRARY_SETTINGS.dataCols.notes = 19;
    LIBRARY_SETTINGS.dataCols.supervisor_name = 1;
    LIBRARY_SETTINGS.dataCols.supervisor_playerId = 1;
  } else {
    LIBRARY_SETTINGS.dataCols.notes = 22;
    LIBRARY_SETTINGS.dataCols.supervisor_name = 19;
    LIBRARY_SETTINGS.dataCols.supervisor_playerId = 20;
  }

  LIBRARY_SETTINGS.supervisorsDisabled = value;
  RosterService.init(LIBRARY_SETTINGS);
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));
  RosterService.sendDiscordConfig("supervisorToggle", value, JSON.parse(PropertiesService.getUserProperties().getProperty("userData")));
  return value;
}

/**
 * Toggle whether or not mods are allowed to perform operations on members they do not supervise.
 */
function ToggleSupervisedMods(value) {
  LIBRARY_SETTINGS.modsOnlySupervised = Boolean(value);
  RosterService.init(LIBRARY_SETTINGS);
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));
}

/**
 * Toggle whether or not mods are allowed to perform operations on members they do not supervise.
 */
function ToggleSupervisedManagers(value) {
  LIBRARY_SETTINGS.managersOnlySupervised = Boolean(value);
  RosterService.init(LIBRARY_SETTINGS);
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));
}