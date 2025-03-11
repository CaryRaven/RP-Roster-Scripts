const LIBRARY_SETTINGS = JSON.parse(PropertiesService.getDocumentProperties().getProperty("settings"));
RosterService.init(LIBRARY_SETTINGS);

function ManualEdit(e) {
  const sheet = e.source.getActiveSheet();
  const sheetID = sheet.getSheetId();
  if (sheetID === 1504741049) return;
  
  const s = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);
  const manualEnabled = s.getRange(10, 1).getValue();
  if (manualEnabled.toLowerCase() == "false") return;

  // let range = e.range;
  const backupSpreadsheet = SpreadsheetApp.openById(LIBRARY_SETTINGS.backupsbeetId);
  const backupSheet = backupSpreadsheet.getSheetById(sheetID);

  if (!backupSheet) return;

  RosterService.restoreSheet();

  // if (restoreType === "true") {

  //   RosterService.restoreSheet();

  // } else {
    
  //   const mergedRanges = sheet.getRange(range.getA1Notation()).getMergedRanges();
  //   if (mergedRanges.length > 0) {
  //     range = mergedRanges[0];
  //   }

  //   const backupRange = backupSheet.getRange(range.getA1Notation());
  //   const formulas = backupRange.getFormulas();
  //   const values = backupRange.getValues();

  //   const finalData = formulas.map((row, rowIndex) =>
  //     row.map((cell, colIndex) => (cell ? cell : values[rowIndex][colIndex]))
  //   );

  //   range.setValues(finalData);
  // }
  
  RosterService.sendDiscordManualEdit(sheet.getName());
}