function GenInterviewUI() {
  try {
    DriveApp.getFolderById("17ARu5vNWpQ8Td3yPxGiDRxNWYfYO37ZB");
    const interviewFile = RosterService.getHtmlInterview();
    return SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(interviewFile).setWidth(600).setHeight(800), "Generate Interview Doc [BETA]");
  } catch(e) {
    return SpreadsheetApp.getUi().alert("Only Security Chiefs+ are allowed to perform this action.");
  }
}

function GenerateInterview(email, name) {
  let docNum = PropertiesService.getDocumentProperties().getProperty("docNum");
  docNum = Number(docNum) ? Number(docNum) + 1 : 1;
  PropertiesService.getDocumentProperties().setProperty("docNum", docNum);

  const destination = DriveApp.getFolderById("17ARu5vNWpQ8Td3yPxGiDRxNWYfYO37ZB");
  const template = DriveApp.getFileById("1tS2ae6_tnfBCfLaaNTnQQD7qBb7uz9uahvEZjlkZkAQ");
  let userData = RosterService.getUserData(email);

  if (!userData.name || !userData.rank) {
    userData.name = "";
    userData.rank = "External Staff";
  }

  const copy = template.makeCopy(`[BS] Captain Interview "${name}"`, destination);
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();

  doc.getHeader().replaceText("{{DocNum}}", `#0${docNum}`);
  body.replaceText("{{DocNum}}", `#0${docNum}`);
  body.replaceText("{{ApplicantName}}", name);
  body.replaceText("{{InterviewerName}}", `${userData.rank} ${userData.name}`);
  body.replaceText("{{Date}}", Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss"));

  const q = JSON.parse(PropertiesService.getDocumentProperties().getProperty("q"));

  let selectedQuestions = [];
  while (selectedQuestions.length < 10) {
    let index = Math.floor(Math.random() * q.length);
    let question = q[index];
    if (!selectedQuestions.includes(question)) {
      selectedQuestions.push(question);
    }
  }

  for (let i = 0; i < selectedQuestions.length; i++) {
    body.replaceText(`{{QuestionTitle${i + 1}}}`, selectedQuestions[i].title);
    body.replaceText(`{{QuestionDesc${i + 1}}}`, selectedQuestions[i].desc);
  }

  doc.saveAndClose();
  return copy.getUrl();
}

// function CloseDoc() {
//   const destination = DriveApp.getFolderById("1Nr4xPCEfMMtynlzJqenrjt7itkCSBfYq");
//   const doc = DriveApp.getFileById(DocumentApp.getActiveDocument().getId())
//   DocumentApp.getActiveDocument().setName(`[COMPLETED]${DocumentApp.getActiveDocument().getName()}`);
//   doc.moveTo(destination);
//   doc.setOwner("dontorro208@gmail.com");
//   doc.removeEditors(doc.getEditors());
// }