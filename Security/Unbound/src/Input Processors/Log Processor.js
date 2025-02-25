function ProcessLog(inputData) {

    // Server side double check
    let valid = false;
    switch (inputData.type_check) {
    case 'Rank Change':
        if (inputData.email.includes("@") && inputData.email.includes(".") && inputData.reason != '' && inputData.rankchangetype != '') { valid = true; }
        if (inputData.rankchangetype == "Transfer") { inputData.branch != "" ? valid = true : valid = false; }
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
        if (inputData.reason != '' && Number(inputData.log_id) >= 7) valid = true;
        break;
    case 'Blacklist Appeal':
        if (Number(inputData.log_id) >= 7) valid = true;
        break;
    case "New Captain":
        if (inputData.email.includes('.') && inputData.email.includes('@') && inputData.steamid.includes("STEAM_") && inputData.reason != '' && inputData.branch != '') valid = true;
        break;
    default:
        break;
    }

    if (
        inputData.name.includes('"') || inputData.name.includes("'") || inputData.name.includes("`")
        || inputData.steamid.includes('"') || inputData.steamid.includes("'") || inputData.steamid.includes("`")
        || inputData.discordid.includes('"') || inputData.discordid.includes("'") || inputData.discordid.includes("`")
        || inputData.email.includes('"') || inputData.email.includes("'") || inputData.email.includes("`")
        || inputData.reason.includes('"') || inputData.reason.includes("'") || inputData.reason.includes("`")
        || inputData.log_id.includes('"') || inputData.log_id.includes("'") || inputData.log_id.includes("`")
    ) valid = false;

    if (valid === false) return "Do not attempt to avoid answer validation";
    let userData;
    let targetData;
    let ranks;
    let folders;
    let allowedStaff;
    let firstRankRow;
    
      // Only do all these calculations when needed (runtime reduction)
    if (inputData.type != "Infraction Appeal" && inputData.type != "Blacklist Appeal") {
        console.log("Processing Data");
        userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
        targetData = GetUserData(inputData.email);
        ranks = JSON.parse(PropertiesService.getScriptProperties().getProperty("ranks"));
        folders = JSON.parse(PropertiesService.getScriptProperties().getProperty("folders"));
        allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));

        if (!targetData) return "User not found";

        // New Captain/BL => data was manually inputted
        if (inputData.type_check == "New Captain" || inputData.blacklist_type == "Blacklist") {
            targetData.name = inputData.name;
            targetData.steamId = inputData.steamid;
            targetData.discordId = inputData.discordid;
            targetData.rank = ranks[0];
        }

        if (ranks[3].includes(targetData.rank) || ranks[2].includes(targetData.rank)) return "You cannot manage Senior CL4 members from this menu";
        if (allowedStaff.includes(inputData.email) || allowedStaff.includes(targetData.email)) return "You cannot manage Staff from this menu";

        // used when moving members around
        firstRankRow = GetFirstRankRow(targetData.rank);
        firstRankRow[0] = firstRankRow[0] == 0 ? GetLastRankRow(targetData.rank) : firstRankRow[0] - 1;
    }

    let sheet;
    let insertLogRow;
    const rosters = [591802026, 1909134230, 1817701302, 1213738552];
    const dataColumns = [5, 6, 7, 8, 12, 17];

    // Main case
    switch (inputData.type) {
        case "Rank Change":
            let rowDestination;
            let currentRankIndex = ranks.indexOf(targetData.rank);
            sheet = getCollect(789793193);
            const roster = getCollect(2063800821);
            insertLogRow = GetLastRow(sheet);

            switch (inputData.rankchangetype) {
                case "Promotion":
                    if (Number(targetData.infractions) !== 0) return "You cannot promote members with an active infraction";
                    const promotionDestination = ranks[currentRankIndex + 1];
                    if (!promotionDestination || currentRankIndex === 1) return "This user cannot be promoted any further";
                    
                    rowDestination = GetFirstRankRow(promotionDestination);
                    if (rowDestination[0] == 0) return `${promotionDestination} has reached capacity`;
                    targetData["newRank"] = promotionDestination;

                    MoveMember(roster, targetData.row, rowDestination[0]);
                    MoveMember(roster, firstRankRow[0], targetData.row);
                    InsertRankChangeLog(inputData, userData, targetData, promotionDestination, insertLogRow);
                    ProtectRange("N", sheet, null, insertLogRow, null);
                    RemoveDocAccess(folders, targetData.email);
                    AddDocAccess(folders[currentRankIndex + 1], targetData.email);
                    break;
                case "Demotion":
                    const demotionDestination = ranks[currentRankIndex - 1];
                    if (!demotionDestination || currentRankIndex === 0) return "This user cannot be demoted any further, consider a removal";

                    rowDestination = GetFirstRankRow(demotionDestination);
                    if (rowDestination[0] == 0) return `${demotionDestination} has reached capacity`;
                    targetData["newRank"] = demotionDestination;

                    MoveMember(roster, targetData.row, rowDestination[0]);
                    MoveMember(roster, firstRankRow[0], targetData.row);
                    InsertRankChangeLog(inputData, userData, targetData, demotionDestination, insertLogRow);
                    ProtectRange("N", sheet, null, insertLogRow, null);
                    RemoveDocAccess(folders, targetData.email);
                    AddDocAccess(folders[currentRankIndex - 1], targetData.email);
                    break;
                case "Removal":
                    dataColumns.forEach(col => {
                        roster.getRange(targetData.row, col).setValue('');
                    });
                    MoveMember(roster, firstRankRow[0], targetData.row);
                    InsertRankChangeLog(inputData, userData, targetData, "Member", insertLogRow);
                    ProtectRange("N", sheet, null, insertLogRow, null);
                    RemoveDocAccess(folders, targetData.email);
                    break;
                case "Passed Interview":
                    const newStaffDestination = ranks[0];
                    rowDestination = GetFirstRankRow(newStaffDestination);
                    if (rowDestination[0] === 0) return `${newStaffDestination} has reached capacity`;
                    targetData["newRank"] = newStaffDestination;

                    roster.getRange(rowDestination[0], 5, 1, 4).setValues([[targetData.name, targetData.steamId, targetData.discordId, inputData.email]]);
                    const dataToInsert = [[new Date(), targetData.name, targetData.steamId, targetData.discordId, "Member", inputData.rankchangetype, ranks[0], inputData.reason, "", userData.name, userData.steamId, userData.rank]];
                    sheet.getRange(insertLogRow, 3, 1, dataToInsert[0].length).setValues(dataToInsert);

                    ProtectRange("N", sheet, null, insertLogRow, null);
                    RemoveDocAccess(folders, inputData.email);
                    AddDocAccess(folders[0], inputData.email);
                    break;
            }
            break;
        case "Infraction Log":
            if (targetData.status == "Suspended") return "You cannot strike suspended members, consider a removal/blacklist";
            sheet  = getCollect(343884184);
            insertLogRow = GetLastRow(sheet);

            sheet.getRange(insertLogRow, 3, 1, 12).setValues([[new Date(), targetData.name, targetData.steamId, targetData.discordId, targetData.rank, inputData.infraction_type, false, inputData.reason, "", userData.name, userData.steamId, userData.rank]]);
            ProtectRange("A", sheet, 9, insertLogRow, null);
            break;
        case "LOA Log":
            const timeDiff = new Date().valueOf() - DateToMilliseconds(targetData.loaEnd);
            if (timeDiff < 0) return "This user is already on LOA, you cannot log another one";
            if (timeDiff <= 1210000000) return "You must wait two weeks between LOAs";

            sheet = getCollect(977408594);
            insertLogRow = GetLastRow(sheet);

            sheet.getRange(insertLogRow, 3, 1, 10).setValues([[new Date(), targetData.name, targetData.steamId, targetData.discordId, inputData.end_date, inputData.reason, "", userData.name, userData.steamId, userData.rank]]);
            ProtectRange("N", sheet, null, insertLogRow, null);
            break;
        case "Blacklist":
            return "Feature not supported yet";
            break;
        case "Blacklist Appeal":
            return "Feature not supported yet";
            break;
        case "Infraction Appeal":
            return "Feature not supported yet";
            break;
    }
    return "Log submitted";
}

function InsertRankChangeLog(inputData, userData, targetData, newRank, insertLogRow) {
    const sheet = getCollect(789793193);
    const dataToInsert = [[new Date(), targetData.name, targetData.steamId, targetData.discordId, targetData.rank, inputData.rankchangetype, newRank, inputData.reason, "", userData.name, userData.steamId, userData.rank]];
    sheet.getRange(insertLogRow, 3, 1, dataToInsert[0].length).setValues(dataToInsert);
}

/**
 * Protect cells when logged so data cannot be griefed
 * @param {String} type - Single character: N (normal), A (Appealable) or S (Single)
 * @param {Object} sh - Sheet Object (use getCollect() to extract this object using sheet ID)
 * @param {Number|Null} unprotectedCell - Column number of cell to leave unprotected (null in case of N type)
 * @param {Number|Null} empty_row - Number of row to protect (null in case of S type)
 * @param {Number|Null} id - Number of row to protect (null in case of N or A types)
 * return {Void}
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