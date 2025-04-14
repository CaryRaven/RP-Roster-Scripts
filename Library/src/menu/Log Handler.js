/**
 * Process all submitted logs, currently supports:
 * Rank Change (promo, demo, removal, pass interview), Infraction Log, LOA Log, Blacklist (Blacklist & Suspension), Infraction Appeal, Blacklist Appeal, New Member
 * 
 * @param {Object} inputData - Data input by the user
 * @param {PropertyService.UserProperty} userData
 * @param {PropertyService.ScriptProperty} allowedStaff
 * @param {PropertyService.ScriptProperty} lockdown
 * @param {Boolean} threshold (optional) - Is this function run because of the threshold?
 * @returns {String}
 */
function processLog(inputData, userData, allowedStaff, lockdown, threshold = false) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!inputData || typeof inputData !== "object") throw new Error("Do not run this function from the editor");
  if (!userData) throw new Error("No userdata provided");
  if (!allowedStaff) throw new Error("No allowed staff list provided");
  if (!lockdown) throw new Error("No valid lockdown time provided");

  // If this was called due to a threshold
  if (threshold === true) {
    inputData.reason = "Exceeded Infraction Threshold";
    switch (LIBRARY_SETTINGS.thresholdAction) {
      case "Suspension":
        inputData.type_check = "Blacklist";
        inputData.type = "Blacklist";
        inputData.blacklist_type = "Suspension";
        let today = new Date();
        inputData.end_date = new Date(today); 
        inputData.end_date.setMonth(inputData.end_date.getMonth() + 1);
        break;
      case "Demotion":
        inputData.type_check = "Rank Change";
        inputData.type = "Rank Change";
        inputData.rankchangetype = "Demotion";
        break;
      case "Removal":
        inputData.type_check = "Rank Change";
        inputData.type = "Rank Change";
        inputData.rankchangetype = "Removal";
        break;
      default:
        throw new Error("thresholdAction not configured");
    }
  }

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

  valid = filterQuotes(inputData);

  if (valid !== true) return "Do not attempt to avoid answer validation";
  let targetData = {};
  let ranks = [];
  let firstRankRow;
  let appealable_bool;

  // Only do all these calculations when needed (runtime reduction)
  if (inputData.type != "Infraction Appeal" && inputData.type != "Blacklist Appeal") {
    console.log("Processing Data");
    targetData = getUserData(inputData.email);
    ranks = LIBRARY_SETTINGS.ranks;

    if (!targetData.row && inputData.blacklist_type != "Blacklist" && inputData.rankchangetype != "Passed Interview") return "User not found";
    if (inputData.blacklist_appealable == 'Yes') { appealable_bool = true; } else { appealable_bool = false; }

    // New Member/BL => data was manually inputted
    if (inputData.type_check == "New Member" || inputData.blacklist_type == "Blacklist") {
      targetData.name = inputData.name;
      targetData.steamId = inputData.steamid;
      targetData.discordId = inputData.discordid;
      targetData.rank = ranks[0];
    }

    // Allow managing yourself if made through a request
    if (targetData.steamId == userData.steamId) return "You cannot manage yourself";
    if (ranks[ranks.length - 1].includes(targetData.rank) || ranks[ranks.length - 2].includes(targetData.rank)) return "You cannot manage Senior CL4 members from this menu";
    if (allowedStaff.includes(inputData.email) || allowedStaff.includes(targetData.email)) return "You cannot manage Staff from this menu";
    if (ranks.indexOf(targetData.rank) >= ranks.indexOf(userData.rank) && !allowedStaff.includes(userData.email)) return "You cannot manage people with a higher rank than you.";

    // used when moving members around
    firstRankRow = getFirstRankRow(targetData.rank);
    firstRankRow[0] = firstRankRow[0] == 0 ? getLastRankRow(targetData.rank) : firstRankRow[0] - 1;
  }

  let sheet;
  let insertLogRow;
  // Main case
  switch (inputData.type) {
    case "Rank Change":
      let rowDestination;
      let currentRankIndex = ranks.indexOf(targetData.rank);
      sheet = getCollect(LIBRARY_SETTINGS.rankchangeId);
      const roster = getCollect(LIBRARY_SETTINGS.rosterIds[0]);
      insertLogRow = getLastRow(sheet);

      switch (inputData.rankchangetype) {
        case "Promotion":
          // Basic Checks
          if (targetData.status == "LOA") return "You cannot promote members who are on LOA";
          if (Number(targetData.infractions) !== 0) return "You cannot promote members with an active infraction";
          if (targetData.status == "Suspended") return "You cannot promote suspended members";
          if (roster.getRange(targetData.row, 16).getDisplayValue().toLowerCase() == "false") return "This user must complete all their requirements before promotion."; 
          const promotionDestination = ranks[currentRankIndex + 1];
          if (!promotionDestination || currentRankIndex === ranks.length - 3) return "This user cannot be promoted any further";

          // Check cooldown
          const lastRankChange = dateToMilliseconds(roster.getRange(targetData.row, LIBRARY_SETTINGS.lastRankChange).getDisplayValue());
          const timeDiff = new Date().valueOf() - lastRankChange;
          if (timeDiff <= (LIBRARY_SETTINGS.promoCooldown * 86400000)) return `You must wait ${LIBRARY_SETTINGS.promoCooldown} days between Promotions`;

          // Check if the person has an open interview
          if (LIBRARY_SETTINGS.interviewRequired[currentRankIndex + 1].toString() !== "false") {
            const files = DriveApp.getFolderById(LIBRARY_SETTINGS.interviewFolderId).getFiles();
            let hasInterview = false;
            while (files.hasNext() && !hasInterview) {
              const file = files.next();
              const fileName = file.getName();
              if (fileName.includes(targetData.name) && fileName.includes("[PASSED]") && fileName.includes(promotionDestination) && fileName.toLowerCase().includes(promotionDestination.toLowerCase())) {
                let wrongRank = LIBRARY_SETTINGS.ranks.some(rank => {
                  return rank.toLowerCase() !== promotionDestination.toLowerCase() && fileName.toLowerCase().includes(rank.toLowerCase());
                });

                if (wrongRank) continue;

                console.log("Processing Interview");
                const owner = file.getOwner().getEmail();
                if (userData.email === owner) {
                  file.setOwner("dontorro208@gmail.com");
                } else {
                  const editors = file.getEditors();
                  editors.map(editor => editor.getEmail());

                  if (!editors.includes(userData.email)) continue;
                }
                try { 
                  file.moveTo(DriveApp.getFolderById(LIBRARY_SETTINGS.closedInterviewFolderId));
                  hasInterview = true;
                } catch(e) { continue }
              }
            }
            if (hasInterview !== true) return `Could not find an interview under the name: "${targetData.name}"\nMake sure they have passed a ${promotionDestination} interview first.`;
          }

          rowDestination = getFirstRankRow(promotionDestination);
          if (rowDestination[0] == 0) return `${promotionDestination} has reached capacity`;
          targetData["newRank"] = promotionDestination;

          moveMember(targetData.row, rowDestination[0]);
          moveMember(firstRankRow[0], targetData.row);
          insertRankChangeLog(inputData, userData, targetData, promotionDestination, insertLogRow);
          protectRange("N", sheet, null, insertLogRow);

          if (lockdown === "false") {
            removeDocAccess(targetData.email);
            addDocAccess(currentRankIndex + 1, targetData.email);
          }
          break;
        case "Demotion":
          const demotionDestination = ranks[currentRankIndex - 1];
          if (!demotionDestination || currentRankIndex === 0) return "This user cannot be demoted any further, consider a removal";

          rowDestination = getFirstRankRow(demotionDestination);
          if (rowDestination[0] == 0) return `${demotionDestination} has reached capacity`;
          targetData["newRank"] = demotionDestination;

          moveMember(targetData.row, rowDestination[0]);
          moveMember(firstRankRow[0], targetData.row);
          insertRankChangeLog(inputData, userData, targetData, demotionDestination, insertLogRow);
          protectRange("N", sheet, null, insertLogRow);

          // Only add doc access if no lockdown
          if (lockdown === "false") {
            removeDocAccess(targetData.email);
            addDocAccess(currentRankIndex - 1, targetData.email);
          }
          break;
        case "Removal":
          moveMember(targetData.row);
          moveMember(firstRankRow[0], targetData.row);
          insertRankChangeLog(inputData, userData, targetData, "Member", insertLogRow);
          protectRange("N", sheet, null, insertLogRow);
          removeDocAccess(targetData.email);
          break;
        case "Passed Interview":
          const newStaffDestination = ranks[0];
          rowDestination = getFirstRankRow(newStaffDestination);
          if (rowDestination[0] === 0) return `${newStaffDestination} has reached capacity`;

          // Check if the person has an open interview
          if (LIBRARY_SETTINGS.interviewRequired[0].toString() !== "false") {
            const files = DriveApp.getFolderById(LIBRARY_SETTINGS.interviewFolderId).getFiles();
            let hasInterview = false;
            while (files.hasNext() && !hasInterview) {
              const file = files.next();
              const fileName = file.getName();
              if (fileName.includes(targetData.name) && fileName.includes("[PASSED]") && fileName.includes(newStaffDestination) && fileName.toLowerCase().includes(newStaffDestination.toLowerCase())) {
                let wrongRank = LIBRARY_SETTINGS.ranks.some(rank => {
                  return rank.toLowerCase() !== newStaffDestination.toLowerCase() && fileName.toLowerCase().includes(rank.toLowerCase());
                });

                if (wrongRank) continue;

                console.log("Processing Interview");
                const owner = file.getOwner().getEmail();
                if (userData.email === owner) {
                  file.setOwner("dontorro208@gmail.com");
                } else {
                  const editors = file.getEditors();
                  editors.map(editor => editor.getEmail());

                  if (!editors.includes(userData.email)) continue;
                }
                try { 
                  file.moveTo(DriveApp.getFolderById(LIBRARY_SETTINGS.closedInterviewFolderId));
                  hasInterview = true;
                } catch(e) { continue }
              }
            }
            if (hasInterview !== true) return `Could not find an interview under the name: "${targetData.name}"\nMake sure they have passed a ${newStaffDestination} interview first.`;
          }

          targetData["newRank"] = newStaffDestination;

          roster.getRange(rowDestination[0], LIBRARY_SETTINGS.dataCols.name, 1, 4).setValues([[targetData.name, targetData.steamId, targetData.discordId, inputData.email]]);
          const dataToInsert = [[new Date(), targetData.name, targetData.steamId, targetData.discordId, "Member", inputData.rankchangetype, ranks[0], inputData.reason, "", userData.name, userData.steamId, userData.rank]];
          sheet.getRange(insertLogRow, LIBRARY_SETTINGS.dataCols.firstCol, 1, dataToInsert[0].length).setValues(dataToInsert);

          protectRange("N", sheet, null, insertLogRow);

          if (lockdown === "false") {
            removeDocAccess(inputData.email);
            addDocAccess(0, inputData.email);
          }
          break;
      }
      break;
    case "Infraction Log":
      if (threshold === false) {
        if (targetData.status == "Suspended") return "You cannot strike suspended members, consider a removal/blacklist";
        sheet = getCollect(LIBRARY_SETTINGS.infractionId);
        insertLogRow = getLastRow(sheet);
        
        // few random checks
        if (!targetData.name || !targetData.steamId || !targetData.row) return "User not found";

        sheet.getRange(insertLogRow, LIBRARY_SETTINGS.dataCols.firstCol, 1, 12).setValues([[new Date(), targetData.name, targetData.steamId, targetData.discordId, targetData.rank, inputData.infraction_type, false, inputData.reason, "", userData.name, userData.steamId, userData.rank]]);
        protectRange("A", sheet, 9, insertLogRow);
        sendDiscordLog(inputData, targetData, userData);
      }
      break;
    case "LOA Log":
      const timeDiff = new Date().valueOf() - dateToMilliseconds(targetData.loaEnd);
      if (timeDiff < 0) return "This user is already on LOA, you cannot log another one";
      if (timeDiff <= (LIBRARY_SETTINGS.loaCooldown * 86400000)) return `You must wait ${LIBRARY_SETTINGS.loaCooldown} days between LOAs`;

      // few random checks
      if (!targetData.name || !targetData.steamId || !targetData.row) return "User not found";

      sheet = getCollect(LIBRARY_SETTINGS.loaId);
      insertLogRow = getLastRow(sheet);

      sheet.getRange(insertLogRow, LIBRARY_SETTINGS.dataCols.firstCol, 1, 10).setValues([[new Date(), targetData.name, targetData.steamId, targetData.discordId, inputData.end_date, inputData.reason, "", userData.name, userData.steamId, userData.rank]]);
      protectRange("N", sheet, null, insertLogRow);
      break;
    case "Blacklist":
      sheet = getCollect(LIBRARY_SETTINGS.blId);
      insertLogRow = getLastRow(sheet);

      // few random checks
      if (!targetData.name || !targetData.steamId || !targetData.row) return "User not found";

      sheet.getRange(insertLogRow, LIBRARY_SETTINGS.dataCols.firstCol, 1, 13).setValues([[new Date(), targetData.name, targetData.steamId, targetData.discordId, inputData.blacklist_type, inputData.end_date, appealable_bool, false, inputData.reason, "", userData.name, userData.steamId, userData.rank]]);
      protectRange("A", sheet, 10, insertLogRow);

      if (inputData.blacklist_type === "Blacklist" && targetData.row) {
        sheet = getCollect(LIBRARY_SETTINGS.rankchangeId);
        moveMember(targetData.row);
        inputData.rankchangetype = "Blacklisted";
        insertLogRow = getLastRow(sheet);

        moveMember(firstRankRow[0], targetData.row);
        insertRankChangeLog(inputData, userData, targetData, "Member", insertLogRow);
        protectRange("N", sheet, null, insertLogRow);
        removeDocAccess(targetData.email);
      }
      break;
    case "Requirement Log":
      if (!targetData.name || !targetData.steamId || !targetData.row) return "User not found";

      // Check if user completed req yet
      sheet = getCollect(LIBRARY_SETTINGS.rosterIds[LIBRARY_SETTINGS.rosterIds.length - 1]);
      const reqTitleRow = getFirstRankRow(targetData.rank, LIBRARY_SETTINGS.rosterIds.length - 1)[0] - 1;

      if (reqTitleRow <= 6) return "Requirement not found";

      // Get column where req is located
      for (let i = 8; i < sheet.getMaxColumns(); i++) {
        if (sheet.getRange(reqTitleRow, i).getValue() === inputData.reqName) {

          // Get row where req is located
          for (let j = reqTitleRow; j < sheet.getMaxRows(); j++) {
            if (sheet.getRange(j, LIBRARY_SETTINGS.dataCols.steamId).getValue() === targetData.steamId && sheet.getRange(j, i).getDisplayValue() == true) return "User already completed requirement";
          }
        }
      }

      sheet = getCollect(LIBRARY_SETTINGS.reqId);
      insertLogRow = getLastRow(sheet);

      // Insert log
      sheet.getRange(insertLogRow, LIBRARY_SETTINGS.dataCols.firstCol, 1, 11).setValues([[new Date(), targetData.name, targetData.steamId, targetData.discordId, targetData.rank, inputData.reqName, inputData.reason, "", userData.name, userData.steamId, userData.rank]]);
      protectRange("N", sheet, null, insertLogRow);
      break;
    case "Blacklist Appeal":
      sheet = getCollect(LIBRARY_SETTINGS.blId);
      // Check if the given id corresponds to a log
      if (sheet.getRange(Number(inputData.log_id), 8).getValue() != '') {
        if (sheet.getRange(Number(inputData.log_id), 9).getValue() == true) {
          // Check if log is not appealed yet
          if (sheet.getRange(Number(inputData.log_id), 10).getValue() == false) {
            sheet.getRange(Number(inputData.log_id), 10).setValue(true);
            sheet.getRange(Number(inputData.log_id), 11).setValue(`[APPEALED ${inputData.reason}`);
            protectRange("S", sheet, 10, Number(inputData.log_id));

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
      sheet = getCollect(LIBRARY_SETTINGS.infractionId);
      // Check if the given id corresponds to a log
      if (sheet.getRange(Number(inputData.log_id), 8).getValue() != '') {
        // Check if log is not appealed yet
        if (sheet.getRange(Number(inputData.log_id), 9).getValue() == false) {
          sheet.getRange(Number(inputData.log_id), 9).setValue(true);
          sheet.getRange(Number(inputData.log_id), 10).setValue(`[APPEALED] ${inputData.reason}`);
          protectRange("S", sheet, 9, Number(inputData.log_id));

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
  if (inputData.type !== "Infraction Log") sendDiscordLog(inputData, targetData, userData);
  return JSON.stringify(["Log submitted", Number(targetData.infractions) + 1, LIBRARY_SETTINGS.threshold, LIBRARY_SETTINGS.thresholdAction]);
}