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

function ReturnManualEditing() {
  let properties = PropertiesService.getScriptProperties();
  let manualValue = properties.getProperty("manualEnabled");
  console.log(manualValue);

  return manualValue;
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

function ReturnPings() {
  return LIBRARY_SETTINGS.pings.toString();
}

function ToggleLockdown(value) {
  if (value) {
    RemoveAllDocAccess();
    PropertiesService.getScriptProperties().setProperty("backupEnabled", false);
  } else {
    RosterService.restoreAllDocAccess(JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff")));
  }
  PropertiesService.getScriptProperties().setProperty("lockdownEnabled", value);
  RosterService.sendDiscordConfig("lockdown", value, JSON.parse(PropertiesService.getUserProperties().getProperty("userData")));
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
  if (!inputValue) return;
  // Always Checks Column 8 => might make this configurable in the future
  const sheets = [
    { id: LIBRARY_SETTINGS.rankchangeId, label: "Rank Change" },
    { id: 343884184, label: "Infraction" },
    { id: 977408594, label: "LOA Log" },
    { id: 1787594911, label: "Suspension / Blacklist Log" },
  ];

  const results = [];

  sheets.forEach(sheetInfo => {
    const sheet = RosterService.getCollect(sheetInfo.id);
    const sheetName = sheet.getName();
    try {
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
      RosterService.sendDiscordError(error);
      Logger.log(`Error processing sheet ${sheetName}: ${error.message}`);
    }
  });

  Logger.log(`Combined Results: ${JSON.stringify(results)}`);
  return JSON.stringify(results);
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