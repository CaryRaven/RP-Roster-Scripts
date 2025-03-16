/**
 * Process all submitted edits, currently supports:
 * Edit Name, Edit steamID, Edit discordID, Edit Email, Edit Specialization, Edit Note
 * 
 * @param {Object} inputData
 * @param {PropertyService.ScriptProperty} allowedStaff
 * @param {PropertyService.ScriptProperty} lockdown
 * @returns {String}
 */
function processEdit(inputData, allowedStaff, lockdown) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!inputData || typeof inputData !== "object") throw new Error("Do not run this function from the editor");
  if (!allowedStaff) throw new Error("No allowed staff list provided");
  if (!lockdown) throw new Error("No valid lockdown time provided");

  let valid = false;
  switch (inputData.type) {
    case 'Edit Name':
      if (inputData.name != '' && inputData.current_email != '') valid = true;
      break;
    case 'Edit steamID':
      if (inputData.steamid != '' && inputData.current_email != '') valid = true;
      break;
    case 'Edit discordID':
      if (inputData.discordid != '' && inputData.current_email != '') valid = true;
      break;
    case 'Edit Email':
      if (inputData.email != '' && inputData.current_email != '') valid = true;
      break;
    case 'Edit Specialization':
      if (inputData.current_email != '') valid = true;
      break;
    case 'Edit Note':
      if (inputData.notes != '' && inputData.current_email != '') valid = true;
      break;
  }

  valid = filterQuotes(inputData);

  if (valid !== true) return "Do not attempt to avoid answer validation";

  const ranks = LIBRARY_SETTINGS.ranks;
  const targetData = getUserData(inputData.current_email);
  const roster = getCollect(LIBRARY_SETTINGS.rosterIds[0]);

  if (!targetData.row) return "User not found";
  if (ranks[ranks.length - 1].includes(targetData.rank) || ranks[ranks.length - 2].includes(targetData.rank)) return "You cannot manage Senior CL4 members from this menu";
  if (allowedStaff.includes(inputData.email) || allowedStaff.includes(targetData.email)) return "You cannot manage Staff from this menu";

  switch (inputData.type) {
    case "Edit Name":
      roster.getRange(targetData.row, LIBRARY_SETTINGS.dataCols.name).setValue(inputData.name);
      break;
    case "Edit steamID":
      roster.getRange(targetData.row, LIBRARY_SETTINGS.dataCols.steamId).setValue(inputData.steamid);
      break;
    case "Edit discordID":
      roster.getRange(targetData.row, LIBRARY_SETTINGS.dataCols.discordId).setValue(inputData.discordid);
      break;
    case "Edit Email":
      if (lockdown === "false") {
        removeDocAccess(inputData.current_email);
        addDocAccess(ranks.indexOf(targetData.rank), inputData.email);
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
        }
      });
      if (!found) return "Specialization not found";
      break;
    case "Edit Note":
      roster.getRange(targetData.row, LIBRARY_SETTINGS.dataCols.notes).setValue(inputData.notes);
      break;
  }

  return "Information Edited";
}