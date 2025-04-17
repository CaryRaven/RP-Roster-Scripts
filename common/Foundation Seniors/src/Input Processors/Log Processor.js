/**
 * @param {Object} inputData - Data inputted by the user
 * @returns {String}
 */
function ProcessLog(inputData) {
  let valid = false;
  switch (inputData.type) {
    case 'Rank Change':
      if (inputData.email.includes("@") && inputData.email.includes(".") && inputData.reason != '' && inputData.rankchangetype != '') { valid = true; }
      break;
    case 'Infraction Log':
      if (inputData.email.includes("@") && inputData.email.includes(".") && inputData.reason != '' && inputData.infraction_type != '') { valid = true; }
      break;
    case 'LOA Log':
      if (inputData.email.includes("@") && inputData.email.includes(".") && inputData.reason != '' && inputData.end_date != '') { valid = true; }
      break;
    case 'Blacklist':
      if (inputData.email.includes("@") && inputData.email.includes(".") && inputData.end_date != '' && inputData.reason != '' && inputData.blacklist_appealable != '') {
        switch (inputData.blacklist_type) {
          case "Suspension":
            valid = true;
            break;
          case "Blacklist":
            if (inputData.name != '' && inputData.steamid != '' && inputData.discordid != '' && inputData.blacklist_type != '') valid = true;
            break;
        }
      }
      break;
    case 'Infraction Appeal':
      if (inputData.reason != '' && inputData.log_id >= 7) { valid = true; }
      break;
    case 'Blacklist Appeal':
      if (inputData.log_id >= 7) { valid = true; }
      break;
  }

  if (!valid) return "Do not attempt to bypass answer validation";
  let userData;
  let targetData;
  let ranks;
  let folders;
  let allowedStaff;

  // Only do all these calculations when needed (runtime reduction)
  if (inputData.type != "Infraction Appeal" && inputData.type != "Blacklist Appeal") {
    targetData = GetUserData(inputData.email);

    // user on roster? if not -> search dpt rosters
    if (inputData.type === "Rank Change" && !targetData.gmail) {
      return "OutBoundsSearch"; // TODO: Create out of bounds search
    }

    userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
    ranks = JSON.parse(PropertiesService.getScriptProperties().getProperty("ranks"));
    allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));
    // folders = JSON.parse(PropertiesService.getDocumentProperties().getProperty("folders"));

    // New Staff/BL => data was manually inputted
    if (inputData.blacklist_type == "Blacklist") {
      targetData.name = inputData.name;
      targetData.steamId = inputData.steamid;
      targetData.discordId = inputData.discordid;
    }

    if (allowedStaff.includes(Session.getActiveUser().getEmail())) {
      userData.name = "N/A",
      userData.steamId = "N/A",
      userData.rank = "Staff Team"
    }

    // Convert yes/no into true/false for tick box
    if (inputData.blacklist_appealable == 'Yes') { appealable_bool = true; } else { appealable_bool = false; }

    if (userData.gmail == targetData.gmail) return "You are not allowed to manage yourself";

    // Permission check for Site Management
    if (!ranks[0][2].includes(userData.rank) && !allowedStaff.includes(Session.getActiveUser().getEmail())) {
      if (targetData.rank.includes('Site')) {
        return "You cannot manage members of Site Management";
      } else {
        if (targetData.liaisonSteamId !== userData.steamId) return "You are not the liaison of this department";
      }
    } else if(ranks[0][2].includes(userData.rank) && inputData.rankchangetype === "Promotion") {
      if (ranks[0][1].includes(targetData.rank)) return "You cannot promote Site Managers";
    }

  }

  // MTF, Dpt leader or SM
  let rankType = GetRankType(targetData.rank);

  switch (inputData.type) {
    case "Rank Change":
      if (Number(targetData.infractions) != 0) return "You cannot promote users with an active infraction";
      let rowDestination;
      let currentRankIndex;
      let insertLowRow = GetLastRow(getCollect(1108325195));

      switch (inputData.rankchangetype) {
        case "Promotion":
          let promotionDestination;

          if (targetData.rank.includes("LT")) {
            promotionDestination = ranks[rankType][ranks[rankType] - 1];
          } else if (targetData.rank.includes("COM")) {
            promotionDestination = ranks[0][0];
          } else if (targetData.rank.includes("Director") || targetData.rank.includes("Chief")) {
            promotionDestination = ranks[0][0];
          } else {
            promotionDestination = ranks[0][ranks[0].indexOf(targetData.rank) + 1];
          }

          if (!promotionDestination) return "This user cannot be promoted";
          rowDestination = GetFirstRankRow(promotionDestination);
          if (rowDestination[0] === 0) return `${promotionDestination} has reached capacity`;
          targetData["newRank"] = promotionDestination;

          MoveMember(rowDestination[1], targetData.row, rowDestination[0]);
          InsertRankChangeLog(inputData, userData, targetData, targetData.newRank, insertLowRow);
          ProtectRange('N', getCollect(1108325195), null, insertLowRow, null);

          // Fill the empty slot left behind by promoted user
          MoveMember(rowDestination[1], GetLastRankRow(rowDestination[1], targetData.rank), targetData.row);
          break;
        case "Demotion":
          let demotionDestination;

          // TODO: complete demotion
          break;
        case "Removal":
          break;
      }

      break;
    case "Infraction Log":
      break;
    case "LOA Log":
      break;
    case "Blacklist":
      break;
    case "Infraction Appeal":
      break;
    case "Blacklist Appeal":
      break;
  }
  return `${inputData.type}`;
}

function InsertRankChangeLog(inputData, userData, targetData, newRank, insertLogRow) {
  const sheet = getCollect(1108325195);
  const dataToInsert = [[new Date(), targetData.name, targetData.steamId, targetData.discordId, targetData.rank, inputData.rankchangetype, newRank, inputData.reason, userData.name, userData.steamId, userData.rank]];
  sheet.getRange(insertLogRow, 3, 1, dataToInsert[0].length).setValues(dataToInsert);
}

/**
 * @param {String} type - Single character: N (normal), A (Appealable) or S (Single)
 * @param {Object} sh - Sheet Object (use getCollect() to extract this object using sheet ID)
 * @param {Number|Null} unprotectedCell - Column number of cell to leave unprotected (null in case of N type)
 * @param {Number|Null} empty_row - Number of row to protect (null in case of S type)
 * @param {Number|Null} id - Number of row to protect (null in case of N or A types)
 * @returns {Void}
 */
function ProtectRange(type, sh, unprotectedCell, empty_row, id) {

  let protections;
  switch (type) {
    // NORMAL (full row)
    case "N":
      protections = sh.getRange(empty_row, 1, 1, sh.getMaxColumns()).protect();

      protections.removeEditors(protections.getEditors());
      if (protections.canDomainEdit()) {
        protections.setDomainEdit(false);
      }
      break;
    // APPEALABLE (leave one cell unprotected => unprotectedCell)
    case "A":
      protections = sh.getRange(empty_row, 1, 1, (unprotectedCell - 1)).protect();
      protections.removeEditors(protections.getEditors());
      if (protections.canDomainEdit()) {
        protections.setDomainEdit(false);
      }
      protections = sh.getRange(empty_row, (unprotectedCell + 1), 1, sh.getMaxColumns()).protect();
      protections.removeEditors(protections.getEditors());
      if (protections.canDomainEdit()) {
        protections.setDomainEdit(false);
      }
      break;
    // SINGLE (protect a single cell => unprotectedCell)
    case "S":
      protections = sh.getRange(id, unprotectedCell, 1, 1).protect();
      protections.removeEditors(protections.getEditors());
      if (protections.canDomainEdit()) {
        protections.setDomainEdit(false);
      }
      break;
  }
}