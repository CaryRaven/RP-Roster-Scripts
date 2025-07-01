// Initializing instance of library
let LIBRARY_SETTINGS = JSON.parse(PropertiesService.getScriptProperties().getProperty("settings"));
if (RosterService.getSizeInBytes(LIBRARY_SETTINGS) >= 450000) throw new Error("Settings exceeded size limit");
RosterService.init(LIBRARY_SETTINGS);

// test function - ignore
function T() {
}

/**
 * Web app entry point
 */
function doGet(e) {
  if (!e) throw new Error("Do not run this function from the editor");
  let user = Session.getActiveUser().getEmail();
  Logger.log(user);

  let userProperty = PropertiesService.getUserProperties();
  let userData;

  // Try to get userdata, if not possible return error screen
  try {
    userData = RosterService.getUserData(user);
  } catch(e) {
    return ReturnUnauthPage();
  }

  const allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));

  // Set different rank for SM & Staff -> Currently only works for the security sm liaison
  if (userData.email == "N/A") {
    userData.name = "N/A";
    userData.playerId = "N/A";
    userData.discordId = "N/A";

    // :hardcode
    userData.rank = "Office of Site Management";
    userData.email = user;
  } else if (allowedStaff.includes(user)) {
    userData.name = "N/A";
    userData.playerId = "N/A";
    userData.discordId = "N/A";

    // :hardcode
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
  // :hardcode
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
    const template = HtmlService.createTemplate(RosterService.getAdminMenu());

    template.user = user;
    template.ranks = LIBRARY_SETTINGS.ranks;
    template.modRanks = LIBRARY_SETTINGS.modRanks;
    template.managerRanks = LIBRARY_SETTINGS.managerRanks;
    template.adminRanks = LIBRARY_SETTINGS.adminRanks;
    template.allowedStaff = allowedStaff;
    template.factionName = LIBRARY_SETTINGS.factionName;
    template.groups = LIBRARY_SETTINGS.group;
    template.hex = LIBRARY_SETTINGS.colorHex;
    template.sheetId = LIBRARY_SETTINGS.spreadsheetId_main;
    template.supervisorIdentifier = LIBRARY_SETTINGS.supervisorsDisabled;

    let ssEditors;

    try {
      ssEditors = DriveApp.getFileById(LIBRARY_SETTINGS.spreadsheetId_main).getEditors().map(editor => editor.getEmail())
    } catch(e) {
      // :hardcode
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
    return ReturnUnauthPage();
  }
}

/**
 * @returns {HTMLTemplate}
 */
function ReturnUnauthPage() {
  const unauthedFile = RosterService.getHtmlRetroTerminal();
  const unauthedPage = HtmlService.createTemplate(unauthedFile);
  unauthedPage.type = "unauthed";
  
  // :hardcode
  unauthedPage.rank = "user";
  unauthedPage.factionName = LIBRARY_SETTINGS.factionName;
  unauthedPage.name = "Undefined";
  RosterService.sendDiscordUnauthed(); // Send warning (something wrong with doc access)
  return unauthedPage.evaluate();
}

/**
 * Reset the settings of this admin menu
 * Must be done when adding a new option to the settings obj to aling with the library
 * |-> Cannot use library without a full & complete settings obj
 */
function Set() {
  // throw new Error("Do not run this function from the editor");
  PropertiesService.getScriptProperties().setProperty("settings", JSON.stringify(	{ dataCols: 
   { firstCol: 3,
     rank: 4,
     name: 5,
     playerId: 6,
     discordId: 7,
     email: 8,
     infraction: 10,
     merits: 11,
     status: 12,
     specialization: 13,
     lastRankChange: 14,
     loaEnd: 15,
     taskAssigned: 16,
     blacklistEnd: 18,
     notes: 19,
     supervisor_name: 1,
     supervisor_playerId: 1,
     cooldown: 1,
     firstReqRow: 6 },
  rosterIds: [ 2063800821, 46188961 ],
  firstMemberRow: 6,
  spreadsheetId_main: '1LpkjzBEoOSmw41dDLwONE2Gn9mhSGb5GaiCApnhI3JE',
  spreadsheetId_backup: '1Dy34hbsmJFd2nZHsOFCDcwk7TpblQfgSNWPeUpTOv64',
  folderId_interviews: '17ARu5vNWpQ8Td3yPxGiDRxNWYfYO37ZB',
  folderId_closedInterviews: '1Nr4xPCEfMMtynlzJqenrjt7itkCSBfYq',
  folderId_main: '1zhE5Rs1vlDNvuYMD8rAToMpjFd8rKahc',
  folderId_publicDocs: '13U1EGXwSfQYVdUoYMzSfmxfBSEDNwN4A',
  sheetId_rankchange: 789793193,
  sheetId_infraction: 343884184,
  sheetId_loa: 977408594,
  sheetId_blacklist: 1787594911,
  sheetId_reqs: 46188961,
  sheetId_task: 1504741049,
  sheetId_merit: 1635403376,
  sheetId_reqlogs: 1535565949,
  cooldown_loa: 14,
  cooldown_promotion: 14,
  threshold_num: 3,
  threshold_action: 'Suspension',
  leaderPing: '1186431632647921736',
  factionName: 'Security',
  colorHex: '#2b547e',
  rosterHex: '#2b547e',
  modRanks: [ 'Captain Major' ],
  managerRanks: [],
  adminRanks: [ 'Security Chief', 'Office of Site Management' ],
  folders: 
   [ { viewerAccess: [], editorAccess: [] },
  { viewerAccess: [], editorAccess: [] },
  { viewerAccess: 
     [ '1UZFKjpPueZEQvkqkHXwykyLv9DcCVpZE',
       '13U1EGXwSfQYVdUoYMzSfmxfBSEDNwN4A' ],
    editorAccess: [] },
  { viewerAccess: 
     [ '1UZFKjpPueZEQvkqkHXwykyLv9DcCVpZE',
       '13U1EGXwSfQYVdUoYMzSfmxfBSEDNwN4A' ],
    editorAccess: [] },
  [ '1UZFKjpPueZEQvkqkHXwykyLv9DcCVpZE',
    '13U1EGXwSfQYVdUoYMzSfmxfBSEDNwN4A',
    '1p_H8U7AV0Fa21je8NxinPGK34-7rQnf-',
    '17ARu5vNWpQ8Td3yPxGiDRxNWYfYO37ZB',
    '1LpkjzBEoOSmw41dDLwONE2Gn9mhSGb5GaiCApnhI3JE',
    '1zhE5Rs1vlDNvuYMD8rAToMpjFd8rKahc',
    '1PPQsskt8pohBTmfAvniXebwzVt0XIOfuSco4xlOha8iqJj6OZgCJS5uJ',
    '1MbMChbevrX1mx5gHGGL74SQ8cbABt_kQMdcwbLWXnC8',
    '1Hor8B4_cxYYtjmkNtsVcBWBaR2rWRfDV',
    '1IQvMVAE6xS93NbOwaS60IqCAfVMKqFPg1tmvifT8bYg',
    '1zQnOxsHb3BVEQTLn9ySSj8myKrNCclNUWSWQMOkRJpk',
    '10RmXJBe6IWA5DMQtfrQFaeXy5u7UEtzkQ1jjRngsVow',
    '1Pnh9FaNnlVho5T2cfJSg6PaPg_UFaiF8Lc81EYfjx7Y' ] ],
  ranks: 
   [ 'Reserve Captain',
     'Trial Captain',
     'Captain',
     'Captain Major',
     'Security Chief',
     'Office of Site Management' ],
  interviewRequired: [ false, false, false, false, false, false ],
  promoReqs: [ [], [], [], [], [], [] ],
  group: 
   [ 'Departmental Seniors',
     'Departmental Seniors',
     'Departmental Seniors',
     'Departmental Seniors',
     'Sr CL4',
     'Sr CL4' ],
  specializations: 
   [ { title: '', desc: '' },
     { title: 'Security Liaison',
       desc: 'In charge of voicing the concerns/suggestions of junior security personnel to the rest of Security Command' },
     { title: 'Punishment Lead',
       desc: 'Specialist of the security department\'s policies, in charge of handing out appropriate punishments to security personnel.' },
     { title: 'Head of Propaganda',
       desc: 'In charge of making the department live up to its name.' } ],
  meritActions: [],
  minMeritScore: [ 0, 0, 0, 0, 0, 0, 0, 0 ],
  pings: false,
  backupEnabled: true,
  lockdownEnabled: false,
  manualEnabled: false,
  reqsDisabled: true,
  supervisorsDisabled: true,
  modsOnlySupervised: false,
  managersOnlySupervised: false,
  newRowData: 
   [ [ '/title/',
       '/title/',
       '',
       '',
       '',
       '',
       '',
       '= INFRACTIONS(F/row/, Infractions!E:E, Infractions!H:H, Infractions!I:I, Infractions!C:C)',
       '= GET_MERIT_COUNT(F/row/, \'Merit Logs\'!I:I, \'Merit Logs\'!C:C, \'Merit Logs\'!E:E)',
       '= STATUS(F/row/, G/row/, E/row/, H/row/, \'LOA Logs\'!E:E, N/row/, Infractions!H:H, Infractions!E:E, Infractions!I:I, Infractions!C:C, R/row/)',
       '',
       '= LAST_RANKCHANGE(F/row/, \'Rank Changes\'!E:E, \'Rank Changes\'!C:C)',
       '= LOA_DATE(F/row/, \'LOA Logs\'!E:E, \'LOA Logs\'!H:H, \'LOA Logs\'!G:G, \'LOA Logs\'!I:I)',
       '= HAS_TASK(E/row/)',
       '= REQS_CHECK(F/row/, \'Promotion Progress\'!F:F, \'Promotion Progress\'!H:M)',
       '= BLACKLIST_DATE(F/row/, \'Suspensions / Blacklists\'!E:E, \'Suspensions / Blacklists\'!H:H, \'Suspensions / Blacklists\'!J:J)',
       '' ] ] }));
}