/*
  Timed trigger that checks if a rank has any promotion requirements, if this isn't the case it will replace the formula with "N/A"
  This to make the roster cleaner and more descriptive. 

  This does mean that there will be a delay between when you re-add promo reqs to a rank and when the roster will be updated, but it shouldn't be too bad.
*/
function CheckReqs() {
  // Get ranks from roster
  const roster = RosterService.getCollect(2063800821);
  const rows = roster.getMaxRows();
  const props = PropertiesService.getDocumentProperties();
  const reqColHidden = props.getProperty("reqColHidden")
  let ranks = [];

  for (let k = 5; k <= rows; k++) {
    let rankName = roster.getRange(k, LIBRARY_SETTINGS.dataCols.rank).getDisplayValue();
    if (rankName !== "" && !ranks.includes(rankName)) {
      ranks.push(rankName)
    }
  }

  // Loop through ranks on roster
  ranks.forEach(rank => {
    let sheet = RosterService.getCollect(LIBRARY_SETTINGS.sheetId_reqs);
    let hasReqs = false;
    const reqTitleRow = RosterService.getFirstRankRow(rank, LIBRARY_SETTINGS.rosterIds.length - 1)[0] - 1;

    // Check if rank exist on req roster
    if (reqTitleRow > 6) hasReqs = true;

    sheet = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);
    const startRankRow = RosterService.getStartRankRow(rank);
    const lastRankRow = RosterService.getLastRankRow(rank);
    const rowcount = lastRankRow - startRankRow + 1;

    SpreadsheetApp.getActiveSheet().isSheetHidden()
    
    if (RosterService.getCollect(LIBRARY_SETTINGS.sheetId_reqlogs).isSheetHidden() && reqColHidden === "false") {
      // Column hidden but registered as visible? => change border style & mark hidden so it doesn't edit the style every execution
      sheet.getRange(startRankRow, 16, rowcount, 1).setBorder(null, null, null, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      sheet.hideColumn(sheet.getRange(1, LIBRARY_SETTINGS.dataCols.blacklistEnd - 1));
      props.setProperty("reqColHidden", true);

    } else if (!RosterService.getCollect(LIBRARY_SETTINGS.sheetId_reqlogs).isSheetHidden() && reqColHidden === "true") {
      sheet.getRange(startRankRow, 16, rowcount, 1).setBorder(null, null, null, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID);

      // Set styling of inner borders for reqsCompleted row in case of new rows that were added (styling hasn't been set)
      sheet.getRange(startRankRow, 17, rowcount, 1).setBorder(null, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);

      sheet.unhideColumn(sheet.getRange(1, LIBRARY_SETTINGS.dataCols.blacklistEnd - 1));
      props.setProperty("reqColHidden", false);
    }

    // Check if rank needs changing (optimization)
    try { if (sheet.getRange(lastRankRow, 17).getDataValidation() && hasReqs) return } catch(e) { }
    try { if (!sheet.getRange(lastRankRow, 17).getDataValidation() && !hasReqs) return } catch(e) { }

    let data = [[]];
    if (hasReqs && !sheet.getRange(lastRankRow, 17).getDataValidation()) {
      // If has reqs but no checkbox yet => add formula & checkbox
      for (let i = startRankRow; i <= lastRankRow; i++) {
        data[0].push(`= REQS_CHECK(F${i}, 'Promotion Progress'!F:F, 'Promotion Progress'!H:L)`);
      }

      sheet.getRange(startRankRow, 17, rowcount, 1)
        .setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build())
        .setFormulas(data);
    } else if (!hasReqs && sheet.getRange(lastRankRow, 17).getDataValidation()) {
      for (let i = startRankRow; i <= lastRankRow; i++) {
        data[0].push("N/A");
      }

      sheet.getRange(startRankRow, 17, rowcount, 1)
        .clearDataValidations()
        .setValues(data);
    }
  });
}