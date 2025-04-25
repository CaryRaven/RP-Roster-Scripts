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
    // Editing existing action
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
    for (let j = 7; j <= 104; j += 2) {
      if (sheet.getRange(j, 17).getValue() === editTitle) {
        sheet.getRange(j, 17).setValue(title);
        sheet.getRange(j, 18).setValue(desc);
        sheet.getRange(j, 19).setValue(meritCount);
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

    // Add to sheet
    for (let k = 7; k <= 104; k += 2) {
      if (sheet.getRange(k, 17).getValue() === "") {
        sheet.getRange(k, 17).setValue(title);
        sheet.getRange(k, 18).setValue(desc);
        sheet.getRange(k, 19).setValue(meritCount);
        break;
      }
    }

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
  let deletedActionRow;
  let moveActionRow;
  for (let i = 7; i <= 104; i += 2) {

    // Location of action being deleted
    if (sheet.getRange(i, 17).getValue() === title) {
      deletedActionRow = i;
    }

    // Location of action to move to the deleted row to prevent any ugly gaps
    if (sheet.getRange(i, 17).getValue() === "") {
      moveActionRow = i - 2;
      break;
    }
  }

  // Remove/Move from sheet
  if (deletedActionRow !== moveActionRow) {
    sheet.getRange(deletedActionRow, 17).setValue(sheet.getRange(moveActionRow, 17).getValue());
    sheet.getRange(deletedActionRow, 18).setValue(sheet.getRange(moveActionRow, 18).getValue());
    sheet.getRange(deletedActionRow, 19).setValue(sheet.getRange(moveActionRow, 19).getValue());
  }
  sheet.getRange(moveActionRow, 17).clearContent();
  sheet.getRange(moveActionRow, 18).clearContent();
  sheet.getRange(moveActionRow, 19).clearContent();

  // Remove from settings
  LIBRARY_SETTINGS.meritActions.splice(actionIndex, 1);

  return ["Action Deleted", LIBRARY_SETTINGS];
}