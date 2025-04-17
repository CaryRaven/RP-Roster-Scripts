/**
 * @param {String} type - New, Delete, Status, Unassigned, Assigned, Postpone
 * @param {Object} inputData - Data object contains values inputted by the user
 * @param {Object} targetData - Object containing data about the target of the log
 */
function task_sendDiscordMessage(type, inputData, targetData = {}) {
  // Variable init
  let embedTitle = '';
  let embedColor = '';
  let field1Name = '';
  let info = '';
  let footerMessage = '';
  let date = Utilities.formatDate(new Date(), 'GMT', 'dd MMMM yyyy');
  let content = '';

  // Set case-specific data to create speclialized discord notifs
  switch (type) {
    case "New":
      embedTitle = `🎯 New Task: "${inputData.title}" 🎯`;
      embedColor = "1143627";
      field1Name = 'Task Information';
      info = `${inputData.description}\n\n${inputData.priority}\n\nThis task must be completed by ${ReturnDeadline(inputData.deadline)}`;
      footerMessage = "";
      break;
    case 'Delete':
      embedTitle = `🗑️ Task "${inputData.title}" Deleted 🗑️`;
      embedColor = '11600386';
      field1Name = '';
      info = ``;
      footerMessage = 'This action cannot be undone.';
      break;
    case 'Status':
      embedTitle = `${inputData.status === "Backlog" ? `👷 "${inputData.title}" In Progress 👷` : `🏁 "${inputData.title}" Completed 🏁`}`;
      embedColor = `${inputData.status === "Backlog" ? '16758272' : '1143627'}`;
      field1Name = `Task Information`;
      info = `Due date was ${ReturnDeadline(inputData.deadline)}`;
      footerMessage = '';
      break;
    case 'Assigned':
      embedTitle = `🛠️ ${targetData.name} assigned to "${inputData.title}" 🛠️`;
      embedColor = '1143627';
      field1Name = 'Task Information';
      info = `${inputData.description}\n\nThis task must be completed by ${ReturnDeadline(inputData.deadline)}`;
      footerMessage = "Make sure you complete the task in time, as you will receive an infraction if you don't.";
      content = `<@${targetData.discordId}>`;
      break;
    case 'Unassigned':
      embedTitle = `🛠️ ${targetData.name} unassigned from "${inputData.title}" 🛠️`;
      embedColor = '16758272';
      field1Name = 'Task Information';
      info = `${inputData.description}\n\nThis task must be completed by ${ReturnDeadline(inputData.deadline)}`;
      footerMessage = "This person is no longer assigned to this task, they won't be held accountable for it.";
      content = `<@${targetData.discordId}>`;
      break;
    case 'Postpone':
      embedTitle = `⌛ "${inputData.title}" Postponed ⌛`;
      embedColor = '16758272';
      field1Name = 'Task Information';
      info = `${inputData.description}\n\nThis task must now be completed by ${ReturnDeadline(inputData.deadline)}`;
      footerMessage = "Make sure you complete the task in time, as you will receive an infraction if you don't.";
      break;
    case "Priority":
      embedTitle = `⚠️ "${inputData.title}" ⚠️`;
      embedColor = '16758272';
      field1Name = `Task Priority changed to ${inputData.priority}`;
      break;
    default:
      throw new Error("SendDiscordMessage: No matching type found");
  }

  // Compose discord embed
  let payload = JSON.stringify({
    username: `${LIBRARY_SETTINGS.factionName} Task Manager`,
    content: content,
    embeds: [{
      title: embedTitle,
      color: embedColor,
      fields: [
        {
          name: field1Name,
          value: info,
          inline: true
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

  const authKey = PropertiesService.getScriptProperties().getProperty("authKey");
  const webhookURLs = getDiscordWebhookUrls(authKey);

  webhookURLs.forEach(webhookURL => UrlFetchApp.fetch(webhookURL, params));

  Logger.log('Discord Notification Sent Successfully.');
}

function ReturnDeadline(dateValue) {
  // Timezone stuff
  const adjustedDate = new Date(dateValue.getTime() - (dateValue.getTimezoneOffset() * 60000));
  return Utilities.formatDate(adjustedDate, "GMT", 'dd MMMM yyyy');
}