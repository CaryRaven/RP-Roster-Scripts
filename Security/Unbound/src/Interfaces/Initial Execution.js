/**
 * Function that runs when web app is opened / refreshed. Default google function thus it cannot be used in your project, only defined/declared once
 */
function doGet() {
  const user = Session.getActiveUser().getEmail();
  let userData = GetUserData(user);
  const allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));

  if (allowedStaff.includes(user)) {
    userData.name = "N/A";
    userData.steamId = "N/A";
    userData.discordId = "N/A";
    userData.rank = "Blackshadow Staff";
  }
  PropertiesService.getUserProperties().setProperty("userData", JSON.stringify(userData));

  const ranks = JSON.parse(PropertiesService.getScriptProperties().getProperty("ranks"));
  const lockdown = PropertiesService.getScriptProperties().getProperty("lockdownEnabled");

  if (lockdown === "true") {
    if (!ranks[2].includes(userData.rank) && !ranks[3].includes(userData.rank) && !allowedStaff.includes(user)) {
      const lockdownPage = HtmlService.createTemplateFromFile("Interfaces/Unauthed Access");
      lockdownPage.type = "lockdown";
      return lockdownPage.evaluate();
    }
  }

  if ((allowedStaff.includes(user) || ranks[2].includes(userData.rank) || ranks[3].includes(userData.rank)) && userData.status != "Suspended") {
    const template = HtmlService.createTemplateFromFile("Interfaces/Admin Menu");
    template.user = user;
    template.data = userData;
    template.ranks = ranks;
    template.allowedStaff = allowedStaff;
    if (!template) return;
    return template.evaluate();
  } else {
    // SendDiscordUnauthed();
    const unauthedPage = HtmlService.createTemplateFromFile("Interfaces/Unauthed Access");
    unauthedPage.type = "unauthed";
    SendDiscordUnauthed();
    return unauthedPage.evaluate();
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}