// Initializing instance of library
let LIBRARY_SETTINGS = JSON.parse(PropertiesService.getScriptProperties().getProperty("settings"));
if (RosterService.getSizeInBytes(LIBRARY_SETTINGS) >= 450000) throw new Error("Settings exceeded size limit");
RosterService.init(LIBRARY_SETTINGS);

function T() {
  console.log(LIBRARY_SETTINGS);
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

  // Set different rank for SM & Staff -> Currently only works for the security sm liaison
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

  // Set userData property (used per session)
  userProperty.setProperty("userData", JSON.stringify(userData));

  // If lockdown is enabled & not in the Admin Ranks or allowedStaff -> Show terminal animation & decline access
  const lockdown = PropertiesService.getScriptProperties().getProperty("lockdownEnabled");
  if (lockdown === "true") {
    if (!LIBRARY_SETTINGS.adminRanks.includes(userData.rank) && !allowedStaff.includes(user)) {
      const lockdownFile = RosterService.getHtmlRetroTerminal();
      const lockdownPage = HtmlService.createTemplate(lockdownFile);
      lockdownPage.type = "lockdown";
      lockdownPage.rank = userData.rank;
      lockdownPage.name = userData.name;
      lockdownPage.factionName = LIBRARY_SETTINGS.factionName;
      return lockdownPage.evaluate();
    }
  }

  // Actual admin menu -> Check if allowed (allowedStaff, adminRanks & not suspended)
  if ((allowedStaff.includes(user) || LIBRARY_SETTINGS.adminRanks.includes(userData.rank)) && userData.status !== "Suspended") {
    const lastOpenTerminal = userProperty.getProperty("lastOpenTime"); // deciding terminal
    let configShowTerminal = userProperty.getProperty("configShowTerminal");
    let terminalShownThisSession = userProperty.getProperty("terminalShownThisSession");

    // Ensure configShowTerminal is initialized
    if (!lastOpenTerminal) {
      userProperty.setProperty("configShowTerminal", "false");
      configShowTerminal = "true";
    }

    if (configShowTerminal === "true" && terminalShownThisSession !== "true") {
      const terminalPage = RosterService.getHtmlTerminalAnimation();
      const terminal = HtmlService.createTemplate(terminalPage);
      terminal.name = userData.name;
      terminal.rank = userData.rank;

      // Mark that terminal has been shown for this session
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
    template.factionName = LIBRARY_SETTINGS.factionName;

    const latestChangelog = JSON.parse(PropertiesService.getScriptProperties().getProperty("lastestChangeLog"));
    let changeDate = latestChangelog.date;
    let changeTime = new Date(changeDate).valueOf();
    const lastOpenMenu = PropertiesService.getUserProperties().getProperty("lastOpenMenu");

    // Check if changelog pop-up should be shown
    if (lastOpenMenu - changeTime < 0) {
      template.viewChange = true;
      template.changeDate = Utilities.formatDate(new Date(changeDate), "GMT", "dd MMMM yyyy");
    } else {
      template.viewChange = false;
      template.changeDate = null;
    }

    // Store the manualEnabled property on the roster so it can be accessed by the bound script
    const value = PropertiesService.getScriptProperties().getProperty("manualEnabled");
    const sheet = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);
    sheet.getRange(10, 1).setValue(value);

    userProperty.setProperty("lastOpenMenu", new Date().valueOf());
    return template.evaluate();
  } else {
    // If not authed
    const unauthedFile = RosterService.getHtmlRetroTerminal();
    const unauthedPage = HtmlService.createTemplate(unauthedFile);
    unauthedPage.type = "unauthed";
    unauthedPage.rank = "user";
    unauthedPage.factionName = LIBRARY_SETTINGS.factionName;
    unauthedPage.name = "Undefined";
    RosterService.sendDiscordUnauthed(); // Send warning (something wrong with doc access)
    return unauthedPage.evaluate();
  }
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
  const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
  const returnVal = RosterService.addRankRow(rank, userData, num, discordnotif); // Actual func
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
function ReturnUserData(inputData, bool) {
  return RosterService.getUserData(inputData, null, bool);
}

/**
 * Workaround to get images (located in drive) to load into the web app
 * Found solution on stackoverflow
 */
function loadImageBytes(id) {
  return RosterService.loadImageBytes(id);
}

/**
 * Currently broken & not used
 * @deprecated
 */
function ReportError(error) {
  RosterService.sendDiscordError(error);
}

/**
 * Returns the current settings for specializations
 * Used to populate config fields when editing an existing specialization
 */
function ReturnSpecs() {
  return JSON.stringify(LIBRARY_SETTINGS.specializations);
}

/**
 * Reset the settings of this admin menu
 * Must be done when adding a new option to the settings obj to aling with the library
 * |-> Cannot use library without a full & complete settings obj
 */
function Set() {
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify({
    dataCols: {
      firstCol: 3,
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
    infractionId: 343884184,
    loaId: 977408594,
    blId: 1787594911,
    loaCooldown: 14,
    promoCooldown: 14,
    threshold: 3,
    thresholdAction: "Suspension",
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
    ranks: ["Captain","Captain Major","Security Chief","Site Management"],
    specializations: [{title: "", desc: ""}, {title: "Security Liaison", desc: "In charge of voicing the concerns/suggestions... of the site\'s junior personnel to the Chiefs"}],
    pings: true,
    newRowData: [[ // TODO: Add a way to dynamically edit this?
      "/title/", "/title/", "", "", "", "", "", 
      `= INFRACTIONS(F/row/, Infractions!E:E, Infractions!H:H, Infractions!I:I, Infractions!C:C)`,
      `= STATUS(F/row/, G/row/, E/row/, H/row/, 'LOA Logs'!E:E, N/row/, Infractions!H:H, Infractions!E:E, Infractions!I:I, Infractions!C:C, P/row/)`,
      "",
      `= LAST_RANKCHANGE(F/row/, 'Rank Changes'!E:E, 'Rank Changes'!C:C)`,
      `= LOA_DATE(F/row/, 'LOA Logs'!E:E, 'LOA Logs'!G:G)`,
      false,
      `= BLACKLIST_DATE(F/row/, 'Suspensions / Blacklists'!E:E, 'Suspensions / Blacklists'!H:H, 'Suspensions / Blacklists'!J:J)`, ""
    ]]
  }));
}