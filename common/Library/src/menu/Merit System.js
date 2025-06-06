/**
 * Add or Edit a merit action
 * @param {String} title - new title
 * @param {String} desc - new description
 * @param {Number} meritCount - new amount of merits
 * @param {String} [editTtitle = null] - If editing an action, the previous title of the action
 * 
 * @returns {String|Array}
 */
function merit_manageAction(title, desc, meritCount, editTitle) {
  if (!isInit) throw new Error("Library is not yet initialized");
  
  const actions = LIBRARY_SETTINGS.meritActions;
  meritCount = Number(meritCount);
  let message = "Added new Merit Action";
  const sheet = getCollect(LIBRARY_SETTINGS.sheetId_merit);
  if (meritCount < 1 || meritCount > 5) return "Invalid Merit Count";

  if (editTitle) {
    // If editing existing action
    let actionIndex;
    for (let i = 0; i < actions.length; i++) {
      if (actions[i].title === editTitle) {
        actionIndex = i;
        break;
      }
    }

    const correspondingAction = actions[actionIndex];
    if (correspondingAction.title === title && correspondingAction.desc === desc && correspondingAction.meritCount === meritCount) return "Nothing has changed";

    message = "Edited Merit Action";

    // Change on sheet
    for (let j = 7; j <= 57; j++) {
      if (sheet.getRange(j, 3).getValue() === editTitle) {
        sheet.getRange(j, 3).setValue(title);
        sheet.getRange(j, 6).setValue(desc);
        sheet.getRange(j, 14).setValue(meritCount);
        break;
      }
    }

    LIBRARY_SETTINGS.meritActions.splice(actionIndex, 1, {
      title: title,
      desc: desc,
      meritCount: meritCount
    });
  } else {
    // Adding new action
    if (actions.length >= 50) return "Exceeding Action Limit (50)";
    for (action of actions) {
      if (title === action.title) return "Merit Action already exists";
    }

    // Add row to sheet + styling
    const newLoc = 6 + LIBRARY_SETTINGS.meritActions.length + 1;
    sheet.insertRowAfter(newLoc - 1);
    sheet.getRange(newLoc, 3, 1, 12)
      .setBorder(null, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK)
      .setBorder(true, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID)
      .setBackground("#666666")
      .setFontColor("white")
      .setFontFamily("Lexend")
      .setFontSize(12);
    
    // Set border style of top to thick in case of first action
    if (LIBRARY_SETTINGS.meritActions.length === 0) {
      sheet.getRange(newLoc, 3, 1, 12).setBorder(true, null, null, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    }

    sheet.setRowHeight(newLoc, 35);

    // Merge columns together
    sheet.getRange(newLoc, 3, 1, 3).merge();
    sheet.getRange(newLoc, 6, 1, 8).merge();

    // Add the data
    sheet.getRange(newLoc, 3).setValue(title);
    sheet.getRange(newLoc, 6).setValue(desc);
    sheet.getRange(newLoc, 14).setValue(meritCount);

    // Add to settings
    LIBRARY_SETTINGS.meritActions.push({
      title: title,
      desc: desc,
      meritCount: meritCount
    });
  }

  return [message, LIBRARY_SETTINGS];
}

/**
 * Remove a merit action from the list & roster
 * @param {String} title
 * @returns {String|Array}
 * 
 * @throws {Error} if the library is not initialized or if no title was provided
 */
function merit_removeAction(title) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!title || typeof title !== "string") throw new Error("Invalid title");

  const actions = LIBRARY_SETTINGS.meritActions;
  const sheet = getCollect(LIBRARY_SETTINGS.sheetId_merit);
  let actionIndex;

  // Get index of title
  for (let i = 0; i < actions.length; i++) {
    if (actions[i].title === title) {
      actionIndex = i;
      break;
    }
  }

  if (actionIndex < 0) return "Invalid Title";

  // Get location on sheet
  for (let i = 7; i <= 104; i += 2) {
    // Delete row
    if (sheet.getRange(i, 3).getValue() === title) {
      sheet.deleteRow(i);
      if (i === 7) sheet.getRange(7, 3, 1, 12).setBorder(true, null, null, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      break;
    }
  }

  // Remove from settings
  LIBRARY_SETTINGS.meritActions.splice(actionIndex, 1);

  return ["Deleted", LIBRARY_SETTINGS];
}