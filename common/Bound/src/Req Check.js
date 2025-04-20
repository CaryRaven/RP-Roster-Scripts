/*
  Timed trigger that checks if a rank has any promotion requirements, if this isn't the case it will replace the formula with "N/A"
  This to make the roster cleaner and more descriptive. 

  This does mean that there will be a delay between when you re-add promo reqs to a rank and when the roster will be updated, but it shouldn't be too bad.
*/
function CheckReqs() {
  // Get ranks from roster
  const roster = RosterService.getCollect(2063800821);
  const rows = roster.getMaxRows();
  let ranks = [];

  for (let k = 5; k <= rows; k++) {
    let rankName = roster.getRange(k, LIBRARY_SETTINGS.dataCols.rank).getDisplayValue();
    if (rankName !== "" && !ranks.includes(rankName)) {
      ranks.push(rankName)
    }
  }

  // Loop through ranks from roster
  ranks.forEach(rank => {
    let sheet = RosterService.getCollect(LIBRARY_SETTINGS.sheetId_reqs);
    let hasReqs = false;
    const reqTitleRow = RosterService.getFirstRankRow(rank, LIBRARY_SETTINGS.rosterIds.length - 1)[0] - 1;

    // Check if rank exist on req roster
    if (reqTitleRow > 6) hasReqs = true;

    sheet = RosterService.getCollect(LIBRARY_SETTINGS.rosterIds[0]);
    const firstRankRow = RosterService.getFirstRankRow(rank, 0)[0];
    // Check if rank needs changing (optimization)
    try { if (sheet.getRange(firstRankRow, 17).getDataValidation() && hasReqs) return } catch(e) { }
    try { if (!sheet.getRange(firstRankRow, 17).getDataValidation() && !hasReqs) return } catch(e) { }

    // Loop through rank slots on roster
    for (let j = 6; j <= sheet.getMaxRows(); j++) {
      if (sheet.getRange(j, LIBRARY_SETTINGS.dataCols.rank).getValue() === rank) {
        const cell = sheet.getRange(j, 17);

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