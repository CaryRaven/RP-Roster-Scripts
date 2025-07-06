let LIBRARY_SETTINGS = {};
let isInit = false;

/**
 * Initialize the library with settings.
 * @param {LibrarySettings} LIBRARY_SETTINGS - Configuration object for the library.
 */
function init(InputSettings) {

  if (!InputSettings) throw new Error("No settings where provided to library");
  if (getSizeInBytes(InputSettings) >= 8500) throw new Error("Library exceeding size limit");

  const settings = new SettingsTemplate()
  const settingKeys = Object.keys(settings);
  const libraryKeys = Object.keys(InputSettings);

  for (var i = 0; i < settingKeys.length; i++) {
    if (!libraryKeys.includes(settingKeys[i])) throw new Error("Incorrect settings configuration for " + settingKeys[i]);
    if (typeof InputSettings[settingKeys[i]] != typeof settings[settingKeys[i]]) throw new Error("Incorrect setting type for " + settingKeys[i]);
  }
  
  LIBRARY_SETTINGS = InputSettings;
  isInit = true;
}

class SettingsTemplate {
  constructor() {
    this.dataCols = {
      firstCol: 0,
      rank: 0,
      name: 0,
      playerId: 0,
      discordId: 0,
      email: 0,
      infraction: 0,
      lastRankChange: 0,
      status: 0,
      specialization: 0,
      loaEnd: 0,
      blacklistEnd: 0,
      notes: 0,
      supervisor_name: 0,
      supervisor_playerId: 0,
      cooldown: 0
    };

    this.rosterIds = [];
    this.firstMemberRow = 0;
    this.spreadsheetId_main = "";
    this.factionName = "";
    this.colorHex = "";
    this.rosterHex = "";
    this.sheetId_rankchange = 0;
    this.sheetId_infraction = 0;
    this.sheetId_loa = 0;
    this.sheetId_blacklist = 0;
    this.sheetId_reqs = 0;
    this.sheetId_task = 0;
    this.sheetId_merit = 0;
    this.sheetId_reqlogs = 0;
    this.cooldown_loa = 0;
    this.cooldown_promotion = 0;
    this.threshold_num = 0;
    this.threshold_action = "";
    this.leaderPing = '';
    this.spreadsheetId_backup = '';
    this.folderId_interviews = "";
    this.folderId_closedInterviews = "";
    this.folderId_main = "";
    this.folderId_publicDocs = "";
    this.specializations = [];
    this.pings = true;
    this.newRowData = [];
    this.promoReqs = [];
    this.folders = [];
    this.ranks = [];
    this.interviewRequired = [];
    this.modRanks = [];
    // this.managerRanks = [];
    this.adminRanks = [];
    this.meritActions = [];
    this.group = [];
    this.minMeritScore = [];
    // this.minDaysInRank = [];
    this.backupEnabled = true;
    this.lockdownEnabled = true;
    this.manualEnabled = true;
    this.reqsDisabled = true;
    // this.supervisorsDisabled = true;
    // this.modsOnlySupervised = false;
    // this.managersOnlySupervised = false;
  }
}