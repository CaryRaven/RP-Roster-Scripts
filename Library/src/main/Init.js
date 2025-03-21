let LIBRARY_SETTINGS = {};
let isInit = false;

/**
 * Initialize the library with settings.
 * @param {LibrarySettings} LIBRARY_SETTINGS - Configuration object for the library.
 */
function init(InputSettings) {

  if (!InputSettings) throw new Error("No settings where provided to library");

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
      steamId: 0,
      discordId: 0,
      email: 0,
      infraction: 0,
      status: 0,
      specialization: 0,
      loaEnd: 0,
      blacklistEnd: 0,
      notes: 0,
      supervisor_name: 0,
      supervisor_steamId: 0,
      cooldown: 0
    };

    this.rosterIds = [];
    this.firstMemberRow = 0;
    this.spreadsheetId = "";
    this.factionName = "";
    this.folders = [];
    this.ranks = [];
    this.interviewRequired = [];
    this.adminRanks = [];
    this.rankchangeId = 0;
    this.infractionId = 0;
    this.loaId = 0;
    this.blId = 0;
    this.loaCooldown = 0;
    this.promoCooldown = 0;
    this.threshold = 0;
    this.thresholdAction = "";
    this.lastRankChange = 0;
    this.leaderPing = '';
    this.backupsbeetId = '';
    this.interviewFolderId = "";
    this.closedInterviewFolderId = "";
    this.specializations = [];
    this.pings = true;
    this.newRowData = [];
  }
}