function ProcessLog(inputData) {
  if (!inputData) throw new Error("Do not run this function from the editor");

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
    case "New Member":
        if (inputData.email.includes('.') && inputData.email.includes('@') && inputData.steamid.includes("STEAM_") && inputData.reason != '' && inputData.branch != '') valid = true;
        break;
    default:
        break;
    }

    valid = RosterService.filterQuotes(inputData);

    if (valid !== true) return "Do not attempt to avoid answer validation";
    let userData = {};
    let targetData = {};
    let ranks = [];
    let allowedStaff = [];
    let firstRankRow;
    let appealable_bool;
    
      // Only do all these calculations when needed (runtime reduction)
    if (inputData.type != "Infraction Appeal" && inputData.type != "Blacklist Appeal") {
        console.log("Processing Data");
        userData = JSON.parse(PropertiesService.getUserProperties().getProperty("userData"));
        targetData = RosterService.getUserData(inputData.email);
        ranks = LIBRARY_SETTINGS.ranks;
        allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));

        if (!targetData.row) return "User not found";
        if (inputData.blacklist_appealable == 'Yes') { appealable_bool = true; } else { appealable_bool = false; }

        // New Member/BL => data was manually inputted
        if (inputData.type_check == "New Member" || inputData.blacklist_type == "Blacklist") {
            targetData.name = inputData.name;
            targetData.steamId = inputData.steamid;
            targetData.discordId = inputData.discordid;
            targetData.rank = ranks[0];
        }
        
        if (targetData.steamId == userData.steamId) return "You cannot manage yourself";
        if (ranks[ranks.length - 1].includes(targetData.rank) || ranks[ranks.length - 2].includes(targetData.rank)) return "You cannot manage Senior CL4 members from this menu";
        if (allowedStaff.includes(inputData.email) || allowedStaff.includes(targetData.email)) return "You cannot manage Staff from this menu";

        // used when moving members around
        firstRankRow = RosterService.getFirstRankRow(targetData.rank);
        firstRankRow[0] = firstRankRow[0] == 0 ? RosterService.getLastRankRow(targetData.rank) : firstRankRow[0] - 1;
    }

    let sheet;
    let insertLogRow;

    // Main case
    switch (inputData.type) {
        case "Rank Change":
            let rowDestination;
            let currentRankIndex = ranks.indexOf(targetData.rank);
            sheet = RosterService.getCollect(789793193);
            const roster = RosterService.getCollect(2063800821);
            insertLogRow = RosterService.getLastRow(sheet);

            switch (inputData.rankchangetype) {
                case "Promotion":
                    if (targetData.status == "LOA") return "You cannot promote members who are on LOA";
                    if (Number(targetData.infractions) !== 0) return "You cannot promote members with an active infraction";
                    const promotionDestination = ranks[currentRankIndex + 1];
                    if (!promotionDestination || currentRankIndex === 1) return "This user cannot be promoted any further";
                    
                    rowDestination = RosterService.getFirstRankRow(promotionDestination);
                    if (rowDestination[0] == 0) return `${promotionDestination} has reached capacity`;
                    targetData["newRank"] = promotionDestination;

                    RosterService.moveMember(targetData.row, rowDestination[0]);
                    RosterService.moveMember(firstRankRow[0], targetData.row);
                    RosterService.insertRankChangeLog(inputData, userData, targetData, promotionDestination, insertLogRow);
                    RosterService.protectRange("N", sheet, null, insertLogRow);
                    RosterService.removeDocAccess(targetData.email);
                    RosterService.addDocAccess(currentRankIndex + 1, targetData.email);
                    break;
                case "Demotion":
                    const demotionDestination = ranks[currentRankIndex - 1];
                    if (!demotionDestination || currentRankIndex === 0) return "This user cannot be demoted any further, consider a removal";

                    rowDestination = RosterService.getFirstRankRow(demotionDestination);
                    if (rowDestination[0] == 0) return `${demotionDestination} has reached capacity`;
                    targetData["newRank"] = demotionDestination;

                    RosterService.moveMember(targetData.row, rowDestination[0]);
                    RosterService.moveMember(firstRankRow[0], targetData.row);
                    RosterService.insertRankChangeLog(inputData, userData, targetData, demotionDestination, insertLogRow);
                    RosterService.protectRange("N", sheet, null, insertLogRow);
                    RosterService.removeDocAccess(targetData.email);
                    RosterService.addDocAccess(currentRankIndex - 1, targetData.email);
                    break;
                case "Removal":
                    RosterService.moveMember(targetData.row);
                    RosterService.moveMember(firstRankRow[0], targetData.row);
                    RosterService.insertRankChangeLog(inputData, userData, targetData, "Member", insertLogRow);
                    RosterService.protectRange("N", sheet, null, insertLogRow);
                    RosterService.removeDocAccess(targetData.email);
                    break;
                case "Passed Interview":
                    const newStaffDestination = ranks[0];
                    rowDestination = RosterService.getFirstRankRow(newStaffDestination);
                    if (rowDestination[0] === 0) return `${newStaffDestination} has reached capacity`;
                    targetData["newRank"] = newStaffDestination;

                    roster.getRange(rowDestination[0], 5, 1, 4).setValues([[targetData.name, targetData.steamId, targetData.discordId, inputData.email]]);
                    const dataToInsert = [[new Date(), targetData.name, targetData.steamId, targetData.discordId, "Member", inputData.rankchangetype, ranks[0], inputData.reason, "", userData.name, userData.steamId, userData.rank]];
                    sheet.getRange(insertLogRow, 3, 1, dataToInsert[0].length).setValues(dataToInsert);

                    RosterService.protectRange("N", sheet, null, insertLogRow);
                    RosterService.removeDocAccess(inputData.email);
                    RosterService.addDocAccess(0, inputData.email);
                    break;
            }
            break;
        case "Infraction Log":
            if (targetData.status == "Suspended") return "You cannot strike suspended members, consider a removal/blacklist";
            sheet  = RosterService.getCollect(343884184);
            insertLogRow = RosterService.getLastRow(sheet);

            sheet.getRange(insertLogRow, 3, 1, 12).setValues([[new Date(), targetData.name, targetData.steamId, targetData.discordId, targetData.rank, inputData.infraction_type, false, inputData.reason, "", userData.name, userData.steamId, userData.rank]]);
            RosterService.protectRange("A", sheet, 9, insertLogRow);
            break;
        case "LOA Log":
            const timeDiff = new Date().valueOf() - RosterService.dateToMilliseconds(targetData.loaEnd);
            if (timeDiff < 0) return "This user is already on LOA, you cannot log another one";
            // TODO: make config
            if (timeDiff <= 1210000000) return "You must wait two weeks between LOAs";

            sheet = RosterService.getCollect(977408594);
            insertLogRow = RosterService.getLastRow(sheet);

            sheet.getRange(insertLogRow, 3, 1, 10).setValues([[new Date(), targetData.name, targetData.steamId, targetData.discordId, inputData.end_date, inputData.reason, "", userData.name, userData.steamId, userData.rank]]);
            RosterService.protectRange("N", sheet, null, insertLogRow);
            break;
        case "Blacklist":
            sheet = RosterService.getCollect(1787594911);
            insertLogRow = RosterService.getLastRow(sheet);

            sheet.getRange(insertLogRow, 3, 1, 13).setValues([[new Date(), targetData.name, targetData.steamId, targetData.discordId, inputData.blacklist_type, inputData.end_date, appealable_bool, false, inputData.reason, "", userData.name, userData.steamId, userData.rank]]);
            RosterService.protectRange("A", sheet, 10, insertLogRow);

            if (inputData.blacklist_type === "Blacklist") {
                if (targetData.row) {
                    sheet = RosterService.getCollect(789793193);
                    RosterService.moveMember(targetData.row);
                    inputData.rankchangetype = "Blacklisted";
                    insertLogRow = RosterService.getLastRow(sheet);

                    RosterService.moveMember(firstRankRow[0], targetData.row);
                    RosterService.insertRankChangeLog(inputData, userData, targetData, "Member", insertLogRow);
                    RosterService.protectRange("N", sheet, null, insertLogRow);
                    RosterService.removeDocAccess(targetData.email);
                }
            }
            break;
        case "Blacklist Appeal":
            sheet = RosterService.getCollect(1787594911);
            // Check if the given id corresponds to a log
            if (sheet.getRange(Number(inputData.log_id), 8).getValue() != '') {
              if (sheet.getRange(Number(inputData.log_id), 9).getValue() == true) {
                // Check if log is not appealed yet
                if (sheet.getRange(Number(inputData.log_id), 10).getValue() == false) {
                  sheet.getRange(Number(inputData.log_id), 10).setValue(true);
                  RosterService.protectRange("S", sheet, 10, Number(inputData.log_id));

                  targetData["name"] = sheet.getRange(Number(inputData.log_id), 4).getValue();
                  targetData["steamId"] = sheet.getRange(Number(inputData.log_id), 5).getValue();
                  targetData["discordId"] = sheet.getRange(Number(inputData.log_id), 6).getValue();
                } else {
                  return "You cannot appeal an appealed Blacklist/Suspension";
                }
              } else {
                return "This infraction is not appealable";
              }
            } else {
              return "Blacklist/Suspension was not found";
            }
            break;
        case "Infraction Appeal":
            sheet = RosterService.getCollect(343884184);
            // Check if the given id corresponds to a log
            if (sheet.getRange(Number(inputData.log_id), 8).getValue() != '') {
              // Check if log is not appealed yet
              if (sheet.getRange(Number(inputData.log_id), 9).getValue() == false) {
                sheet.getRange(Number(inputData.log_id), 9).setValue(true);
                RosterService.protectRange("S", sheet, 9, Number(inputData.log_id));

                targetData.name = sheet.getRange(Number(inputData.log_id), 4).getValue();
                targetData.steamId = sheet.getRange(Number(inputData.log_id), 5).getValue();
                targetData.discordId = sheet.getRange(Number(inputData.log_id), 6).getValue();
              } else {
                return "You cannot appeal an appealed Infraction";
              }
            } else {
              return "Infraction was not found";
            }
            break;
    }
    RosterService.sendDiscordLog(inputData, targetData, userData);
    return "Log submitted";
}