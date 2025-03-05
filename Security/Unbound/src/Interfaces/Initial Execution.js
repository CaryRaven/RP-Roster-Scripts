// Initializing instance of library
let LIBRARY_SETTINGS = JSON.parse(PropertiesService.getScriptProperties().getProperty("settings"));
console.log(LIBRARY_SETTINGS);
RosterService.init(LIBRARY_SETTINGS);

function T() {
  
}

/**
 * Function that runs when web app is opened / refreshed. Default google function thus it cannot be used in your project, only defined/declared once
 */
function doGet() {
  const user = Session.getActiveUser().getEmail();
  let userData = RosterService.getUserData(user);
  const allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));

  if (allowedStaff.includes(user)) {
    userData.name = "N/A";
    userData.steamId = "N/A";
    userData.discordId = "N/A";
    userData.rank = "Blackshadow Staff";
  }

  PropertiesService.getUserProperties().setProperty("userData", JSON.stringify(userData));
  const lockdown = PropertiesService.getScriptProperties().getProperty("lockdownEnabled");

  if (lockdown === "true") {
    if (!LIBRARY_SETTINGS.adminRanks.includes(userData.rank) && !allowedStaff.includes(user)) {
      const lockdownPage = HtmlService.createTemplateFromFile("Interfaces/Unauthed Access");
      lockdownPage.type = "lockdown";
      return lockdownPage.evaluate();
    }
  }

  if ((allowedStaff.includes(user) || LIBRARY_SETTINGS.adminRanks.includes(userData.rank)) && userData.status != "Suspended") {
    const template = HtmlService.createTemplateFromFile("Interfaces/Admin Menu");
    template.user = user;
    template.data = userData;
    template.ranks = LIBRARY_SETTINGS.ranks;
    template.adminRanks = LIBRARY_SETTINGS.adminRanks;
    template.allowedStaff = allowedStaff;
    if (!template) return;

    const lastOpen = PropertiesService.getUserProperties().getProperty("lastOpenTime");
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

    PropertiesService.getUserProperties().setProperty("lastOpenTime", new Date().valueOf());
    return template.evaluate();
  } else {
    const unauthedPage = HtmlService.createTemplateFromFile("Interfaces/Unauthed Access");
    unauthedPage.type = "unauthed";
    RosterService.sendDiscordUnauthed();
    return unauthedPage.evaluate();
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function ReturnUserData(inputData, bool) {
  return RosterService.getUserData(inputData, null, bool);
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
    spreadsheetId: "1LpkjzBEoOSmw41dDLwONE2Gn9mhSGb5GaiCApnhI3JE",
    rankchangeId: 789793193,
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