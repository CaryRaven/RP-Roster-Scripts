// Utility functions are used all over the script

/**
 * Return the sheet object based on sheet ID
 * @param {Number} sheet_id 
 * @returns {Object}
 */
function getCollect(sheet_id, spreadsheet_id = "1H_7iso49sh1IfVQGEuUGAymPcAuoUdSygX7_sOM1wWw") {
    const wb = SpreadsheetApp.openById(spreadsheet_id);
    return wb.getSheets().find(sheet => sheet.getSheetId() === sheet_id);
}

/**
 * Extract all user's data located on rosters using a query (has to be a gmail address)
 * Only gets data from last roster, multiple positions not possible
 * @param {String} query - Gmail address of the targeted staff member
 * @returns {Object}
 * @example
 * // Gets user data
 * const userData = GetUserData("example@gmail.com", true);
 * Logger.log(userData.name) // gets name
 * Logger.log(userData.steamId) // gets steamID
 * Logger.log(userData.discordId) // gets discordID
 * // etc...
 */
function GetUserData(query, stringify = false) {
    let data = {};
  
    const s = getCollect(675133232);
    const r = s.getRange(8, 8, s.getMaxRows(), 1).getValues();

    r.forEach((email, i) => {

        email = email[0];
        i = i + 8;
        if (email == query) {
            data = {
                row: i,
                name: s.getRange(i, 5).getValue(),
                steamId: s.getRange(i, 6).getValue(),
                discordId: s.getRange(i, 7).getValue(),
                gmail: s.getRange(i, 8).getValue(),
                rank: s.getRange(i, 4).getValue(),
                infractions: s.getRange(i, 10).getValue(),
                status: s.getRange(i, 12).getDisplayValue(),
                lastPromo: s.getRange(i, 13).getValue(),
                loaEnd: s.getRange(i, 14).getValue(),
                liaisonName: s.getRange(i, 16).getValue(),
                liaisonSteamId: s.getRange(i, 17).getValue(),
                notes: s.getRange(i, 19).getValue()
            };
        }

    });
    
    if (stringify) { return JSON.stringify(data); } else { return data; }
}

function GetLastRow(sheet) {
    for (let r = 6; r <= 1003; r++) {
        if (sheet.getRange(r, 3).getValue() === '') {
          return r;
        }
      }
      return 7;
}

function GetRankType(rank) {
    if (rank.includes("MTF")) {
        return 2;
      } else if (rank.includes("Director") || rank.includes("Chief")) {
        return 1;
      } else if (rank.includes("Site")) {
        return 0;
      } else throw new Error();
}

/**
 * @param {String} rank - Name of the rank to search for
 * @returns {Array}
 * @example
 * const rowDestination = GetFirstRankRow("Site Manager");
 * const name = rowDestination[1].getRange(rowDestination[0], 5).getValue();
 */
function GetFirstRankRow(rank) {
    if (!rank) return;
    let roster = getCollect(675133232);
    let match_row = 0;
    const total_rows = roster.getMaxRows();
    const rank_rows = [];

    for (let i = 1; i <= total_rows; i++) {

        // Check if col D = rank & steamID isn't empty
        if (roster.getRange(i, 4).getValue() === rank && roster.getRange(i, 8).getValue() === '') {
            rank_rows.push(i);
        }
    }

    match_row = rank_rows.length > 0 ? rank_rows[0] : 0;
    return [match_row, roster];
}

/**
 * Move a member around from searchSlot to openSlot on their roster
 * @param {Object} roster - Roster object (use getCollect() to extract this object using sheet ID)
 * @param {Number} searchSlot - Row where the target is located before moving them
 * @param {Number} openSlot - Row where you want to move the target to
 */
function MoveMember(roster, searchSlot, openSlot) {
    const cols = [5, 6, 7, 8, 18];
    const moveData = cols.map(col => roster.getRange(searchSlot, col).getValue());

    cols.forEach(col => roster.getRange(searchSlot, col).setValue(''));
    cols.forEach((col, i) => {
        if (col <= 8) {
        roster.getRange(openSlot, col).setValue(moveData[i]);
        }
    });
}

/**
 * @param {String} rank - Name of rank to get the last row of
 */
function GetLastRankRow(roster, rank) {
    if (!rank) return;
    const total_rows = roster.getMaxRows();
    
    for (let i = 2; i <= total_rows; i++) {
      if (roster.getRange(i - 1, 4).getValue() == rank && roster.getRange(i, 4).getValue() != rank) return i - 1;
    }
  }