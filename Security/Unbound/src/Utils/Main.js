function ProcessLog(inputData, threshold = false) {
  const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
  const allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));
  const lockdown = PropertiesService.getScriptProperties().getProperty("lockdownEnabled");
  return RosterService.processLog(inputData, userData, allowedStaff, lockdown, threshold);
}

function ProcessInputEdits(inputData) {
  const allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));
  const lockdown = PropertiesService.getScriptProperties().getProperty("lockdownEnabled");
  return RosterService.processEdit(inputData, allowedStaff, lockdown);
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

// Get the current ranks
function GetRanks() {
  return JSON.stringify(LIBRARY_SETTINGS.ranks);
}

function AddNewRank(inputData) {
  if (!inputData) return "No input data";
  let valid = RosterService.filterQuotes(inputData);
  if (!valid) return "No special characters allowed";

  const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
  const returnVal = RosterService.manageRank(inputData, [[3, 3], [5, 8], [10, 15], [17, 17]], userData);

  if (typeof returnVal === "string") {
    return returnVal;
  } else if (Array.isArray(returnVal)) {
    PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(returnVal[1]));
    return returnVal[0];
  }
}

/**
 * Remove an entire rank
 * @param {String} rank
 * @returns {String}
 */
function RemoveRank(rank, discordnotif = true) {
  const returnVal = RosterService.removeRank(rank, discordnotif);

  if (typeof returnVal === "string") {
    return returnVal;
  } else if (Array.isArray(returnVal)) {
    PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(returnVal[1]));
    return returnVal[0];
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
  const returnVal = RosterService.removeRankRow(rank, userData, num);
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
  PropertiesService.getScriptProperties().setProperty("manualEnabled", value);
  const sheet = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);
  sheet.getRange(10, 1).setValue(value);
  RosterService.sendDiscordConfig("manualEdit", value, JSON.parse(PropertiesService.getUserProperties().getProperty("userData")));
}

function ReturnSliders() {
  let properties = PropertiesService.getScriptProperties();
  let manualValue = properties.getProperty("manualEnabled");
  let backupValue = properties.getProperty("backupEnabled");
  let lockdownValue = properties.getProperty("lockdownEnabled");

  return JSON.stringify([manualValue, LIBRARY_SETTINGS.pings.toString(), backupValue, lockdownValue]);
}

function ReturnCooldown() {
  return JSON.stringify([LIBRARY_SETTINGS.loaCooldown, LIBRARY_SETTINGS.promoCooldown]);
}

function ReturnThreshold() {
  return JSON.stringify([LIBRARY_SETTINGS.threshold, LIBRARY_SETTINGS.thresholdAction]);
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

function ToggleLockdown() {
  let value = ReturnLockdown();
  value = value === "true" ? false : true;
  if (value) {
    RemoveAllDocAccess();
    PropertiesService.getScriptProperties().setProperty("backupEnabled", false);
  } else {
    RosterService.restoreAllDocAccess(JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff")));
  }
  PropertiesService.getScriptProperties().setProperty("lockdownEnabled", value);
  RosterService.sendDiscordConfig("lockdown", value, JSON.parse(PropertiesService.getUserProperties().getProperty("userData")));
  return value;
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
  RosterService.restoreAllDocAccess(JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff")));
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
  RosterService.removeAllDocAccess(JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff")));
}

/**
 * @param {String} inputValue - SteamID that was input into the search bar
 */
function GetSpreadsheetData(inputValue) {
  return RosterService.getSpreadsheetData(inputValue);
}

/**
 * @param {String} rankToAdd
 * @param {String} currentRank
 */
function UpdateAccess(rankToAdd, currentRank) {
  const returnVal = RosterService.updateAccess(rankToAdd, currentRank);

  if (typeof returnVal === "string") {
    return returnVal;
  } else if (Array.isArray(returnVal)) {
    PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(returnVal[1]));
    RosterService.init(returnVal[1]);
    return returnVal[0]
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

  try {
    const folder = DriveApp.getFolderById(id.toString());
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
    PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));
    RosterService.init(LIBRARY_SETTINGS);
    return message;
  } catch(e) {
    return "Invalid Folder ID";
  }
}

/**
 * @param {String|Number} days - cooldown in days
 */
function ChangeLOACooldown(days) {
  days = Number(days);
  if (!days || days > 60 || days < 0) return "no";

  LIBRARY_SETTINGS.loaCooldown = days;
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));
  RosterService.init(LIBRARY_SETTINGS);

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

  LIBRARY_SETTINGS.promoCooldown = days;
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));
  RosterService.init(LIBRARY_SETTINGS);

  const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
  userData.days = days;
  RosterService.sendDiscordConfig("cooldownChange", false, userData);
  return;
}

function ManageThreshold(threshold, action) {
  threshold = Number(threshold);
  if (Number(threshold) > 10 || Number(threshold) < 1 || !threshold) return "No valid threshold provided";
  if (!action) return "No action provided";

  LIBRARY_SETTINGS.threshold = threshold;
  LIBRARY_SETTINGS.thresholdAction = action.toString();
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(LIBRARY_SETTINGS));
  RosterService.init(LIBRARY_SETTINGS);

  return "Infraction Threshold Edited";
}