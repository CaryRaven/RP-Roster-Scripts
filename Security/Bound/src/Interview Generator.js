function GenInterviewUI() {
  try {
    DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_interviews);
    const interviewFile = RosterService.getHtmlInterview();
    return SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(interviewFile).setWidth(700).setHeight(900), "Generate Interview Doc");
  } catch(e) {
    return SpreadsheetApp.getUi().alert("Only Security Chiefs+ are allowed to perform this action.");
  }
}

function GenerateInterview(email, name, rank) {
  if (!email || !name || !rank) return "Please fill out all questions";
  const rankRow = RosterService.getStartRankRow(rank);
  console.log(rankRow);
  if (!rankRow) return "Invalid Rank";

  let docNum = PropertiesService.getDocumentProperties().getProperty("docNum");
  docNum = Number(docNum) ? Number(docNum) + 1 : 1;
  PropertiesService.getDocumentProperties().setProperty("docNum", docNum);

  const destination = DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_interviews);
  const template = DriveApp.getFileById("1tS2ae6_tnfBCfLaaNTnQQD7qBb7uz9uahvEZjlkZkAQ");
  let userData = RosterService.getUserData(email);

  if (!userData.name || !userData.rank) {
    userData.name = "";
    userData.rank = "External Staff";
  }

  const copy = template.makeCopy(`[BS] ${rank} Interview "${name}"`, destination);
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();
  const header = doc.getHeader();

  header.replaceText("{{DocNum}}", `#0${docNum}`);
  header.replaceText("{{Rank}}", rank);
  body.replaceText("{{DocNum}}", `#0${docNum}`);
  body.replaceText("{{ApplicantName}}", name);
  body.replaceText("{{InterviewerName}}", `${userData.rank} ${userData.name}`);
  body.replaceText("{{Date}}", Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss"));
  body.replaceText("{{Rank}}", rank);

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