// Initializing instance of library
let LIBRARY_SETTINGS = JSON.parse(PropertiesService.getScriptProperties().getProperty("settings"));
RosterService.init(LIBRARY_SETTINGS);

function T() {
  
}

/**
 * Web app entry point. Default google function thus it cannot be used in your project, only defined/declared once
 */
function doGet() {
  let user = Session.getActiveUser().getEmail();
  Logger.log(user);
  let userProperty = PropertiesService.getUserProperties();
  let userData = RosterService.getUserData(user);
  const allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));

  if (userData.email == "N/A") {
    userData.name = "N/A";
    userData.steamId = "N/A";
    userData.discordId = "N/A";
    userData.rank = "Site Management";
  } else if (allowedStaff.includes(user)) {
    userData.name = "N/A";
    userData.steamId = "N/A";
    userData.discordId = "N/A";
    userData.rank = "Blackshadow Staff";
  }

  userProperty.setProperty("userData", JSON.stringify(userData));

  const lockdown = PropertiesService.getScriptProperties().getProperty("lockdownEnabled");
  if (lockdown === "true") {
    if (!LIBRARY_SETTINGS.adminRanks.includes(userData.rank) && !allowedStaff.includes(user)) {
      const lockdownPage = HtmlService.createTemplateFromFile("Interfaces/Utility");
      lockdownPage.type = "lockdown";
      lockdownPage.rank = userData.rank;
      lockdownPage.name = userData.name;
      lockdownPage.factionName = LIBRARY_SETTINGS.factionName;
      return lockdownPage.evaluate();
    }
  }

  if ((allowedStaff.includes(user) || LIBRARY_SETTINGS.adminRanks.includes(userData.rank)) && userData.status !== "Suspended") {
    const lastOpen = userProperty.getProperty("lastOpenTime");
    let configShowTerminal = userProperty.getProperty("configShowTerminal");
    let terminalShownThisSession = userProperty.getProperty("terminalShownThisSession");

    // Ensure configShowTerminal is initialized
    if (!lastOpen) {
      userProperty.setProperty("configShowTerminal", "false");
      configShowTerminal = "true";
    }

    if (configShowTerminal === "true" && terminalShownThisSession !== "true") {
      const terminalPage = RosterService.getHtmlTerminalAnimation();
      const terminal = HtmlService.createTemplate(terminalPage);
      terminal.name = userData.name;
      terminal.rank = userData.rank;

      // Mark that Utility has been shown for this session
      userProperty.setProperty("terminalShownThisSession", "true");
      userProperty.setProperty("lastOpenTime", new Date().valueOf());
      return terminal.evaluate();
    }

    // Reset terminalShownThisSession so it works on the next refresh
    userProperty.deleteProperty("terminalShownThisSession");

    // Load the Admin Menu
    const template = HtmlService.createTemplateFromFile("Interfaces/Admin Menu");
    template.user = user;
    template.data = userData;
    template.ranks = LIBRARY_SETTINGS.ranks;
    template.adminRanks = LIBRARY_SETTINGS.adminRanks;
    template.allowedStaff = allowedStaff;

    const latestChangelog = JSON.parse(PropertiesService.getScriptProperties().getProperty("lastestChangeLog"));
    let changeDate = latestChangelog.date;
    let changeTime = new Date(changeDate).valueOf();

    if (lastOpen - changeTime < 0) {
      template.viewChange = true;
      template.changeDate = Utilities.formatDate(new Date(changeDate), "GMT", "dd MMMM yyyy");
    } else {
      template.viewChange = false;
      template.changeDate = null;
    }

    const value = PropertiesService.getScriptProperties().getProperty("manualEnabled");
    const sheet = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);
    sheet.getRange(10, 1).setValue(value);

    userProperty.setProperty("lastOpenTime", new Date().valueOf());
    return template.evaluate();
  } else {
    const unauthedPage = HtmlService.createTemplateFromFile("Interfaces/Utility");
    unauthedPage.type = "unauthed";
    unauthedPage.rank = "user";
    unauthedPage.factionName = LIBRARY_SETTINGS.factionName;
    unauthedPage.name = "Undefined";
    RosterService.sendDiscordUnauthed();
    return unauthedPage.evaluate();
  }
}

function GetScriptUrl() {
  PropertiesService.getUserProperties().setProperty("showTerminal", false);
  return ScriptApp.getService().getUrl();
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function ReturnUserData(inputData, bool) {
  return RosterService.getUserData(inputData, null, bool);
}

function loadImageBytes(id) {
  return RosterService.loadImageBytes(id);
}

function ReportError(error) {
  RosterService.sendDiscordError(error);
}

function Set() {
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify({
    dataCols: {
      rank: 4,
      name: 5,
      steamId: 6,
      discordId: 7,
      email: 8,
      infraction: 10,
      status: 11,
      specialization: 12,
      loaEnd: 14,
      blacklistEnd: 16,
      notes: 17,
      supervisor_name: 1,
      supervisor_steamId: 1,
      cooldown: 1
    },

    rosterIds: [2063800821],
    firstMemberRow: 6,
    lastRankChange: 13,
    spreadsheetId: "1LpkjzBEoOSmw41dDLwONE2Gn9mhSGb5GaiCApnhI3JE",
    backupsbeetId: "1Dy34hbsmJFd2nZHsOFCDcwk7TpblQfgSNWPeUpTOv64",
    rankchangeId: 789793193,
    leaderPing: '1186431632647921736',
    factionName: "Security",
    adminRanks: ["Security Chief"],
    folders: [
      {
        "viewerAccess":["1UZFKjpPueZEQvkqkHXwykyLv9DcCVpZE"],
        "editorAccess":[]
      },
      {
        "viewerAccess":["1UZFKjpPueZEQvkqkHXwykyLv9DcCVpZE"],
        "editorAccess":["13U1EGXwSfQYVdUoYMzSfmxfBSEDNwN4A"]
      },
      [
        "1UZFKjpPueZEQvkqkHXwykyLv9DcCVpZE",
        "13U1EGXwSfQYVdUoYMzSfmxfBSEDNwN4A",
        "1p_H8U7AV0Fa21je8NxinPGK34-7rQnf-"
      ]
    ],
    ranks: ["Captain","Captain Major","Security Chief","Site Management"]
  }));
}