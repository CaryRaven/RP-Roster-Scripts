function ProcessInputEdits(inputData) {
  if (!inputData) throw new Error("Do not run this function from the editor");

  let valid = false;
  switch (inputData.type) {
    case 'Edit Name':
      if (inputData.name != '' && inputData.current_email != '') valid = true;
      break;
    case 'Edit steamID':
      if (inputData.steamid != '' && inputData.current_email != '') valid = true;
      break;
    case 'Edit dicsordID':
      if (inputData.discordid != '' && inputData.current_email != '') valid = true;
      break;
    case 'Edit Email':
      if (inputData.email != '' && inputData.current_email != '') valid = true;
      break;
    case 'Edit Specialization':
      if (inputData.current_email != '' && inputData.specialization != '') valid = true;
      break;
    case 'Edit Note':
      if (inputData.notes != '' && inputData.current_email != '') valid = true;
      break;
  }

  if (inputData.current_email.includes('"') || inputData.current_email.includes("'") || inputData.current_email.includes("`")
    || inputData.name.includes('"') || inputData.name.includes("'") || inputData.name.includes("`")
    || inputData.discordid.includes('"') || inputData.discordid.includes("'") || inputData.discordid.includes("`")
    || inputData.email.includes('"') || inputData.email.includes("'") || inputData.email.includes("`")
    || inputData.notes.includes('"') || inputData.notes.includes("'") || inputData.notes.includes("`")
    || inputData.steamid.includes('"') || inputData.steamid.includes("'") || inputData.steamid.includes("`")
    || inputData.specialization.includes('"') || inputData.specialization.includes("'") || inputData.specialization.includes("`")
  ) valid = false;

  if (valid !== true) return "Do not attempt to avoid answer validation";

  const ranks = JSON.parse(PropertiesService.getScriptProperties().getProperty("ranks"));
  const allowedStaff = JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff"));
  const targetData = GetUserData(inputData.current_email);
  const roster = getCollect(2063800821);

  if (!targetData.row) return "User not found";
  if (ranks[3].includes(targetData.rank) || ranks[2].includes(targetData.rank)) return "You cannot manage Senior CL4 members from this menu";
  if (allowedStaff.includes(inputData.email) || allowedStaff.includes(targetData.email)) return "You cannot manage Staff from this menu";

  switch (inputData.type) {
    case "Edit Name":
      roster.getRange(targetData.row, 5).setValue(inputData.name);
      break;
    case "Edit steamID":
      roster.getRange(targetData.row, 6).setValue(inputData.steamid);
      break;
    case "Edit discordID":
      roster.getRange(targetData.row, 7).setValue(inputData.discordid);
      break;
    case "Edit Email":
      roster.getRange(targetData.row, 8).setValue(inputData.email);
      const folders = JSON.parse(PropertiesService.getScriptProperties().getProperty("folders"));
      const ranks = JSON.parse(PropertiesService.getScriptProperties().getProperty("ranks"));
      RemoveDocAccess(folders, inputData.current_email);
      AddDocAccess(folders[ranks.indexOf(targetData.rank)], inputData.email);
      break;
    case "Edit Specialization":
      roster.getRange(targetData.row, 12).setValue(inputData.specialization);
      break;
    case "Edit Note":
      roster.getRange(targetData.row, 17).setValue(inputData.notes);
      break;
  }

  return "Information Edited";
}
