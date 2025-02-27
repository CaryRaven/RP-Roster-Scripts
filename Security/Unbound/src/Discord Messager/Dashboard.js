// Discord alerts are functions that compose & send discord messages through a webhook

/**
 * @param {Object} inputData - Data object contains values inputted by the user
 * @param {Object} targetData - Object containing data about the target of the log
 * @param {Object} userData - Object containing data about the user of the Admin Menu (stored in a property)
 */
function SendDiscordLog(inputData, targetData, userData) {
  // Variable init
  let embedTitle = '';
  let embedColor = '';
  let field1Name = '';
  let info = '';
  let reason = inputData.reason;
  let footerMessage = '';
  let accessFolders = JSON.parse(PropertiesService.getUserProperties().getProperty("accessFolders"));
  let folderChanges = accessFolders.map(folder => ` ${folder.folderName} - ${folder.permission} access /`);
  let supervisorInfo = `Name: ${userData.name}\nSteamID: ${userData.steamId}\nRank: ${userData.rank}`;
  let date = Utilities.formatDate(new Date(), 'GMT', 'dd MMMM yyyy');

  // Set case-specific data to create speclialized discord notifs
  switch (inputData.type) {
    case "Rank Change":
      switch (inputData.rankchangetype) {
        case 'Promotion':
          embedTitle = `✅ New ${targetData.newRank} ✅`;
          embedColor = '1143627';
          field1Name = 'Please congratulate 🥁...'; // drumrolls
          info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nDiscord ID: ${targetData.discordId}\nGmail Address: ${inputData.email}`;
          footerMessage = 'Congratulations - Security Chiefs.';
          break;
        case 'Demotion':
          embedTitle = '❌ Security Demotion ❌';
          embedColor = '11600386';
          field1Name = 'General Information';
          info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nDemoted from: ${targetData.rank}\nNew Rank: ${targetData.newRank}`;
          footerMessage = 'This may be appealed to Site Management.';
          break;
        case 'Passed Interview':
          embedTitle = '👔 New Security Captain 👔';
          embedColor = '39423';
          field1Name = 'Please Congratulate 🥁...'; // more drumrolls
          info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}`;
          footerMessage = 'Congratulations on passing your interview!';
          break;
        case "Removal":
          embedTitle = '❌ Security Removal  ❌';
          embedColor = '11600386';
          field1Name = 'General Information';
          info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nRemoved from: ${targetData.rank}`;
          footerMessage = 'This may be appealed to Site Management.';
          break;
      }
      break;
    case 'Infraction Log':
      embedTitle = `❌ ${inputData.infraction_type} Infraction Issued ❌`;
      embedColor = '11600386';
      field1Name = 'Infraction Information';
      info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nRank: ${targetData.rank}`;
      footerMessage = 'This may be appealed to Site Management.';
      break;
    case 'Blacklist':
      embedTitle = `❌ Security ${inputData.blacklist_type} Issued ❌`;
      embedColor = '0';
      field1Name = `${inputData.blacklist_type} Information`;
      inputData.end_date = Utilities.formatDate(new Date(inputData.end_date), 'GMT', 'dd MMMM yyyy');
      info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nExpiry Date: ${inputData.end_date}\nAppealable: ${inputData.blacklist_appealable}`;
      footerMessage = 'This may be appealed to Site Management.';
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
      embedTitle = `🔄 Security Blacklist/Suspension Appealed 🔄`;
      embedColor = '1143627';
      field1Name = 'Appeal Information';
      info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nAppealed Blacklist ID: ${targetData.log_id}`;
      footerMessage = 'This staff blacklist/suspension is no longer of effect.';
      break;
  }

  let webhookURL = PropertiesService.getScriptProperties().getProperty('WebhookURL');

  // Compose discord embed
  let payload = JSON.stringify({
    username: 'Security Roster Manager',
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

  var params = {
    headers: {
      'Content-Type': 'application/json'
    },
    method: "POST",
    payload: payload,
    muteHttpExceptions: true
  };

  // Send message
  UrlFetchApp.fetch(webhookURL, params);
  Logger.log('Discord Notification Sent Successfully.');
}

/**
 * Send Discord message if somebody accessed the admin menu without proper permissions.
 * Executes PermissionsGuard too
 * @returns {Void}
 * @deprecated
 */
function SendDiscordUnauthed() {

  let webhookURL = PropertiesService.getScriptProperties().getProperty('WebhookURL');
  let user = Session.getActiveUser().getEmail();

  let payload = JSON.stringify({
    username: 'Security Roster Manager',
    embeds: [{
      title: "Unauthed Access",
      color: "11600386",
      fields: [
        {
          name: `Accessed by ${user}`,
          value: "A permission check is being executed, please wait for that report to be sent below this message before taking any action.\nIf no report appears, contact a member of Community Leadership as something went wrong.",
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
  UrlFetchApp.fetch(webhookURL, params);
  Logger.log('Discord Notification Sent Successfully.');
  // PermissionsGuard();
}

/**
 * @param {Array} flagArray - Array with flagged users, returned by PermissionGuard()
 */
function SendDiscordPermissionReport(flagArray) {
  // Forge fields
  const fields = flagArray.map((flag) => ({
    name: `At ${flag.folderName}`,
    value: `User: ${flag.email}\nWrong Permission: ${flag.currentPermission}\nReason: ${flag.reason}`,
    inline: true,
  }));

  let payload = JSON.stringify({
    username: "Staff Roster Access Report",
    content: "", // TODO change to Chief / SM ping in future
    embeds: [
      {
        title: "Flagged Users",
        color: "12585482",
        fields: fields,
        footer: {
          text:
            "This report has been forged so any permission leaks can be spotted and patched in time, please do not ignore this warning. If you are currently unable to deal with the situation, contact a member of Site Management to assist you.\nReport sent on " +
            Utilities.formatDate(new Date(), "GMT", "dd MMMM yyyy"),
        },
      },
    ],
  });

  let params = {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    payload: payload,
    muteHttpExceptions: true,
  };

  // Send message
  const webhook = PropertiesService.getScriptProperties().getProperty("WebhookURL");
  UrlFetchApp.fetch(webhook, params);
}