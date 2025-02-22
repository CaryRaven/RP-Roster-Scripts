// doGet function is run everytime the web app gets opened / refreshed. Native Google function, cannot be used only declared

function doGet() {
    const user = Session.getActiveUser().getEmail();
    const userData = GetUserData(user);
    PropertiesService.getUserProperties().setProperty("userData", JSON.stringify(userData));
    const allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));
    const ranks = JSON.parse(PropertiesService.getScriptProperties().getProperty("ranks"));
    const lockdown = PropertiesService.getScriptProperties().getProperty("lockdownEnabled");
    let template;

    if (lockdown === "true") {
      template = HtmlService.createTemplateFromFile("Interfaces/Unauthed Access");
      template.type = "lockdown";
      return template.evaluate();
    }

    if (allowedStaff.includes(user) || ranks[0].includes(userData.rank)) {
        template = HtmlService.createTemplateFromFile("Interfaces/Admin Menu");
        template.user = user;
        template.data = userData;
        template.ranks = ranks;
        template.allowedStaff = allowedStaff;
        return template.evaluate();
    } else {
        template = HtmlService.createTemplateFromFile("Interfaces/Unauthed Access");
        template.type = "unauthed";
        return template.evaluate(); 
    }
}

function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}