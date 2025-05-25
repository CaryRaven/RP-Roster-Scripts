/**
 * Process all submitted edits, currently supports:
 * Edit Name, Edit playerId, Edit discordID, Edit Email, Edit Specialization, Edit Note
 * 
 * @param {Object} inputData
 * @param {PropertyService.ScriptProperty} allowedStaff
 * @param {PropertyService.UserProperty} userData (optional: only for Specialization)
 * @returns {String}
 */
function processEdit(inputData, allowedStaff, userData = {}) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!inputData || typeof inputData !== "object") throw new Error("Do not run this function from the editor");
  if (!allowedStaff) throw new Error("No allowed staff list provided");

  try {
    let valid = false;
    switch (inputData.type) {
      case 'Edit Name':
        if (inputData.name != '' && inputData.current_user != '') valid = true;
        break;
      case 'Edit playerId':
        if (inputData.playerId != '' && inputData.current_user != '') valid = true;
        break;
      case 'Edit discordID':
        if (inputData.discordid != '' && inputData.current_user != '') valid = true;
        break;
      case 'Edit Email':
        if (inputData.email != '' && inputData.current_user != '') valid = true;
        break;
      case 'Edit Specialization':
        if (inputData.current_user != '') valid = true;
        break;
      case 'Edit Note':
        if (inputData.notes != '' && inputData.current_user != '') valid = true;
        break;
    }

    valid = filterQuotes(inputData);

    if (valid !== true) return "Do not attempt to avoid answer validation";

    const ranks = LIBRARY_SETTINGS.ranks;
    const targetData = getUserData(inputData.current_user, 5);
    const roster = getCollect(LIBRARY_SETTINGS.rosterIds[0]);

    if (!targetData.row) return "User not found";
    if (ranks[ranks.length - 1].includes(targetData.rank) || ranks[ranks.length - 2].includes(targetData.rank)) return "You cannot manage Senior CL4 members from this menu";
    if (allowedStaff.includes(inputData.email) || allowedStaff.includes(targetData.email)) return "You cannot manage Staff from this menu";

    switch (inputData.type) {
      case "Edit Name":
        roster.getRange(targetData.row, LIBRARY_SETTINGS.dataCols.name).setValue(inputData.name);
        break;
      case "Edit playerId":
        roster.getRange(targetData.row, LIBRARY_SETTINGS.dataCols.playerId).setValue(inputData.playerId);
        break;
      case "Edit discordID":
        roster.getRange(targetData.row, LIBRARY_SETTINGS.dataCols.discordId).setValue(inputData.discordid);
        break;
      case "Edit Email":
        if (LIBRARY_SETTINGS.lockdownEnabled.toString() === "false") {
          removeDocAccess(targetData.email);
          addDocAccess(ranks.indexOf(targetData.rank), inputData.email);
        }

        // Check if google account exists
        try {
          DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).addViewer(targetData.email);
          DriveApp.getFolderById(LIBRARY_SETTINGS.folderId_publicDocs).removeViewer(targetData.email);
        } catch(e) {
          console.log(e);
          return "This user has blocked you or has deleted their google account.\nPlease try another Gmail address";
        }

        roster.getRange(targetData.row, LIBRARY_SETTINGS.dataCols.email).setValue(inputData.email);
        break;
      case "Edit Specialization":
        let found = false;
        LIBRARY_SETTINGS.specializations.forEach(spec => {
          if (spec.title == inputData.specialization) {
            const r = roster.getRange(targetData.row, LIBRARY_SETTINGS.dataCols.specialization);
            r.setValue(spec.title);
            r.clearNote();
            r.setNote(spec.desc);
            found = true;

            inputData.title = spec.title;
            inputData.desc = spec.desc;
            inputData.type = "Edit Specialization";
            sendDiscordLog(inputData, targetData, userData);
          }
        });
        if (!found) return "Specialization not found";
        break;
      case "Edit Note":
        roster.getRange(targetData.row, LIBRARY_SETTINGS.dataCols.notes).setValue(inputData.notes);
        break;
    }

    return "Information Edited";
  } catch(e) {
    sendDiscordError(e.toString(), "processEdit");
    throw new Error(e);
  }
}