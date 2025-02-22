/**
 * @param {Number} sheet_id - ID of the sheet found at the end of the URL
*/
// Reliably collect the sheet name based on the sheet id. 
function getCollect(sheet_id) {
  const wb = SpreadsheetApp.openById("1LpkjzBEoOSmw41dDLwONE2Gn9mhSGb5GaiCApnhI3JE");
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
  const s = getCollect(2063800821);
  const r = s.getRange(6, 8, s.getMaxRows(), 1).getValues();
  let data = {};

  r.forEach((email, i) => {
    email = email[0];
    i = i + 6;
    if (email == query) {
      data = {
        row: i,
        name: s.getRange(i, 5).getValue(),
        steamId: s.getRange(i, 6).getValue(),
        discordId: s.getRange(i, 7).getValue(),
        gmail: s.getRange(i, 8).getValue(),
        rank: s.getRange(i, 4).getValue(),
        infractions: s.getRange(i, 10).getDisplayValue(),
        status: s.getRange(i, 11).getDisplayValue(),
        specialization: s.getRange(i, 12).getValue(),
        loaEnd: s.getRange(i, 14).getDisplayValue(),
        blacklistEnd: s.getRange(i, 16).getDisplayValue(),
        notes: s.getRange(i, 17).getValue()
      };
    }
  });

  console.log(data)
  if (stringify) { return JSON.stringify(data); } else { return data; }
}

/**
 * @param {String} rank - Name of rank to get the last row of
 */
function GetLastRankRow(rank) {
  if (!rank) return;
  const sheet = getCollect(2063800821);
  const total_rows = sheet.getMaxRows();
  
  for (let i = 2; i <= total_rows; i++) {
    if (sheet.getRange(i - 1, 4).getValue() == rank && sheet.getRange(i, 4).getValue() != rank) return i - 1;
  }
}

/**
 * Gets first row of a rank, regardless if it is occupied or not
 */
function GetStartRankRow(rank) {
  if (!rank) return;
  const sheet = getCollect(2063800821);
  const total_rows = sheet.getMaxRows();

  for (let i = 1; i <= total_rows; i++) {
    if (sheet.getRange(i, 4).getValue() == rank) return i;
  }
}

/**
 * Get the first empty slot of a certian rank, not to be confused with GetStartRankRow()
 * @param {String} rank - Rank name of the target
 * @returns {Array} Array with length of 2: [rowNumber, sheetObject]
 */
function GetFirstRankRow(rank) {
  rank = "Security Chief";
  if (!rank) return;
  const sheet = getCollect(2063800821);
  let match_row = 0;
  const total_rows = sheet.getMaxRows();
  const rank_rows = [];

  for (let i = 1; i <= total_rows; i++) {

    // Check if col D = rank & steamID isn't empty
    if (sheet.getRange(i, 4).getValue() === rank && sheet.getRange(i, 8).getValue() === '') {
      rank_rows.push(i);
    }
  }

  match_row = rank_rows.length > 0 ? rank_rows[0] : 0;
  return [match_row, sheet];
}

/**
 * Get the last row where the date has not yet been logged
 * @param {Object} sheet - Sheet object (use getCollect() to extract this object using sheet ID)
 */
function GetLastRow(sheet) {
  for (let r = 6; r <= 1003; r++) {
    if (sheet.getRange(r, 3).getValue() === '') {
      return r;
    }
  }
  return 7;
}

/**
 * Gets the time in ms without having to use american formatting (mm/dd/yyyy)
 * @param {String} dateString
 * @returns {Number}
 */
function DateToMilliseconds(dateString) {
  const parts = dateString.split("/");
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  // months are 0-indexed
  const date = new Date(year, month - 1, day);
  return date.getTime();
}