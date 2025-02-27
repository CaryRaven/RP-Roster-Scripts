/**
 * @param {String} type - The config option that was changed (supported: manualEdit, backup, lockdown)
 * @param {Boolean|String} value - The value that the config option currently has
 * @returns {Void}
 */
function SendDiscordConfig(type, value) {
  let userData = JSON.parse(
    PropertiesService.getUserProperties().getProperty("userData")
  );
  userData = `Name: ${userData.name}\nSteamID: ${userData.steamId}\nDiscordID: ${userData.discordId}`;
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
          ? "[🛠️] 🟩 Roster Backups Enabled 🟩"
          : "[🛠️] 🛑 Roster Backups Disabled 🛑";
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
          ? "[🛠️] 🚨 Lockdown Activated 🚨"
          : "[🛠️] 🟩 Lockdown Deactivated 🟩";
      embedColor = value === true ? "11600386" : "1143627";
      info =
        value === true
          ? "During the lockdown, only Lead Admins & Community Leadership will be able to access the Admin Menu. Please wait while they resolve the situation."
          : "The Admin Menu can be used as normal again.";
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
      embedTitle = "[🛠️] ⚠️ Document Permissions Reset ⚠️";
      embedColor = "16497668";
      info = "All documentation permissions have been wiped & re-added, basically resetting them to get rid of any flaws quickly.";
      footerMessage = "If anything went wrong during this process, contact a member of Community Leadership";
      break;
    case "restoreSpreadSheet":
      embedTitle = "[🛠️] 🟩 Roster Restored 🟩";
      embedColor = "1143627";
      const timeSinceBackup = GetLastBackupTime();
      info = `The roster has been fully restored to its latest backup, which was made ${timeSinceBackup} minutes ago.`;
      footerMessage = "";
      break;
  }

  let webhookURL = PropertiesService.getScriptProperties().getProperty("WebhookURL");

  // Compose discord embed
  let payload = JSON.stringify({
    username: "Security Roster Manager",
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
            value: userData,
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

  // Send message
  UrlFetchApp.fetch(webhookURL, params);
  Logger.log("Discord Notification Sent Successfully.");
}

/**
 * Send config message that a rank slot was added/removed
 * @param {String} rank - Name of the rank that a slot was added/removed to/from
 * @param {Boolean} added - True = added, false = removed
 * @param {Number} branch - Branch of the targeted rank
 * @returns {Void}
 */
function SendDiscordConfigRankRow(rank, added) {
  let webhookURL = PropertiesService.getScriptProperties().getProperty("WebhookURL");
  let userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));

  // Compose discord embed
  let payload = JSON.stringify({
    username: "Security Roster Manager",
    embeds: [
      {
        title: `[🛠️] ${rank} Slot ${added ? "Added" : "Removed"}`,
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

  // Send message
  UrlFetchApp.fetch(webhookURL, params);
  Logger.log("Discord Notification Sent Successfully.");
}