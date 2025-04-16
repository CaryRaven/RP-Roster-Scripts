// Initializing instance of library
let LIBRARY_SETTINGS = JSON.parse(PropertiesService.getScriptProperties().getProperty("settings"));
if (RosterService.getSizeInBytes(LIBRARY_SETTINGS) >= 450000) throw new Error("Settings exceeded size limit");
RosterService.init(LIBRARY_SETTINGS);

// test function - ignore
function T() { 
  DriveApp.getFileById(LIBRARY_SETTINGS.spreadsheetId_main).removeViewer("noir.px@hotmail.com");
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
    template.adminRanks = LIBRARY_SETTINGS.modRanks;
    template.allowedStaff = allowedStaff;
    template.factionName = LIBRARY_SETTINGS.factionName;

    // Set which access the user gets
    if (allowedStaff.includes(user)) {

      // Check if user is owner/editor
      if (!DriveApp.getFileById(LIBRARY_SETTINGS.spreadsheetId_main).getEditors().includes(Session.getActiveUser()) 
        && !DriveApp.getFileById(LIBRARY_SETTINGS.spreadsheetId_main).getOwner().getEmail().includes(userData.email)) return HtmlService.createHtmlOutput("<h1>You do not have sufficient permissions to edit the roster.</h1>");

      template.accessType = "dev";
    } else if (LIBRARY_SETTINGS.adminRanks.includes(userData.rank)) {

      // Check if user is owner/editor
      if (!DriveApp.getFileById(LIBRARY_SETTINGS.spreadsheetId_main).getEditors().includes(Session.getActiveUser()) 
        && !DriveApp.getFileById(LIBRARY_SETTINGS.spreadsheetId_main).getOwner().getEmail().includes(userData.email)) return HtmlService.createHtmlOutput("<h1>You do not have sufficient permissions to edit the roster.</h1>");

      template.accessType = "admin";
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

    // Store the manualEnabled property on the roster so it can be accessed by the bound script
    const sheet = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);
    sheet.getRange(10, 1).setValue(LIBRARY_SETTINGS.manualEnabled.toString());

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