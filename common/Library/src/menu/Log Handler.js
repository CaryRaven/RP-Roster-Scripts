/**
 * Process all submitted logs, currently supports:
 * Rank Change (promo, demo, removal, pass interview), Infraction Log, LOA Log, Blacklist (Blacklist & Suspension), Infraction Appeal, Blacklist Appeal, New Member
 * 
 * @param {Object} inputData - Data input by the user
 * @param {PropertyService.UserProperty} userData
 * @param {PropertyService.ScriptProperty} allowedStaff
 * @param {Boolean} threshold (optional) - Is this function run because of the threshold?
 * @param {Boolean} justCheck - If the function should only perform the checks, and not process the log.
 * @returns {String}
 */
function processLog(inputData, userData, allowedStaff, threshold = false, justCheck = false, accessType = null) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!inputData || typeof inputData !== "object") throw new Error("Do not run this function from the editor");
  if (!userData) throw new Error("No userdata provided");
  if (!allowedStaff) throw new Error("No allowed staff list provided");

  // Day in milliseconds
  const day = 86400000;

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
        if (inputData.reason != '' && inputData.rankchangetype != '') valid = true;
        if (inputData.rankchangetype == "Transfer") { inputData.branch != "" ? valid = true : valid = false; }
        break;
      case 'Infraction Log':
        if (inputData.reason != '' && inputData.infraction_type != '') valid = true;
        break;
      case 'LOA Log':
        if (inputData.reason != '' && inputData.end_date != '' && inputData.start_date != '') valid = true;
        break;
      case 'Blacklist':
        if (inputData.end_date != '' && inputData.reason != '' && inputData.blacklist_appealable != '') {
          switch (inputData.blacklist_type) {
            case "Suspension":
              valid = true;
              break;
            case "Blacklist":
              if (inputData.name != '' && inputData.playerId != '' && inputData.discordId != '' && inputData.blacklist_type != '') valid = true;
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
      case "End LOA Early":
        valid = true;
        break;
      default:
        break;
    }

    // Convert to an array so it's iterable, just in case
    if (!Array.isArray(inputData.users)) inputData.users = [inputData.users];

    // For appeals, no users are provided -> get the first name you find (nothing will be done with it)
    if (inputData.type.includes("Appeal")) {
      const roster = getCollect(LIBRARY_SETTINGS.rosterIds[0]);

      for (let i = 6; i <= roster.getMaxRows(); i++) {
        const name = roster.getRange(i, 5).getValue();
        if (name !== "") inputData.users = [name];
      }
    }

    if (inputData.users.length > 10) return "You cannot select more than 10 members at once";

    if (valid !== true) return "Do not attempt to avoid answer validation";

    // also filters special chars ("{" etc...)
    valid = filterQuotes(inputData);
    if (valid !== true) return "Do not attempt to avoid answer validation";
    const ranks = LIBRARY_SETTINGS.ranks;

    // Only do all these calculations when needed (runtime reduction)
    if (inputData.type != "Infraction Appeal" && inputData.type != "Blacklist Appeal") {
      for (user of inputData.users) {
        let targetData_check = accessType  === "visitor" ? getUserData(inputData.email) : getUserData(user, 5);

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
          targetData_check.discordId = inputData.discordId;
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

    // Abort function if just checking
    if (justCheck) return;

    // Array of responses to send back -> termine whether or not the infraction threshold applies etc...
    let response = [];

    // used when moving members around
    let targetData;

    for (user of inputData.users) {
      targetData = getUserData(user, 5);
      let dataToInsert;

      // Data was manually input
      if (inputData.type_check == "New Member" || inputData.blacklist_type == "Blacklist") {
        targetData.name = inputData.name;
        targetData.playerId = inputData.playerId;
        targetData.discordId = inputData.discordId;
        targetData.email = inputData.email
        targetData.rank = ranks[0];
      }

      console.log(targetData);
      let firstRankRow;
      
      // used when moving members around
      firstRankRow = getFirstRankRow(targetData.rank);
      firstRankRow[0] = firstRankRow[0] == 0 ? getLastRankRow(targetData.rank) : firstRankRow[0] - 1;

      let sheet;
      // Main case
      switch (inputData.type) {
        case "Rank Change":
          let rowDestination;
          let currentRankIndex = ranks.indexOf(targetData.rank);
          sheet = getCollect(LIBRARY_SETTINGS.sheetId_rankchange);
          const roster = getCollect(LIBRARY_SETTINGS.rosterIds[0]);
          let isBlacklisted;

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

              // Move person on roster
              moveMember(targetData.row, rowDestination[0]);
              moveMember(firstRankRow[0], targetData.row);

              // Insert the log
              dataToInsert = [[new Date(), targetData.name, targetData.playerId, targetData.discordId, targetData.rank, inputData.rankchangetype, promotionDestination, inputData.reason, "", userData.name, userData.playerId, userData.rank]];
              addLog(sheet, [[3, 10], [12, 14]], dataToInsert);
              protectRange("N", sheet, null);

              // Only add doc access if lockdown disabled
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
              dataToInsert = [[new Date(), targetData.name, targetData.playerId, targetData.discordId, targetData.rank, inputData.rankchangetype, demotionDestination, inputData.reason, "", userData.name, userData.playerId, userData.rank]];
              addLog(sheet, [[3, 10], [12, 14]], dataToInsert);
              protectRange("N", sheet, null);

              // Only add doc access if no lockdown
              if (LIBRARY_SETTINGS.lockdownEnabled.toString() === "false") {
                removeDocAccess(targetData.email);
                addDocAccess(currentRankIndex - 1, targetData.email);
              }
              break;
            case "Removal":
              moveMember(targetData.row);
              if (targetData.row !== firstRankRow[0]) moveMember(firstRankRow[0], targetData.row);
              dataToInsert = [[new Date(), targetData.name, targetData.playerId, targetData.discordId, targetData.rank, inputData.rankchangetype, "D-class", inputData.reason, "", userData.name, userData.playerId, userData.rank]];
              addLog(sheet, [[3, 10], [12, 14]], dataToInsert);
              protectRange("N", sheet, null);
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
              for (let i = 7; i < sheet.getMaxRows(); i++) {
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

              dataToInsert = [[new Date(), targetData.name, targetData.playerId, targetData.discordId, "D-Class", passed, ranks[0], inputData.reason, "", userData.name, userData.playerId, userData.rank]];
              addLog(sheet, [[3, 10], [12, 14]], dataToInsert);
              protectRange("N", sheet, null);

              if (LIBRARY_SETTINGS.lockdownEnabled.toString() === "false") {
                removeDocAccess(targetData.email);
                addDocAccess(0, targetData.email);
              }
              break;
            }

          // Upon Rank Change => Wipe all supervisor mentions of this person
          if (!LIBRARY_SETTINGS.reqsDisabled) {
            for (let i = 11; i < roster.getMaxRows(); i++) {
              const supervisorPlayerId = roster.getRange(i, LIBRARY_SETTINGS.dataCols.supervisor_playerId).getValue();
              if (targetData.playerId === supervisorPlayerId) {
                roster.getRange(i, LIBRARY_SETTINGS.dataCols.supervisor_name, 1, 2).clearContent();
              }
            }
          }
          break;
        case "Infraction Log":
          // Don't log again if triggered by threshold
          if (threshold === false) {
            if (targetData.status == "Suspended") return `${targetData.name} is suspended, you cannot strike them. Consider a removal/blacklist`;
            sheet = getCollect(LIBRARY_SETTINGS.sheetId_infraction);

            if (!targetData.name || !targetData.playerId || !targetData.row) return "User not found";

            dataToInsert = [[new Date(), targetData.name, targetData.playerId, targetData.discordId, targetData.rank, inputData.infraction_type, false, inputData.reason, "", userData.name, userData.playerId, userData.rank]];
            addLog(sheet, [[3, 10], [12, 14]], dataToInsert, [9]);
            protectRange("A", sheet, 9);
            sendDiscordLog(inputData, targetData, userData);
          }
          break;
        case "LOA Log":
          if (!targetData.name || !targetData.playerId || !targetData.row) return "User not found";
          if (targetData.status == "Suspended") return `${targetData.name} is currently suspended, they cannot go on LOA.`;

          let end_date_ms = dateToMilliseconds(formatDate(inputData.end_date));
          let start_date_ms = dateToMilliseconds(formatDate(inputData.start_date));
          if (start_date_ms >= end_date_ms) return "Start date cannot be on or after end date";
          if (end_date_ms - start_date_ms > (30 * day)) return "LOAs cannot be longer than 30 days";

          const now_ms = new Date().valueOf();
          if (start_date_ms < now_ms - day) return "Start date must be today or later";

          const timeDiff = now_ms - dateToMilliseconds(targetData.loaEnd);
          if (timeDiff <= (LIBRARY_SETTINGS.cooldown_loa * day)) return `${targetData.name} must wait ${LIBRARY_SETTINGS.cooldown_loa} days between LOAs`;
          if (timeDiff < 0) return `${targetData.name} is already on LOA, you cannot log another one`;

          // 30 days from now
          const date_in_30 = new Date(new Date().valueOf() + (30 * day)).valueOf();
          if (start_date_ms > date_in_30) return "You cannot plan an LOA more than 30 days in advance";

          // Cannot have two LOAs planned at once
          sheet = getCollect(LIBRARY_SETTINGS.sheetId_loa);
          for (let i = 7; i < sheet.getMaxRows(); i++) {
            const log_date_ms = dateToMilliseconds(sheet.getRange(i, 3).getDisplayValue());
            if (now_ms - log_date_ms >= (60 * day)) break;

            const start_date = sheet.getRange(i, 7).getDisplayValue();
            start_date_ms = dateToMilliseconds(start_date);
            const playerId = sheet.getRange(i, 5).getDisplayValue();
            if (start_date_ms >= now_ms && playerId == targetData.playerId) return `${targetData.name} already has an LOA planned on ${start_date}`;
          }

          // Insert log
          dataToInsert = [[new Date(), targetData.name, targetData.playerId, targetData.discordId, inputData.start_date, inputData.end_date, false, inputData.reason, "", userData.name, userData.playerId, userData.rank]];
          addLog(sheet, [[3, 10], [12, 14]], dataToInsert, [9]);
          protectRange("A", sheet, 9);
          break;
        case "Blacklist":
          sheet = getCollect(LIBRARY_SETTINGS.sheetId_blacklist);
          // few random checks
          if (!targetData.name || !targetData.playerId || !targetData.row) return "User not found";

          let appealable_bool;
          appealable_bool = inputData.blacklist_appealable == 'Yes' ? appealable_bool = true: appealable_bool = false;

          dataToInsert = [[new Date(), targetData.name, targetData.playerId, targetData.discordId, inputData.blacklist_type, inputData.end_date, appealable_bool, false, inputData.reason, "", userData.name, userData.playerId, userData.rank]];
          addLog(sheet, [[3, 11], [13, 15]], dataToInsert, [9, 10]);
          protectRange("A", sheet, 10);

          if (inputData.blacklist_type === "Blacklist" && targetData.row) {
            sheet = getCollect(LIBRARY_SETTINGS.sheetId_rankchange);
            moveMember(targetData.row);
            inputData.rankchangetype = "Blacklisted";

            moveMember(firstRankRow[0], targetData.row);
            dataToInsert = [[new Date(), targetData.name, targetData.playerId, targetData.discordId, targetData.rank, inputData.rankchangetype, "D-class", inputData.reason, "", userData.name, userData.playerId, userData.rank]];
            addLog(sheet, [[3, 10], [12, 14]], dataToInsert);
            protectRange("N", sheet, null);
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

          // Insert log
          dataToInsert = [[new Date(), targetData.name, targetData.playerId, targetData.discordId, targetData.rank, inputData.reqName, inputData.reason, "", userData.name, userData.playerId, userData.rank]];
          addLog(sheet, [[3, 9], [11, 13]], dataToInsert);
          protectRange("N", sheet, null);
          break;
        case "Merit Log":
          if (!targetData.name || !targetData.playerId || !targetData.row) return "User not found";
          sheet = getCollect(LIBRARY_SETTINGS.sheetId_merit);

          // Get meritCount
          inputData.meritCount = 0;
          for (meritAction of LIBRARY_SETTINGS.meritActions) {
            if (meritAction.title === inputData.meritAction) inputData.meritCount = meritAction.meritCount;
          }

          if (inputData.meritCount <= 0 || !inputData.meritCount) return "Invalid Merit Action";

          // Insert log
          // :hardcode borderpairs
          dataToInsert = [[new Date(), targetData.name, targetData.playerId, targetData.discordId, targetData.rank, inputData.meritAction, inputData.meritCount, inputData.reason, "", userData.name, userData.playerId, userData.rank]];
          addLog(sheet, [[3, 10], [12, 14]], dataToInsert, [], 12 + LIBRARY_SETTINGS.meritActions.length)
          
          // Special Protect range
          protections = sheet.getRange(12 + LIBRARY_SETTINGS.meritActions.length, 1, 1, 16).protect();

          protections.removeEditors(protections.getEditors());
          if (protections.canDomainEdit()) {
            protections.setDomainEdit(false);
          }
          break;
        case "End LOA Early":
          if (!targetData.name || !targetData.playerId || !targetData.row) return "User not found";
          sheet = getCollect(LIBRARY_SETTINGS.sheetId_loa);
          let found = false;

          for (let i = 7; i < sheet.getMaxRows(); i++) {
            const log_date_ms = dateToMilliseconds(sheet.getRange(i, 3).getDisplayValue());
            const now_ms = new Date().valueOf();
            if (now_ms - log_date_ms >= (60 * day)) return `Could not find a matching LOA for ${targetData.name}`;

            const playerId = sheet.getRange(i, 5).getDisplayValue();
            if (playerId !== targetData.playerId) continue;

            const end_date_ms = dateToMilliseconds(sheet.getRange(i, 8).getDisplayValue());
            const early_check = sheet.getRange(i, 9);
            if (early_check.getValue() == true) continue;

            // Found latest LOA of member
            if (end_date_ms > now_ms) {
              early_check.setValue(true);
              protectRange("S", sheet, 9, i);
              found = true;
              break;
            }
          }

          if (!found) return `Could not find a matching LOA for ${targetData.name}`;
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

          sendDiscordLog(inputData, targetData, userData);
          return JSON.stringify(["Blacklist Appealed", Number(targetData.infractions) + 1, LIBRARY_SETTINGS.threshold_num, LIBRARY_SETTINGS.threshold_action]);
        case "Infraction Appeal":
          console.log("Appealing Infraction");
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

          sendDiscordLog(inputData, targetData, userData);
          return JSON.stringify(["Infraction Appealed", Number(targetData.infractions) + 1, LIBRARY_SETTINGS.threshold_num, LIBRARY_SETTINGS.threshold_action]);
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