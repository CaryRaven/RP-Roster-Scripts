/**
 * Send a discord message when submitting a log, supported types:
 * Rank Change (promo, demo, passed interview, transfer, removal), Infractions, LOAs, Certificates, Mentor Logs, Blacklists/Suspensions, Blacklist & Infraction Appeals
 * 
 * @param {Object} inputData - Data object contains values inputted by the user
 * @param {Object} targetData - Object containing data about the target of the log
 * @param {Object} userData - Object containing data about the user of the Admin Menu (stored in a property)
 * @param {Object[]} accessFolders - Folder Object this person has access to
 * @returns {Void}
 */
function sendDiscordLog(inputData, targetData, userData, accessFolders) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!inputData || typeof inputData != "object") throw new Error("sendDiscordLog: no valid inputdata provided");
  if (!targetData || typeof targetData != "object") throw new Error("sendDiscordLog: no valid targetdata provided");
  if (!userData || typeof userData != "object") throw new Error("sendDiscordLog: no valid userdata provided");
  if (!accessFolders || !Array.isArray(accessFolders)) throw new Error("sendDiscordLog: no access folders provided");

  // Variable init
  let embedTitle = '';
  let embedColor = '';
  let field1Name = '';
  let info = '';
  let reason = inputData.reason;
  let footerMessage = '';
  let folderChanges = accessFolders.map(folder => ` ${folder.folderName} - ${folder.permission} access /`);
  let supervisorInfo = `Name: ${userData.name}\nSteamID: ${userData.steamId}\nRank: ${userData.rank}`;
  let date = Utilities.formatDate(new Date(), 'GMT', 'dd MMMM yyyy');
  let appealTo = "Site Management";

  if (LIBRARY_SETTINGS.factionName.includes("Management")) appealTo = "Staff Administration";

  // Set case-specific data to create speclialized discord notifs
  switch (inputData.type) {
    case "Rank Change":
      switch (inputData.rankchangetype) {
        case 'Promotion':
          embedTitle = `✅ New ${targetData.newRank} ✅`;
          embedColor = '1143627';
          field1Name = 'Please congratulate 🥁...'; // drumrolls
          info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nDiscord ID: ${targetData.discordId}\nGmail Address: ${inputData.email}`;
          footerMessage = `Congratulations - ${LIBRARY_SETTINGS.factionName} Command.`;
          break;
        case 'Demotion':
          embedTitle = `❌ ${LIBRARY_SETTINGS.factionName} Demotion ❌`;
          embedColor = '11600386';
          field1Name = 'General Information';
          info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nDemoted from: ${targetData.rank}\nNew Rank: ${targetData.newRank}`;
          footerMessage = `This may be appealed to ${appealTo}.`;
          break;
        case 'Passed Interview':
          embedTitle = `👔 New ${LIBRARY_SETTINGS.ranks[0]} 👔`;
          embedColor = '39423';
          field1Name = 'Please Congratulate 🥁...'; // more drumrolls
          info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}`;
          footerMessage = 'Congratulations on passing your interview!';
          break;
        case "Removal":
          embedTitle = `❌ ${LIBRARY_SETTINGS.factionName} Removal  ❌`;
          embedColor = '11600386';
          field1Name = 'General Information';
          info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nRemoved from: ${targetData.rank}`;
          footerMessage = `This may be appealed to ${appealTo}.`;
          break;
      }
      break;
    case 'Infraction Log':
      embedTitle = `❌ ${inputData.infraction_type} Infraction Issued ❌`;
      embedColor = '11600386';
      field1Name = 'Infraction Information';
      info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nRank: ${targetData.rank}`;
      footerMessage = `This may be appealed to ${appealTo}.`;
      break;
    case 'Blacklist':
      embedTitle = `❌ ${LIBRARY_SETTINGS.factionName} ${inputData.blacklist_type} Issued ❌`;
      embedColor = '0';
      field1Name = `${inputData.blacklist_type} Information`;
      inputData.end_date = Utilities.formatDate(new Date(inputData.end_date), 'GMT', 'dd MMMM yyyy');
      info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nExpiry Date: ${inputData.end_date}\nAppealable: ${inputData.blacklist_appealable}`;
      footerMessage = `This may be appealed to ${appealTo}.`;
      break;
    case 'LOA Log':
      embedTitle = '💤 LOA Started 💤';
      embedColor = '12658943';
      field1Name = 'LOA Information';
      inputData.end_date = Utilities.formatDate(new Date(inputData.end_date), 'GMT', 'dd MMMM yyyy');
      info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nStart Date: ${date}\nEnd Date: ${inputData.end_date}`;
      footerMessage = `Enjoy your time off, ${targetData.name}`;
      break;
    case 'Infraction Appeal':
      embedTitle = '🔄 Infraction Appealed 🔄';
      embedColor = '1143627';
      field1Name = 'Appeal Information';
      info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nAppealed Infraction ID: ${targetData.log_id}`;
      footerMessage = 'This infraction is no longer of effect.';
      break;
    case 'Blacklist Appeal':
      embedTitle = `🔄 ${LIBRARY_SETTINGS.factionName} Blacklist/Suspension Appealed 🔄`;
      embedColor = '1143627';
      field1Name = 'Appeal Information';
      info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nAppealed Log ID: ${targetData.log_id}`;
      footerMessage = `This ${LIBRARY_SETTINGS.factionName} blacklist/suspension is no longer of effect.`;
      break;
  }

  // Compose discord embed
  let payload = JSON.stringify({
    username: `${LIBRARY_SETTINGS.factionName} Roster Manager`,
    embeds: [{
      title: embedTitle,
      color: embedColor,
      fields: [
        {
          name: field1Name,
          value: info,
          inline: true
        },
        {
          name: 'Issued by',
          value: supervisorInfo,
          inline: true
        },
        {
          name: 'Why?',
          value: `${reason} ${inputData.type === "Rank Change" ? `\n\nDrive Folder Access:\n${folderChanges}` : ""}`,
          inline: false
        }
      ],
      footer: { text: footerMessage + '\nLogged on ' + date }
    }]
  });

  let params = {
    headers: {
      'Content-Type': 'application/json'
    },
    method: "POST",
    payload: payload,
    muteHttpExceptions: true
  };

  let webhookURLs;
  switch(LIBRARY_SETTINGS.factionName) {
    case "Security":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("securityWebhook"));
      break;
    default:
      throw new Error(`${LIBRARY_SETTINGS.factionName} does not support discord messages yet`);
  }

  // Send message
  webhookURLs.forEach(webhookURL => UrlFetchApp.fetch(webhookURL, params));
  Logger.log('Discord Notification Sent Successfully.');
}

/**
 * Send Discord message if somebody accessed the admin menu without proper permissions.
 * Executes PermissionsGuard too
 * @returns {Void}
 */
function sendDiscordUnauthed() {

  let webhookURLs;
  switch(LIBRARY_SETTINGS.factionName) {
    case "Security":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("securityWebhook"));
      break;
    default:
      throw new Error(`${LIBRARY_SETTINGS.factionName} does not support discord messages yet`);
  }
  let user = Session.getActiveUser().getEmail();

  let payload = JSON.stringify({
    username: `${LIBRARY_SETTINGS.factionName} Roster Manager`,
    embeds: [{
      title: "Unauthed Access",
      color: "11600386",
      fields: [
        {
          name: `Accessed by ${user}`,
          value: "A permission check is being executed, please wait for that report to be sent below this message before taking any action.\nIf no report appears, contact a member of Staff Administration as something went wrong.",
          inline: true
        }
      ],
      footer: { text: 'Logged on ' + Utilities.formatDate(new Date(), 'GMT', 'dd MMMM yyyy') }
    }]
  });

  var params = {
    headers: {
      'Content-Type': 'application/json'
    },
    method: "POST",
    payload: payload,
    muteHttpExceptions: true
  };

  // Send message
  webhookURLs.forEach(webhookURL => UrlFetchApp.fetch(webhookURL, params));
  Logger.log('Discord Notification Sent Successfully.');
  // TODO: add PermissionsGuard();
}