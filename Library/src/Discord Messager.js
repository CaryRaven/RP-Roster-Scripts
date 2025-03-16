// File containing all sorts of discord messages that can be sent through a webhook

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
function sendDiscordLog(inputData, targetData, userData) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!inputData || typeof inputData != "object") throw new Error("sendDiscordLog: no valid inputdata provided");
  if (!targetData || typeof targetData != "object") throw new Error("sendDiscordLog: no valid targetdata provided");
  if (!userData || typeof userData != "object") throw new Error("sendDiscordLog: no valid userdata provided");
  // if (!accessFolders || !Array.isArray(accessFolders)) throw new Error("sendDiscordLog: no access folders provided");

  // Variable init
  let embedTitle = '';
  let embedColor = '';
  let field1Name = '';
  let info = '';
  let content = '';
  let reason = inputData.reason;
  let footerMessage = '';
  // let folderChanges = accessFolders.map(folder => ` ${folder.folderName} - ${folder.permission} access /`);
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
          if (LIBRARY_SETTINGS.pings == true) content = `<@${targetData.discordId.toString()}>`;
          break;
        case 'Demotion':
          embedTitle = `❌ ${LIBRARY_SETTINGS.factionName} Demotion ❌`;
          embedColor = '11600386';
          field1Name = 'General Information';
          info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nDemoted from: ${targetData.rank}\nNew Rank: ${targetData.newRank}`;
          footerMessage = `This may be appealed to ${appealTo}.`;
          if (LIBRARY_SETTINGS.pings == true) content = `<@${targetData.discordId.toString()}>`;
          break;
        case 'Passed Interview':
          embedTitle = `👔 New ${LIBRARY_SETTINGS.ranks[0]} 👔`;
          embedColor = '39423';
          field1Name = 'Please Congratulate 🥁...'; // more drumrolls
          info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}`;
          footerMessage = 'Congratulations on passing your interview!';
          if (LIBRARY_SETTINGS.pings == true) content = `<@${targetData.discordId.toString()}>`;
          break;
        case "Removal":
          embedTitle = `❌ ${LIBRARY_SETTINGS.factionName} Removal  ❌`;
          embedColor = '11600386';
          field1Name = 'General Information';
          info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nRemoved from: ${targetData.rank}`;
          footerMessage = `This may be appealed to ${appealTo}.`;
          if (LIBRARY_SETTINGS.pings == true) content = `<@${targetData.discordId.toString()}>`;
          break;
      }
      break;
    case 'Infraction Log':
      embedTitle = `❌ ${inputData.infraction_type} Infraction Issued ❌`;
      embedColor = '11600386';
      field1Name = 'Infraction Information';
      info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nRank: ${targetData.rank}`;
      footerMessage = `This may be appealed to ${appealTo}.`;
      if (LIBRARY_SETTINGS.pings == true) content = `<@${targetData.discordId.toString()}>`;
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
      info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nDiscordID: ${targetData.discordId}\nAppealed Infraction ID: ${inputData.log_id}`;
      footerMessage = 'This infraction is no longer of effect.';
      break;
    case 'Blacklist Appeal':
      embedTitle = `🔄 ${LIBRARY_SETTINGS.factionName} Blacklist/Suspension Appealed 🔄`;
      embedColor = '1143627';
      field1Name = 'Appeal Information';
      info = `Name: ${targetData.name}\nSteamID: ${targetData.steamId}\nDiscordID: ${targetData.discordId}\nAppealed Log ID: ${inputData.log_id}`;
      footerMessage = `This ${LIBRARY_SETTINGS.factionName} blacklist/suspension is no longer of effect.`;
      break;
  }

  // Compose discord embed
  let payload = JSON.stringify({
    username: `${LIBRARY_SETTINGS.factionName} Roster Manager`,
    content: content,
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
          value: reason,
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
    case "Staff":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("adminWebhookURL"));
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
  if (!isInit) throw new Error("Library is not yet initialized");

  let webhookURLs;
  switch(LIBRARY_SETTINGS.factionName) {
    case "Security":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("securityWebhook"));
      break;
    case "Staff":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("adminWebhookURL"));
      break;
    default:
      throw new Error(`${LIBRARY_SETTINGS.factionName} does not support discord messages yet`);
  }
  let user = Session.getActiveUser().getEmail();

  let payload = JSON.stringify({
    username: `${LIBRARY_SETTINGS.factionName} Roster Manager`,
    content: `<@&${LIBRARY_SETTINGS.leaderPing}>`,
    embeds: [{
      title: "Unauthed Access",
      color: "11600386",
      fields: [
        {
          name: `Accessed by ${user}`,
          value: "A permission check is being executed, please wait for that report to be sent below this message before taking any action.\nIf no report appears, contact a member of Staff Administration to investigate the issue.",
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

/**
 * Send an error report to Staff Administration
 * @param {String} error - the error message
 */
function sendDiscordError(error) {
  if (!isInit) throw new Error("Library is not yet initialized");

  let webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("adminWebhookURL"));
  let user = Session.getActiveUser().getEmail();

  let payload = JSON.stringify({
    username: `${LIBRARY_SETTINGS.factionName} Roster Manager`,
    embeds: [{
      title: "Error Report",
      color: "11600386",
      fields: [
        {
          name: `Produced by ${user}`,
          value: error,
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
}


/**
 * Send a report of possible faulty permissions
 * @param {Array} flagArray - Array with flagged users, returned by PermissionGuard()
 * @returns {Void}
 */
function sendDiscordPermissionReport(flagArray) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!Array.isArray(flagArray)) throw new Error("PermissionReport: no valid flag array provided");
  
  let webhookURLs;
  switch(LIBRARY_SETTINGS.factionName) {
    case "Security":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("securityWebhook"));
      webhookURLs.concat(JSON.parse(PropertiesService.getScriptProperties().getProperty("adminWebhookURL")));
      break;
    case "Staff":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("adminWebhookURL"));
    default:
      throw new Error(`${LIBRARY_SETTINGS.factionName} does not support discord messages yet`);
  }

  // Forge fields
  const fields = flagArray.map((flag) => ({
    name: `At ${flag.folderName}`,
    value: `User: ${flag.email}\nWrong Permission: ${flag.currentPermission}\nReason: ${flag.reason}`,
    inline: true,
  }));

  let payload = JSON.stringify({
    username: `${LIBRARY_SETTINGS.factionName} Roster Access Report`,
    content: `<@&${LIBRARY_SETTINGS.leaderPing}>`,
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

  webhookURLs.forEach(webhookURL => UrlFetchApp.fetch(webhookURL, params));
}

/**
 * Send config messages, current supported types:
 * manualEdit, backup, lockdown, restoreType, resetPerms, restoreSpreadSheet, rankEdit, folderEdit, cooldownChange
 * @param {String} type - The config option that was changed
 * @param {Boolean|String} value - The value that the config option currently has
 * @param {Object} userData
 * @param {Number} timeSinceBackup (optional) - Extract using the GetLastBackupTime function
 * @returns {Void}
 */
function sendDiscordConfig(type, value, userData, timeSinceBackup = 0) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!type || typeof type != 'string') throw new Error("DiscordConfig: no valid type provided");
  if (!userData || typeof userData != "object") throw new Error("DiscordConfig: no valid user data provided");
  if (typeof timeSinceBackup != 'number') throw new Error("DiscordConfig: no valid time since backup provided");

  let webhookURLs;
  switch(LIBRARY_SETTINGS.factionName) {
    case "Security":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("securityWebhook"));
      break;
    case "Staff":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("adminWebhookURL"));
    default:
      throw new Error(`${LIBRARY_SETTINGS.factionName} does not support discord messages yet`);
  }

  let userInfo = `Name: ${userData.name}\nSteamID: ${userData.steamId}\nDiscordID: ${userData.discordId}`;
  let embedTitle;
  let embedColor;
  let info;
  let footerMessage;

  switch (type) {
    case "manualEdit":
      embedTitle =
        value === true
          ? "[🛠️] 🟩 Manual Editing Protections Enabled 🟩"
          : "[🛠️] ⚠️ Manual Editing Protections Disabled ⚠️";
      embedColor = value === true ? "1143627" : "16497668";
      info = !(value === true)
        ? "The roster can now be edited manually, no reports will be sent of said manual edits."
        : "You can no longer manually edit the roster, reports of said manual edits will now be sent out again.";
      footerMessage =
        "Regardless if this setting is enabled or disabled, do not manually edit the roster without permission of Community Leadership.";
      break;
    case "backup":
      embedTitle =
        value === true
          ? `[🛠️] 🟩 ${LIBRARY_SETTINGS.factionName} Roster Backups Enabled 🟩`
          : `[🛠️] 🛑 ${LIBRARY_SETTINGS.factionName} Roster Backups Disabled 🛑`;
      embedColor = !(value === true) ? "11600386" : "1143627";
      info =
        value === true
          ? "Every 12 hours, a backup of the roster will be made as security measure."
          : "Time-Based backups of the roster have been temporarily paused.";
      footerMessage = "";
      break;
    case "lockdown":
      embedTitle =
        value === true
          ? `[🛠️] 🚨 ${LIBRARY_SETTINGS.factionName} Lockdown Activated 🚨`
          : `[🛠️] 🟩 ${LIBRARY_SETTINGS.factionName} Lockdown Deactivated 🟩`;
      embedColor = value === true ? "11600386" : "1143627";
      info =
        value === true
          ? `During the lockdown, only ${LIBRARY_SETTINGS.ranks[LIBRARY_SETTINGS.ranks.length - 2]} and ${LIBRARY_SETTINGS.ranks[LIBRARY_SETTINGS.ranks.length - 1]} will be allowed to access the ${LIBRARY_SETTINGS.factionName} Admin Menu. Please wait while they resolve the situation.`
          : `The ${LIBRARY_SETTINGS.factionName} Admin Menu can be used as normal again.`;
      footerMessage = "Thank you for your patience.";
      break;
    case "restoreType":
      embedTitle = value === true ? "[🛠️] 🟩 Restoration Type: Full Sheet 🟩" : "[🛠️] ⚠️ Restoration Type: Edited Cells ⚠️";
      embedColor = value === true ? "1143627" : "16497668";
      info = value === true 
        ? "Whenever the roster is manually edited (if manual editing protections are enabled), the entire sheet where a range was edited will be restored. This is the recommended option as it is more safe."
        : "Whenever the roster is manually edited (if manual editing protections are enabled), it will only restore the specific cells that were edited. This is not the recommended option as the function does not work when handling merged ranges. Only use this option temporarily.";
      footerMessage = "";
      break;
    case "resetPerms":
      embedTitle = `[🛠️] ⚠️ ${LIBRARY_SETTINGS.factionName} Document Permissions Reset ⚠️`;
      embedColor = "16497668";
      info = "All documentation permissions have been wiped & re-added, basically resetting them to get rid of any flaws quickly.";
      footerMessage = "If anything went wrong during this process, contact a member of Site Management";
      break;
    case "restoreSpreadSheet":
      embedTitle = `[🛠️] 🟩 ${LIBRARY_SETTINGS.factionName} Roster Restored 🟩`;
      embedColor = "1143627";
      info = `The roster has been fully restored to its latest backup, which was made ${timeSinceBackup} minutes ago.`;
      footerMessage = "";
      break;
    case "rankEdit":
      embedTitle = `[🛠️] 🟩 ${userData.editRank} Edited 🟩`;
      embedColor = "1143627";

      userData.viewerAccess = userData.viewerAccess.map(id => {
        const f = DriveApp.getFolderById(id);
        return `"${f.getName()}" `;
      });
      userData.editorAccess = userData.editorAccess.map(id => {
        const f = DriveApp.getFolderById(id);
        return `"${f.getName()}" `;
      });

      info = `Title: ${userData.title}\nHierarchy Position: before ${userData.rankBefore}\nViewer Access to: ${userData.viewerAccess}\nEditor Access to: ${userData.editorAccess}`;
      footerMessage = "Not all change info listen above is necessarily new";
      break;
    case "folderEdit":
      embedTitle = value === true ? `[🛠️] 🟩 ${userData.title} Added to Folder List 🟩` : `[🛠️] ⚠️ ${userData.title} Removed from Folder List ⚠️`;
      embedColor = value === true ? "1143627" : "16497668";
      info = value === true ? `${userData.title} is now recognized by the Admin Menu and its functions. It can be added to ranks in the config menu.` : `${userData.title} is no longer recognized by the Admin Menu and its functions. No operations (such as permission checks) will go through this folder.`;
      footerMessage = "";
      break;
    case "cooldownChange":
      embedTitle = value === true ? `[🛠️] LOA Cooldown Changed to ${userData.days} Days` : `[🛠️] LOA Cooldown Changed to ${userData.days} Days`;
      embedColor = "1143627";
      info = value === true ? `Everybody will now have to wait a minimum of ${userData.days} days between LOAs.` : `Everybody will now have to wait a minimum of ${userData.days} days between promotions.`;
      footerMessage = "";
      break;
    default:
      throw new Error("This type is not supported");
  }

  // Compose discord embed
  let payload = JSON.stringify({
    username: `${LIBRARY_SETTINGS.factionName} Roster Manager`,
    embeds: [
      {
        title: embedTitle,
        color: embedColor,
        fields: [
          {
            name: "Change Info",
            value: info,
            inline: false,
          },
          {
            name: "Edited by",
            value: userInfo,
            inline: false,
          },
        ],
        footer: {
          text:
            footerMessage +
            "\nLogged on " +
            Utilities.formatDate(new Date(), "GMT", "dd MMMM yyyy"),
        }
      }
    ]
  });

  var params = {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    payload: payload,
    muteHttpExceptions: true,
  };

  webhookURLs.forEach(webhookURL => UrlFetchApp.fetch(webhookURL, params));
}

/**
 * Send config message that a rank slot was added/removed
 * @param {String} rank - Name of the rank that a slot was added/removed to/from
 * @param {Boolean} added - True = added, false = removed
 * @param {Object} userData
 * @param {Number} num - Amount of slots
 * @returns {Void}
 */
function sendDiscordConfigRankRow(rank, added, userData, num = 1) {

  // Compose discord embed
  let payload = JSON.stringify({
    username: `${LIBRARY_SETTINGS.factionName} Roster Manager`,
    embeds: [
      {
        title: `[🛠️] ${num} ${rank} Slot${num > 1 ? "s" : ""} ${added ? "Added" : "Removed"}`,
        color: `${added ? "1143627" : "11600386"}`,
        fields: [
          {
            name: "Configured by",
            value: `Name: ${userData.name}\nSteamID: ${userData.steamId}\nDiscord ID: ${userData.discordId}`,
            inline: false,
          },
        ],
        footer: {
          text:
            "Logged on " +
            Utilities.formatDate(new Date(), "GMT", "dd MMMM yyyy"),
        },
      },
    ],
  });

  var params = {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    payload: payload,
    muteHttpExceptions: true,
  };

  let webhookURLs;
  switch(LIBRARY_SETTINGS.factionName) {
    case "Security":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("securityWebhook"));
      break;
    case "Staff":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("adminWebhookURL"));
    default:
      throw new Error(`${LIBRARY_SETTINGS.factionName} does not support discord messages yet`);
  }

  webhookURLs.forEach(webhookURL => UrlFetchApp.fetch(webhookURL, params));
}

/**
 * Send config message that a rank slot was added/removed
 * @param {String} rank - Name of the rank that a slot was added/removed to/from
 * @param {Boolean} added - True = added, false = removed
 * @returns {Void}
 */
function sendDiscordNewRank(rank, added = true) {

  // Compose discord embed
  let payload = JSON.stringify({
    username: `${LIBRARY_SETTINGS.factionName} Roster Manager`,
    embeds: [
      {
        title: `[🛠️] ${rank} Rank ${added ? "Added" : "Removed"}`,
        color: `${added ? "1143627" : "11600386"}`,
        fields: [
          {
            name: `The rank of ${rank} has been ${added ? "added to" : "removed from"} the ${LIBRARY_SETTINGS.factionName} roster.`,
            value: ``,
            inline: false,
          },
        ],
        footer: {
          text:
            "Logged on " +
            Utilities.formatDate(new Date(), "GMT", "dd MMMM yyyy"),
        },
      },
    ],
  });

  var params = {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    payload: payload,
    muteHttpExceptions: true,
  };

  let webhookURLs;
  switch(LIBRARY_SETTINGS.factionName) {
    case "Security":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("securityWebhook"));
      break;
    case "Staff":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("adminWebhookURL"));
    default:
      throw new Error(`${LIBRARY_SETTINGS.factionName} does not support discord messages yet`);
  }

  webhookURLs.forEach(webhookURL => UrlFetchApp.fetch(webhookURL, params));
}

/**
 * Send a discord message when a new changelog is submitted
 * @param {Object} notes - information about the changelog
 * @returns {Void}
 */
function sendDiscordChangeLog(notes, url = '') {
  notes = notes.map(note => `- ${note}`).join('\n');

   let payload = JSON.stringify({
    username: `${LIBRARY_SETTINGS.factionName} Roster Manager`,
    content: `<@&${LIBRARY_SETTINGS.leaderPing}>`,
    embeds: [
      {
        title: `⚙️ Admin Menu Update ⚙️`,
        color: '1143627',
        fields: [
          {
            name: "Change Notes",
            value: `${notes}\n${url}`,
            inline: false,
          },
        ],
        footer: {
          text:
            "Logged on " +
            Utilities.formatDate(new Date(), "GMT", "dd MMMM yyyy"),
        },
      },
    ],
  });

  var params = {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    payload: payload,
    muteHttpExceptions: true,
  };

  let webhookURLs;
  switch(LIBRARY_SETTINGS.factionName) {
    case "Security":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("securityWebhook"));
      break;
    case "Staff":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("adminWebhookURL"));
    default:
      throw new Error(`${LIBRARY_SETTINGS.factionName} does not support discord messages yet`);
  }

  webhookURLs.forEach(webhookURL => UrlFetchApp.fetch(webhookURL, params));
}

function sendDiscordManualEdit(range) {

  // Compose discord embed
  let payload = JSON.stringify({
    username: `${LIBRARY_SETTINGS.factionName} Roster Manager`,
    embeds: [
      {
        title: "Unauthorized Editing",
        color: "11600386",
        fields: [
          {
            name: "Range Edited",
            value: range,
            inline: false,
          },
        ],
        footer: {
          text:
            `An Unknown and unauthorized user has manually edited the ${LIBRARY_SETTINGS.factionName} Roster. \nPlease investigate this possible permission breach to prevent further harm.\nLogged on ${Utilities.formatDate(new Date(), "GMT", "dd MMMM yyyy")}`,
        },
      },
    ],
  });

  var params = {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    payload: payload,
    muteHttpExceptions: true,
  };

  let webhookURLs;
  switch(LIBRARY_SETTINGS.factionName) {
    case "Security":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("securityWebhook"));
      break;
    case "Staff":
      webhookURLs = JSON.parse(PropertiesService.getScriptProperties().getProperty("adminWebhookURL"));
    default:
      throw new Error(`${LIBRARY_SETTINGS.factionName} does not support discord messages yet`);
  }

  webhookURLs.forEach(webhookURL => UrlFetchApp.fetch(webhookURL, params));
}