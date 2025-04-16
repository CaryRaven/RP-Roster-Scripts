/*
  Timed trigger that checks if a rank has any promotion requirements, if this isn't the case it will replace the formula with "N/A"
  This to make the roster cleaner and more descriptive. 

  This does mean that there will be a delay between when you re-add promo reqs to a rank and when the roster will be updated, but it shouldn't be too bad.
*/
function CheckReqs() {
  // Loop through ranks
  LIBRARY_SETTINGS.ranks.forEach(rank => {
    let sheet = RosterService.getCollect(LIBRARY_SETTINGS.sheetId_reqs);
    let hasReqs = false;
    const reqTitleRow = RosterService.getFirstRankRow(rank, LIBRARY_SETTINGS.rosterIds.length - 1)[0] - 1;

    // Check if rank exist on req roster
    if (reqTitleRow > 0) {
      for (let i = 8; i < sheet.getMaxColumns(); i++) {
        if (sheet.getRange(i, LIBRARY_SETTINGS.dataCols.rank).getValue() === rank) hasReqs = true;
      }
    }

    sheet = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);
    const firstRankRow = RosterService.getFirstRankRow(rank, 0)[0];
    // Check if rank needs changing (optimization)
    try { if (sheet.getRange(firstRankRow, 16).getDataValidation() && hasReqs) return } catch(e) { }
    try { if (!sheet.getRange(firstRankRow, 16).getDataValidation() && !hasReqs) return } catch(e) { }

    // Loop through rank slots on roster
    for (let j = 6; j <= sheet.getMaxRows(); j++) {
      if (sheet.getRange(j, LIBRARY_SETTINGS.dataCols.rank).getValue() === rank) {
        const cell = sheet.getRange(j, 16);

        // Insert data (formula or N/A)
        if (hasReqs) {
          const rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
          cell.setDataValidation(rule);
          cell.setFormula(`= REQS_CHECK(F${j}, 'Promotion Progress'!F:F, 'Promotion Progress'!H:L)`);
        } else {
          cell.clearDataValidations();
          cell.setValue("N/A");
        }
      }
    }
  });
}