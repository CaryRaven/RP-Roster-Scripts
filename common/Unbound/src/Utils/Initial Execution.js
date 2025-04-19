// Initializing instance of library
let LIBRARY_SETTINGS = JSON.parse(PropertiesService.getScriptProperties().getProperty("settings"));
if (RosterService.getSizeInBytes(LIBRARY_SETTINGS) >= 450000) throw new Error("Settings exceeded size limit");
RosterService.init(LIBRARY_SETTINGS);

// test function - ignore
function T() { 
  console.log(DriveApp.getFileById(LIBRARY_SETTINGS.spreadsheetId_main).getName())
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
    userData.playerId = "N/A";
    userData.discordId = "N/A";
    userData.rank = "Office of Site Management";
    userData.email = user;
  } else if (allowedStaff.includes(user)) {
    userData.name = "N/A";
    userData.playerId = "N/A";
    userData.discordId = "N/A";
    userData.rank = "Blackshadow Staff";
    userData.email = user;
  }

  // Set userData property (used per session)
  userProperty.setProperty("userData", JSON.stringify(userData));

  // If lockdown is enabled & not in the Admin Ranks or allowedStaff -> Show terminal animation & decline access
  if (LIBRARY_SETTINGS.lockdownEnabled.toString() === "true") {
    if (!LIBRARY_SETTINGS.modRanks.includes(userData.rank) && !allowedStaff.includes(user)) {
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
  if (allowedStaff.includes(user) || (userData.row && userData.status !== "Suspended")) {
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
    template.ranks = LIBRARY_SETTINGS.ranks;
    template.modRanks = LIBRARY_SETTINGS.modRanks;
    template.managerRanks = LIBRARY_SETTINGS.managerRanks;
    template.adminRanks = LIBRARY_SETTINGS.adminRanks;
    template.allowedStaff = allowedStaff;
    template.factionName = LIBRARY_SETTINGS.factionName;
    template.groups = LIBRARY_SETTINGS.group;

    let ssEditors;

    try {
      ssEditors = DriveApp.getFileById(LIBRARY_SETTINGS.spreadsheetId_main).getEditors().map(editor => editor.getEmail())
    } catch(e) {
      return HtmlService.createHtmlOutput("<h1>You must have opened the Security Roster at least once before being able to access this Admin Menu, please do so and refresh this page after.</h1>");
    }

    // Set which access the user gets
    if (allowedStaff.includes(user)) {

      // Check if user is owner/editor
      if (!ssEditors.includes(user)
        && !DriveApp.getFileById(LIBRARY_SETTINGS.spreadsheetId_main).getOwner().getEmail().includes(userData.email)) return HtmlService.createHtmlOutput("<h1>You do not have sufficient permissions to edit the roster.</h1>");

      template.accessType = "dev";
    } else if (LIBRARY_SETTINGS.adminRanks.includes(userData.rank)) {

      // Check if user is owner/editor
      if (!ssEditors.includes(user)
        && !DriveApp.getFileById(LIBRARY_SETTINGS.spreadsheetId_main).getOwner().getEmail().includes(userData.email)) return HtmlService.createHtmlOutput("<h1>You do not have sufficient permissions to edit the roster.</h1>");

      template.accessType = "admin";
    } else if (LIBRARY_SETTINGS.managerRanks.includes(userData.rank)) {
      if (!ssEditors.includes(user)) return HtmlService.createHtmlOutput("<h1>You do not have sufficient permissions to edit the roster.</h1>");
      template.accessType = "manager";
    } else if (LIBRARY_SETTINGS.modRanks.includes(userData.rank)) {
      template.accessType = "mod";
    } else {
      template.accessType = "visitor";
    }

    template.data = userData;

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
    if (!userData.row) RosterService.sendDiscordUnauthed(); // Send warning (something wrong with doc access)
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
  console.log(rank);
  const userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
  const reqsDisabled = LIBRARY_SETTINGS.reqsDisabled;
  const rankIndex = LIBRARY_SETTINGS.ranks.indexOf(rank);
  
  if (LIBRARY_SETTINGS.promoReqs[rankIndex].length > 0 && reqsDisabled.toString() === "false") {
    RosterService.addReqRow(rank.toString(), num, undefined, LIBRARY_SETTINGS.promoReqs[rankIndex]);
  }

  const returnVal = RosterService.addRankRow(rank, userData, num, discordnotif, undefined); // Actual func
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
 * Returns the current settings for specializations
 * Used to populate config fields when editing an existing specialization
 */
function ReturnSpecs() {
  return JSON.stringify(LIBRARY_SETTINGS.specializations);
}

function GetAllEmails() {
  return JSON.stringify(RosterService.getAllEmails());
}

/**
 * Reset the settings of this admin menu
 * Must be done when adding a new option to the settings obj to aling with the library
 * |-> Cannot use library without a full & complete settings obj
 */
function Set() {
  // throw new Error("Do not run this function from the editor");
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify({
    dataCols: {
      firstCol: 3,
      rank: 4,
      name: 5,
      playerId: 6,
      discordId: 7,
      email: 8,
      infraction: 10,
      status: 11,
      specialization: 12,
      lastRankChange: 13,
      loaEnd: 14,
      blacklistEnd: 17,
      notes: 18,
      supervisor_name: 1,
      supervisor_playerId: 1,
      cooldown: 1,
      firstReqRow: 6
    },

    rosterIds: [2063800821, 46188961],
    firstMemberRow: 6,
    spreadsheetId_main: "1LpkjzBEoOSmw41dDLwONE2Gn9mhSGb5GaiCApnhI3JE",
    spreadsheetId_backup: "1Dy34hbsmJFd2nZHsOFCDcwk7TpblQfgSNWPeUpTOv64",
    folderId_interviews: "17ARu5vNWpQ8Td3yPxGiDRxNWYfYO37ZB",
    folderId_closedInterviews: "1Nr4xPCEfMMtynlzJqenrjt7itkCSBfYq",
    folderId_main: "1zhE5Rs1vlDNvuYMD8rAToMpjFd8rKahc",
    folderId_publicDocs: "13U1EGXwSfQYVdUoYMzSfmxfBSEDNwN4A",
    sheetId_rankchange: 789793193,
    sheetId_infraction: 343884184,
    sheetId_loa: 977408594,
    sheetId_blacklist: 1787594911,
    sheetId_reqs: 46188961,
    sheetId_task: 1504741049,
    cooldown_loa: 14,
    cooldown_promotion: 14,
    threshold_num: 3,
    threshold_action: "Suspension",
    leaderPing: '1186431632647921736',
    factionName: "Security",
    colorHex: "#2b547e",
    modRanks: [],
    managerRanks: [],
    adminRanks: ["Security Chief", "Office of Site Management"],
    folders: [ { viewerAccess: 
     [ '1UZFKjpPueZEQvkqkHXwykyLv9DcCVpZE',
       '1LpkjzBEoOSmw41dDLwONE2Gn9mhSGb5GaiCApnhI3JE' ],
    editorAccess: [] },
  { viewerAccess: 
     [ '1UZFKjpPueZEQvkqkHXwykyLv9DcCVpZE',
       '1LpkjzBEoOSmw41dDLwONE2Gn9mhSGb5GaiCApnhI3JE' ],
    editorAccess: [] },
  [ '1UZFKjpPueZEQvkqkHXwykyLv9DcCVpZE',
    '13U1EGXwSfQYVdUoYMzSfmxfBSEDNwN4A',
    '1p_H8U7AV0Fa21je8NxinPGK34-7rQnf-',
    '17ARu5vNWpQ8Td3yPxGiDRxNWYfYO37ZB',
    '1LpkjzBEoOSmw41dDLwONE2Gn9mhSGb5GaiCApnhI3JE',
    '1zhE5Rs1vlDNvuYMD8rAToMpjFd8rKahc',
    '1PPQsskt8pohBTmfAvniXebwzVt0XIOfuSco4xlOha8iqJj6OZgCJS5uJ',
    '1MbMChbevrX1mx5gHGGL74SQ8cbABt_kQMdcwbLWXnC8',
    '1QiBmaUTcKU0iZ1uyEYH30ZGD8cAZfjz5M0LEb5ZceZU',
    '1Hor8B4_cxYYtjmkNtsVcBWBaR2rWRfDV',
    '1IQvMVAE6xS93NbOwaS60IqCAfVMKqFPg1tmvifT8bYg',
    '1zQnOxsHb3BVEQTLn9ySSj8myKrNCclNUWSWQMOkRJpk',
    '10RmXJBe6IWA5DMQtfrQFaeXy5u7UEtzkQ1jjRngsVow' ] ],
    ranks: ["Captain","Captain Major","Security Chief","Office of Site Management"],
    interviewRequired: [true, false, false, false],
    promoReqs: [[], [], [], []],
    group: ["Security","Security","Sr CL4","Sr CL4"],
    specializations: [{title: "", desc: ""}, {title: "Security Liaison", desc: "In charge of voicing the concerns/suggestions... of the site\'s junior personnel to the Chiefs"},{ title: 'Punishment Lead',desc: 'Specialist of the security department\'s policies, in charge of handing out appropriate punishments to security personnel.' }],
    pings: true,
    backupEnabled: true,
    lockdownEnabled: false,
    manualEnabled: false,
    reqsDisabled: true,
    newRowData: [[ // TODO: Add a way to dynamically edit this?
      "/title/", "/title/", "", "", "", "", "", 
      `= INFRACTIONS(F/row/, Infractions!E:E, Infractions!H:H, Infractions!I:I, Infractions!C:C)`,
      `= STATUS(F/row/, G/row/, E/row/, H/row/, 'LOA Logs'!E:E, N/row/, Infractions!H:H, Infractions!E:E, Infractions!I:I, Infractions!C:C, P/row/)`,
      "",
      `= LAST_RANKCHANGE(F/row/, 'Rank Changes'!E:E, 'Rank Changes'!C:C)`,
      `= LOA_DATE(F/row/, 'LOA Logs'!E:E, 'LOA Logs'!G:G)`,
      false,
      `= REQS_CHECK(F/row/, 'Promotion Progress'!F:F, 'Promotion Progress'!H:L)`,
      `= BLACKLIST_DATE(F/row/, 'Suspensions / Blacklists'!E:E, 'Suspensions / Blacklists'!H:H, 'Suspensions / Blacklists'!J:J)`, ""
    ]]
  }));
}