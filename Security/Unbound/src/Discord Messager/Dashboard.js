// Discord alerts are functions that compose & send discord messages through a webhook

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