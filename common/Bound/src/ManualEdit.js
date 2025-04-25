const LIBRARY_SETTINGS = JSON.parse(PropertiesService.getDocumentProperties().getProperty("settings"));
RosterService.init(LIBRARY_SETTINGS);

function ManualEdit(e) {
  if (!e) throw new Error("Do not run this function from the editor");
  const sheet = e.source.getActiveSheet();
  const sheetID = sheet.getSheetId();
  const range = e.range;
  const col = range.getColumn();
  const row = range.getRow();

  if (sheetID === LIBRARY_SETTINGS.sheetId_task || sheetID === 171954164 || sheetID === 746891100) return;

  if (sheetID === 789793193 && col === 3 && row === 3) return;
  
  const s = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);
  const manualEnabled = s.getRange(10, 1).getValue();
  console.log(manualEnabled);
  if (manualEnabled == false) return;

  const backupSpreadsheet = SpreadsheetApp.openById(LIBRARY_SETTINGS.spreadsheetId_backup);
  const backupSheet = backupSpreadsheet.getSheetById(sheetID);

  if (!backupSheet) return;

  RosterService.restoreSheet();
  RosterService.sendDiscordManualEdit(sheet.getName());
}