/**
 * Process all submitted logs, currently supports:
 * Rank Change (promo, demo, removal, pass interview), Infraction Log, LOA Log, Blacklist (Blacklist & Suspension), Infraction Appeal, Blacklist Appeal, New Member
 * 
 * @param {Object} inputData - Data input by the user
 * @param {PropertyService.UserProperty} userData
 * @param {PropertyService.ScriptProperty} allowedStaff
 * @param {Boolean} threshold (optional) - Is this function run because of the threshold?
 * @returns {String}
 */
function processLog(inputData, userData, allowedStaff, threshold = false) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!inputData || typeof inputData !== "object") throw new Error("Do not run this function from the editor");
  if (!userData) throw new Error("No userdata provided");
  if (!allowedStaff) throw new Error("No allowed staff list provided");

  try {
    // If this was called due to a threshold
    if (threshold === true) {
      inputData.reason = "Exceeded Infraction Threshold";
      switch (LIBRARY_SETTINGS.threshold_action) {
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
        if (inputData.reason != '' && inputData.rankchangetype != '') { valid = true; }
        if (inputData.rankchangetype == "Transfer") { inputData.branch != "" ? valid = true : valid = false; }
        break;
      case 'Infraction Log':
        if (inputData.reason != '' && inputData.infraction_type != '') { valid = true; }
        break;
      case 'LOA Log':
        if (inputData.reason != '' && inputData.end_date != '') { valid = true; }
        break;
      case 'Blacklist':
        if (inputData.end_date != '' && inputData.reason != '' && inputData.blacklist_appealable != '') {
          switch (inputData.blacklist_type) {
            case "Suspension":
              valid = true;
              break;
            case "Blacklist":
              if (inputData.name != '' && inputData.playerId != '' && inputData.discordid != '' && inputData.blacklist_type != '') valid = true;
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
        if (inputData.playerId.length === 5 && inputData.reason != '' && inputData.branch != '') valid = true;
        break;
      default:
        break;
    }

    // Convert to an array so it's iterable, just in case
    if (!Array.isArray(inputData.users)) inputData.users = [inputData.users];

    if (inputData.users.length > 10) return "You cannot select more than 10 members at once";

    valid = filterQuotes(inputData);
    if (valid !== true) return "Do not attempt to avoid answer validation";
    const ranks = LIBRARY_SETTINGS.ranks;

    // Only do all these calculations when needed (runtime reduction)
    if (inputData.type != "Infraction Appeal" && inputData.type != "Blacklist Appeal") {
      for (user of inputData.users) {
        let targetData_check = getUserData(user, 5);

        if (!targetData_check.row && inputData.blacklist_type != "Blacklist" && inputData.rankchangetype != "Passed Interview") return "User not found";

        // If supervisors enabled & not supervisor => deny log
        // TODO: Needs testing
        if (!LIBRARY_SETTINGS.supervisorsDisabled) {
          if (LIBRARY_SETTINGS.modRanks.includes(userData.rank) && LIBRARY_SETTINGS.modsOnlySupervised) {
            if (userData.playerId !== targetData_check.supervisor_playerId) return `You cannot manage ${targetData_check.name}, you do not supervise them.`;
          } else if (LIBRARY_SETTINGS.managerRanks.includes(userData.rank) && LIBRARY_SETTINGS.managersOnlySupervised) {
            if (userData.playerId !== targetData_check.supervisor_playerId) return `You cannot manage ${targetData_check.name}, you do not supervise them.`;
          }
        }

        // New Member/BL => data was manually input
        if (inputData.type_check == "New Member" || inputData.blacklist_type == "Blacklist") {
          targetData_check.name = inputData.name;
          targetData_check.playerId = inputData.playerId;
          targetData_check.discordId = inputData.discordid;
          targetData_check.rank = ranks[0];
        } else {
          if (targetData_check.status === "Missing Data") return "You cannot perform logs on people with missing data";
        }

        // Allow managing yourself if made through a request
        if (targetData_check.playerId == userData.playerId) return "You cannot manage yourself";
        if (LIBRARY_SETTINGS.adminRanks.includes(targetData_check.rank)) return "You cannot manage Senior CL4 members from this menu";
        if (allowedStaff.includes(targetData_check.email) || allowedStaff.includes(inputData.email)) return "You cannot manage Staff from this menu";
        if (ranks.indexOf(targetData_check.rank) >= ranks.indexOf(userData.rank) && !allowedStaff.includes(userData.email)) return "You cannot manage people with a higher rank than you.";
      }
    }

    // Array of responses to send back -> termine whether or not the infraction threshold applies etc...
    let response = [];

    // used when moving members around
    let targetData;
    for (user of inputData.users) {
      targetData = getUserData(user, 5);

      // Data was manually input
      if (inputData.type_check == "New Member" || inputData.blacklist_type == "Blacklist") {
        targetData.name = inputData.name;
        targetData.playerId = inputData.playerId;
        targetData.discordId = inputData.discordid;
        targetData.email = inputData.email
        targetData.rank = ranks[0];
      }

      console.log(targetData);
      let firstRankRow;
      
      // used when moving members around
      firstRankRow = getFirstRankRow(targetData.rank);
      firstRankRow[0] = firstRankRow[0] == 0 ? getLastRankRow(targetData.rank) : firstRankRow[0] - 1;

      let sheet;
      let insertLogRow;
      // Main case
      switch (inputData.type) {
        case "Rank Change":
          let rowDestination;
          let currentRankIndex = ranks.indexOf(targetData.rank);
          sheet = getCollect(LIBRARY_SETTINGS.sheetId_rankchange);
          const roster = getCollect(LIBRARY_SETTINGS.rosterIds[0]);
          let isBlacklisted;
          insertLogRow = getLastRow(sheet);

          switch (inputData.rankchangetype) {
            case "Promotion":
              // Basic Checks
              if (targetData.status == "LOA") return `You cannot promote members who are on LOA: ${targetData.name}`;
              if (Number(targetData.infractions) !== 0) return `You cannot promote members with an active infraction: ${targetData.name}`;
              if (targetData.status == "Suspended") return `You cannot promote suspended members: ${targetData.name}`;
              if (roster.getRange(targetData.row, LIBRARY_SETTINGS.dataCols.blacklistEnd - 1).getDisplayValue().toLowerCase() == "false") return `${targetData.name} must complete all their requirements before promotion.`; 
              const promotionDestination = ranks[currentRankIndex + 1];
              if (!promotionDestination || currentRankIndex === ranks.length - 3) return `${targetData.name} cannot be promoted any further`;

              // Check if user is currently blacklisted
              isBlacklisted = isUserBlacklisted(targetData.playerId);
              if (isBlacklisted) return `${targetData.name} is currently blacklisted, you cannot promote them.\nTry again in ${Math.round((isBlacklisted - new Date().getTime()) / 86400000)} days`;

              // Check if google account exists
              try {
                DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).addViewer(targetData.email);
                DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).removeViewer(targetData.email);
              } catch(e) {
                console.log(e);
                return `${targetData.name} has blocked you or has deleted their google account.\nPlease try another Gmail address`;
              }

              // Check cooldown
              const lastRankChange = dateToMilliseconds(roster.getRange(targetData.row, LIBRARY_SETTINGS.dataCols.lastRankChange).getDisplayValue());
              const timeDiff = new Date().valueOf() - lastRankChange;
              if (timeDiff <= (LIBRARY_SETTINGS.cooldown_promotion * 86400000)) return `${targetData.name} must wait ${LIBRARY_SETTINGS.cooldown_promotion} days between Promotions`;

              // Check if the person has an open interview
              if (LIBRARY_SETTINGS.interviewRequired[currentRankIndex + 1].toString() !== "false") {
                const files = DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_interviews).getFiles();
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
                      file.moveTo(DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_closedInterviews));
                      hasInterview = true;
                    } catch(e) { continue }
                  }
                }
                if (hasInterview !== true) return `Could not find an interview under the name: "${targetData.name}"\nMake sure they have passed a ${promotionDestination} interview first.`;
              }

              rowDestination = getFirstRankRow(promotionDestination);
              if (rowDestination[0] == 0) return `Cannot promote ${targetData.name}, ${promotionDestination} has reached capacity`;
              targetData["newRank"] = promotionDestination;

              moveMember(targetData.row, rowDestination[0]);
              moveMember(firstRankRow[0], targetData.row);
              insertRankChangeLog(inputData, userData, targetData, promotionDestination, insertLogRow);
              protectRange("N", sheet, null, insertLogRow);

              if (LIBRARY_SETTINGS.lockdownEnabled.toString() === "false") {
                removeDocAccess(targetData.email);
                addDocAccess(currentRankIndex + 1, targetData.email);
              }
              break;
            case "Demotion":
              const demotionDestination = ranks[currentRankIndex - 1];
              if (!demotionDestination || currentRankIndex === 0) return `${targetData.name} cannot be demoted any further, consider a removal`;

              rowDestination = getFirstRankRow(demotionDestination);
              if (rowDestination[0] == 0) return `${demotionDestination} has reached capacity`;
              targetData["newRank"] = demotionDestination;

              // Check if google account exists
              try {
                DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).addViewer(targetData.email);
                DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).removeViewer(targetData.email);
              } catch(e) {
                console.log(e);
                return `${targetData.name} has blocked you or has deleted their google account.\nPlease try another Gmail address`;
              }

              moveMember(targetData.row, Number(rowDestination[0]));
              moveMember(firstRankRow[0], targetData.row);
              insertRankChangeLog(inputData, userData, targetData, demotionDestination, insertLogRow);
              protectRange("N", sheet, null, insertLogRow);

              // Only add doc access if no lockdown
              if (LIBRARY_SETTINGS.lockdownEnabled.toString() === "false") {
                removeDocAccess(targetData.email);
                addDocAccess(currentRankIndex - 1, targetData.email);
              }
              break;
            case "Removal":
              moveMember(targetData.row);
              moveMember(firstRankRow[0], targetData.row);
              insertRankChangeLog(inputData, userData, targetData, "D-Class", insertLogRow);
              protectRange("N", sheet, null, insertLogRow);
              removeDocAccess(targetData.email);
              break;
            case "Passed Interview":
              const newStaffDestination = ranks[0];
              rowDestination = getFirstRankRow(newStaffDestination);
              if (rowDestination[0] === 0) return `${newStaffDestination} has reached capacity`;

              // Check if user is currently blacklisted
              isBlacklisted = isUserBlacklisted(targetData.playerId);
              if (isBlacklisted) return `${targetData.name} is currently blacklisted, you cannot promote them.\nTry again in ${Math.round((isBlacklisted - new Date().getTime()) / 86400000)} days`;

              // Check if google account exists
              try {
                DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).addViewer(targetData.email);
                DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).removeViewer(targetData.email);
              } catch(e) {
                console.log(e);
                return `${targetData.name} has blocked you or has not linked the Email to a google account.\nPlease try another Gmail address`;
              }

              if (targetData.row) return "Cannot have duplicate members";

              // Check if the user has been gone for over 2 weeks (minimum cooldown)
              for (let i = insertLogRow - 1; i >= 7; i--) {
                const date = sheet.getRange(i, 3).getValue();
                const playerId = sheet.getRange(i, 5).getValue();
                const type = sheet.getRange(i, 8).getValue();
                const timeDiff = new Date().valueOf() - new Date(date.toString()).valueOf();

                if (timeDiff > 1210000000) break;
                if (type !== "Removal") continue;
                if (playerId !== targetData.playerId) continue;
                return `You must wait at least two weeks before rejoining the team`;
              }

              // Check if the person has an open interview
              if (LIBRARY_SETTINGS.interviewRequired[0].toString() !== "false" && LIBRARY_SETTINGS.folderId_interviews !== "") {
                const files = DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_interviews).getFiles();
                let hasInterview = false;
                while (files.hasNext() && !hasInterview) {
                  const file = files.next();
                  const fileName = file.getName();
                  if (fileName.includes(targetData.name) && fileName.includes("[PASSED]") && fileName.includes(newStaffDestination) && fileName.toLowerCase().includes(newStaffDestination.toLowerCase())) {
                    let wrongRank = LIBRARY_SETTINGS.ranks.some(rank => {
                      return rank.toLowerCase() !== newStaffDestination.toLowerCase() && fileName.toLowerCase().includes(rank.toLowerCase());
                    });

                    if (wrongRank) continue;

                    const owner = file.getOwner().getEmail();
                    if (userData.email === owner) {
                      file.setOwner("dontorro208@gmail.com");
                    } else {
                      const editors = file.getEditors();
                      editors.map(editor => editor.getEmail());

                      if (!editors.includes(userData.email)) continue;
                    }
                    try { 
                      file.moveTo(DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_closedInterviews));
                      hasInterview = true;
                    } catch(e) { continue }
                  }
                }
                if (hasInterview !== true) return `Could not find an interview under the name: "${targetData.name}"\nMake sure they have passed a ${newStaffDestination} interview first.`;
              }

              targetData["newRank"] = newStaffDestination;

              roster.getRange(rowDestination[0], LIBRARY_SETTINGS.dataCols.name, 1, 4).setValues([[targetData.name, targetData.playerId, targetData.discordId, targetData.email]]);

              // For MTFs, say "Passed Tryout" and not "Passed Interview"
              let passed = "Passed Interview";
              if (LIBRARY_SETTINGS.factionName.includes("MTF")) passed = "Passed Tryout";
              const dataToInsert = [[new Date(), targetData.name, targetData.playerId, targetData.discordId, "D-Class", passed, ranks[0], inputData.reason, "", userData.name, userData.playerId, userData.rank]];
              sheet.getRange(insertLogRow, LIBRARY_SETTINGS.dataCols.firstCol, 1, dataToInsert[0].length).setValues(dataToInsert);

              protectRange("N", sheet, null, insertLogRow);

              if (LIBRARY_SETTINGS.lockdownEnabled.toString() === "false") {
                removeDocAccess(targetData.email);
                addDocAccess(0, targetData.email);
              }
              break;
            }

          // Upon Rank Change => Wipe all supervisor mentions of this person
          if (!LIBRARY_SETTINGS.reqsDisabled) {
            for (let i = 0; i < roster.getMaxRows(); i++) {
              const supervisorPlayerId = roster.getRange(i, LIBRARY_SETTINGS.dataCols.supervisor_playerId).getValue();
              if (targetData.playerId === supervisorPlayerId) {
                roster.getRange(i, LIBRARY_SETTINGS.dataCols.supervisor_name, 1, 2).clearContent();
              }
            }
          }
          break;
        case "Infraction Log":
          if (threshold === false) {
            if (targetData.status == "Suspended") return `${targetData.name} is suspended, you cannot strike them. Consider a removal/blacklist`;
            sheet = getCollect(LIBRARY_SETTINGS.sheetId_infraction);
            insertLogRow = getLastRow(sheet);
            
            // few random checks
            if (!targetData.name || !targetData.playerId || !targetData.row) return "User not found";

            sheet.getRange(insertLogRow, LIBRARY_SETTINGS.dataCols.firstCol, 1, 12).setValues([[new Date(), targetData.name, targetData.playerId, targetData.discordId, targetData.rank, inputData.infraction_type, false, inputData.reason, "", userData.name, userData.playerId, userData.rank]]);
            protectRange("A", sheet, 9, insertLogRow);
            sendDiscordLog(inputData, targetData, userData);
          }
          break;
        case "LOA Log":
          console.log(inputData.end_date);
          const timeDiff = new Date().valueOf() - dateToMilliseconds(targetData.loaEnd);
          if (targetData.status == "Suspended") return `${targetData.name} is currently suspended, they cannot go on LOA.`;
          if (timeDiff < 0) return `${targetData.name} is already on LOA, you cannot log another one`;
          if (timeDiff <= (LIBRARY_SETTINGS.cooldown_loa * 86400000)) return `${targetData.name} must wait ${LIBRARY_SETTINGS.cooldown_loa} days between LOAs`;

          // few random checks
          if (!targetData.name || !targetData.playerId || !targetData.row) return "User not found";

          sheet = getCollect(LIBRARY_SETTINGS.sheetId_loa);
          insertLogRow = getLastRow(sheet);

          sheet.getRange(insertLogRow, LIBRARY_SETTINGS.dataCols.firstCol, 1, 10).setValues([[new Date(), targetData.name, targetData.playerId, targetData.discordId, inputData.end_date, inputData.reason, "", userData.name, userData.playerId, userData.rank]]);
          protectRange("N", sheet, null, insertLogRow);
          break;
        case "Blacklist":
          sheet = getCollect(LIBRARY_SETTINGS.sheetId_blacklist);
          insertLogRow = getLastRow(sheet);

          // few random checks
          if (!targetData.name || !targetData.playerId || !targetData.row) return "User not found";

          let appealable_bool;
          if (inputData.blacklist_appealable == 'Yes') { appealable_bool = true; } else { appealable_bool = false; }

          sheet.getRange(insertLogRow, LIBRARY_SETTINGS.dataCols.firstCol, 1, 13).setValues([[new Date(), targetData.name, targetData.playerId, targetData.discordId, inputData.blacklist_type, inputData.end_date, appealable_bool, false, inputData.reason, "", userData.name, userData.playerId, userData.rank]]);
          protectRange("A", sheet, 10, insertLogRow);

          if (inputData.blacklist_type === "Blacklist" && targetData.row) {
            sheet = getCollect(LIBRARY_SETTINGS.sheetId_rankchange);
            moveMember(targetData.row);
            inputData.rankchangetype = "Blacklisted";
            insertLogRow = getLastRow(sheet);

            moveMember(firstRankRow[0], targetData.row);
            insertRankChangeLog(inputData, userData, targetData, "D-Class", insertLogRow);
            protectRange("N", sheet, null, insertLogRow);
            removeDocAccess(targetData.email);
          }
          break;
        case "Requirement Log":
          if (!targetData.name || !targetData.playerId || !targetData.row) return "User not found";

          // Check if user completed req yet
          sheet = getCollect(LIBRARY_SETTINGS.rosterIds[LIBRARY_SETTINGS.rosterIds.length - 1]);
          const reqTitleRow = getFirstRankRow(targetData.rank, LIBRARY_SETTINGS.rosterIds.length - 1)[0] - 1;

          if (reqTitleRow <= 6) return "Requirement not found";

          // Get column where req is located
          for (let i = 8; i < sheet.getMaxColumns(); i++) {
            if (sheet.getRange(reqTitleRow, i).getValue() === inputData.reqName) {

              // Get row where req is located
              for (let j = reqTitleRow; j < sheet.getMaxRows(); j++) {
                if (sheet.getRange(j, LIBRARY_SETTINGS.dataCols.playerId).getValue() === targetData.playerId && sheet.getRange(j, i).getDisplayValue() == true) return `${targetData.name} has already completed this requirement`;
              }
            }
          }

          sheet = getCollect(LIBRARY_SETTINGS.sheetId_reqlogs);
          insertLogRow = getLastRow(sheet);

          // Insert log
          sheet.getRange(insertLogRow, LIBRARY_SETTINGS.dataCols.firstCol, 1, 11).setValues([[new Date(), targetData.name, targetData.playerId, targetData.discordId, targetData.rank, inputData.reqName, inputData.reason, "", userData.name, userData.playerId, userData.rank]]);
          protectRange("N", sheet, null, insertLogRow);
          break;
        case "Merit Log":
          if (!targetData.name || !targetData.playerId || !targetData.row) return "User not found";
          sheet = getCollect(LIBRARY_SETTINGS.sheetId_merit);
          insertLogRow = getLastRow(sheet);

          // Get meritCount
          inputData.meritCount = 0;
          for (meritAction of LIBRARY_SETTINGS.meritActions) {
            if (meritAction.title === inputData.meritAction) inputData.meritCount = meritAction.meritCount;
          }

          if (inputData.meritCount <= 0 || !inputData.meritCount) return "Invalid Merit Action";

          // Insert data
          sheet.getRange(insertLogRow, LIBRARY_SETTINGS.dataCols.firstCol, 1, 12).setValues([[new Date(), targetData.name, targetData.playerId, targetData.discordId, targetData.rank, inputData.meritAction, inputData.meritCount, inputData.reason, "", userData.name, userData.playerId, userData.rank]]);
          
          // Special Protect range
          protections = sheet.getRange(insertLogRow, 1, 1, 16).protect();

          protections.removeEditors(protections.getEditors());
          if (protections.canDomainEdit()) {
            protections.setDomainEdit(false);
          }
          break;
        case "Blacklist Appeal":
          sheet = getCollect(LIBRARY_SETTINGS.sheetId_blacklist);
          // Check if the given id corresponds to a log
          if (sheet.getRange(Number(inputData.log_id), 8).getValue() != '') {
            if (sheet.getRange(Number(inputData.log_id), 9).getValue() == true) {
              // Check if log is not appealed yet
              if (sheet.getRange(Number(inputData.log_id), 10).getValue() == false) {
                sheet.getRange(Number(inputData.log_id), 10).setValue(true);
                sheet.getRange(Number(inputData.log_id), 11).setValue(`[APPEALED ${inputData.reason}`);
                protectRange("S", sheet, 10, Number(inputData.log_id));

                targetData["name"] = sheet.getRange(Number(inputData.log_id), 4).getValue();
                targetData["playerId"] = sheet.getRange(Number(inputData.log_id), 5).getValue();
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
          sheet = getCollect(LIBRARY_SETTINGS.sheetId_infraction);
          // Check if the given id corresponds to a log
          if (sheet.getRange(Number(inputData.log_id), 8).getValue() != '') {
            // Check if log is not appealed yet
            if (sheet.getRange(Number(inputData.log_id), 9).getValue() == false) {
              sheet.getRange(Number(inputData.log_id), 9).setValue(true);
              sheet.getRange(Number(inputData.log_id), 10).setValue(`[APPEALED] ${inputData.reason}`);
              protectRange("S", sheet, 9, Number(inputData.log_id));

              targetData.name = sheet.getRange(Number(inputData.log_id), 4).getValue();
              targetData.playerId = sheet.getRange(Number(inputData.log_id), 5).getValue();
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
      response.push(["Log submitted", Number(targetData.infractions) + 1, LIBRARY_SETTINGS.threshold_num, LIBRARY_SETTINGS.threshold_action]);
    }

    return JSON.stringify(response);
  // Catch in case anything errors (notify mods)
  } catch(e) {
    sendDiscordError(e.toString(), "processLog");
    throw new Error(e);
  }
}