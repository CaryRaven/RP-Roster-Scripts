const types = ["Backlog", "In Progress", "Completed"];

/**
 * @returns {String}
 */
function task_add(inputData) {
  const s = getCollect(LIBRARY_SETTINGS.sheetId_task);
  let loc = task_getEmptyRow(s, "Backlog");
  let endLoc = task_getLastRow(s, "Backlog");
  console.log(`End Loc: ${endLoc}\nLoc: ${loc}`);
  if (!endLoc) return;

  // If there are no more free slots in a type
  if (!loc) {
    s.insertRowAfter(endLoc);
    loc = endLoc + 1;

    // Style new row
    [[3, 8], [10, 14]].forEach(cellpair => {
      let numcols = (cellpair[1] - cellpair[0]) + 1;
      s.getRange(loc, cellpair[0], 1, numcols).setBorder(null, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      s.getRange(loc, cellpair[0], 1, numcols).setBorder(true, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
    });
  }

  s.getRange(loc, 2, 1, 7).setValues([["Backlog", Utilities.formatDate(new Date(), "GMT", 'dd MMMM yyyy'), inputData.deadline, inputData.title, inputData.description, "", inputData.priority]]);
  inputData.deadline = new Date(inputData.deadline);
  task_sendDiscordMessage("New", inputData);
  return "Task Added";
}

/**
 * Distributer of the task system, manages all interactions apart from adding a new task
 * @param {Object} sheet - Sheet object, has to be provided on spreadsheet side
 * @param {Object} range - range object, has to be provided on spreadsheet side
 * @returns {String|Void|Array[4]}
 */ 
function task_manager(sheet, range, oldValue) {
  const col = range.getColumn();
  const row = range.getRow();
  const sheetID = sheet.getSheetId();

  console.log(col);

  // Checks
  if (sheetID !== LIBRARY_SETTINGS.sheetId_task || LIBRARY_SETTINGS.rosterIds.includes(sheetID)) return;
  if (range.getValue() === false) range.setValue(false);

  if (!types.includes(sheet.getRange(row, 2).getValue())) {
    range.clearContent();
    return "This is not a task";
  }
  if (sheet.getRange(row, 3).getValue() == "") {
    range.setValue(false);
    return "This task is empty";
  }

  if (types[2].includes(sheet.getRange(row, 2).getValue())) {
    range.setValue(false);
    return "You cannot edit a completed task";
  }

  const title = sheet.getRange(row, 5).getValue();

  switch (col) {
    case 5: // Editing title
      if (range.getValue().length > 30 || range.getValue() === "") {
        range.setValue(oldValue);
        return "Invalid Title";
      }

      return "Title Edited";

    case 6: // Editing description
      if (range.getValue().length > 1500 || range.getValue() === "") {
        range.setValue(oldValue);
        return "Invalid Description";
      }

      return "Description Edited";

    case 10: // Assigning
      range.setValue(false);
      return ["Assign", row, col, title];

    case 11: // Cycling status
      const r = task_cycleStatus(row);

      if (r) return r;
      return;

    case 12: // Postponing
      range.setValue(false);
      return ["Postpone", row, col, title];

    case 13: // Changing priority
      range.setValue(false);
      return ["Priority", row, col, title];

    case 14: // Deleting
      const inputData = task_delete(row);
      if (typeof inputData !== "object") return inputData.toString();

      task_sendDiscordMessage("Delete", inputData);
      task_isAssigned();
      return;

    default:
      return;
  }
}

/**
 * Open a modal Dialog for the task manager
 */
function task_openFile(type, row, col, title) {
  if (!type) throw new Error("Do not run this function from the editor");

  const taskManager = getHtmlTaskManager();
  template = HtmlService.createTemplate(taskManager);
  template.row = row;
  template.col = col;
  template.title = title;
  template.type = type
  const eval = template.evaluate();
  SpreadsheetApp.getUi().showModalDialog(eval.setWidth(600).setHeight(800), `${type} ${type === "Assign" ? "to" : ""} Task`);
}
 
 /**
  * Get the first empty row a certain type of task
  * @param {Object} s - Sheet object, use getCollect to extract it
  * @param {String} type - Backlog, In Progress or Completed
  * @returns {Number}
  */
function task_getEmptyRow(s, type) {
  if (!isInit) throw new Error("Library is not initialized yet");
  if (!s || !type) throw new Error("Do not run this function from the editor");
  const total_rows = s.getMaxRows();
  let r = s.getRange(10, 2, total_rows, 1).getValues();

  for (let i = 10; i <= total_rows; i++) {
    let taskType = r[i - 10][0];
    if (s.getRange(i, 3).getValue() === "" && taskType == type) return i;
  }
  return undefined;
}

 /**
  * Get the last row of a certain type of task
  * @param {Object} s - Sheet object, use RosterService.getCollect to extract it
  * @param {String} type - Backlog, In Progress or Completed
  * @returns {Number}
  */
function task_getLastRow(s, type) {
  if (!isInit) throw new Error("Library is not initialized yet");
  if (!s || !type) throw new Error("Do not run this function from the editor");
  let r = s.getRange(9, 2, s.getMaxRows(), 1).getValues();
  const total_rows = s.getMaxRows();

  for (let i = 10; i <= total_rows; i++) {
    let taskType = r[i - 9][0];
    if (taskType !== type && r[i - 10][0] == type) return i - 1;
  }
  return undefined;
}

 /**
  * Get the first row of a certain type of task
  * @param {Object} s - Sheet object, use RosterService.getCollect to extract it
  * @param {String} type - Backlog, In Progress or Completed
  */
function task_getFirstRow(s, type) {
  if (!s || !type) throw new Error("Do not run this function from the editor");
  let r = s.getRange(10, 2, s.getMaxRows(), 1).getValues();
  const total_rows = s.getMaxRows();

  for (let i = 10; i <= total_rows; i++) {
    let taskType = r[i - 10][0];
    if (taskType === type) return i;
  }
  return undefined;
}

/**
 * Change the deadline of a task based on the taskData
 * @param {Object{deadline, row, col}} taskData
 * @returns {String|Void}
 */
function task_changeDeadline(taskData) {
  const s = getCollect(1504741049);

  if (types[2].includes(s.getRange(taskData.row, 2).getValue())) return "You cannot change the status of a completed task";
  if (!types.includes(s.getRange(taskData.row, 2).getValue())) return "This is not a task";

  taskData.deadline = new Date(taskData.deadline);
  s.getRange(taskData.row, 4).setValue(taskData.deadline);
  s.getRange(taskData.row, taskData.col).setValue(false);
  
  taskData["title"] = s.getRange(taskData.row, 5).getValue();
  taskData["description"] = s.getRange(taskData.row, 6).getValue();
  task_sendDiscordMessage("Postpone", taskData);
}

/**
 * @returns {String}
 */
function task_changeAssignment(inputData) {
  if (!inputData) throw new Error("Do not run this function from the editor");
  if (!inputData.gmail.includes("@") || !inputData.gmail.includes(".")) return "Not a valid Gmail";
  
  const targetData = getUserData(inputData.gmail);
  if (!targetData.row) return "User not found";

  const s = getCollect(LIBRARY_SETTINGS.sheetId_task);
  let currentAssignees = s.getRange(inputData.row, 7).getValue();
  let assigned = false;

  if (currentAssignees.includes(targetData.name)) {
    currentAssignees = task_removeAssignee(currentAssignees, targetData.name);
  } else {
    currentAssignees = currentAssignees + `${currentAssignees ? ", " : ""} ${targetData.name}`;
    assigned = true;
  }

  s.getRange(inputData.row, 7).setValue(currentAssignees);
  assigned = `${assigned ? "Assigned" : "Unassigned"}`;
  inputData["description"] = s.getRange(inputData.row, 6).getValue();
  inputData["deadline"] = s.getRange(inputData.row, 4).getValue();

  task_sendDiscordMessage(assigned, inputData, targetData);
  task_isAssigned(assigned === "Assigned" ? true : false);

  return `${targetData.name} ${assigned}`;
}

/**
 * Check whether a person has a task assigned to them or not
 * @param {Boolean} newTask
 * @returns {void}
 */
function task_isAssigned(newTask = false) {
  const sheet = getCollect(LIBRARY_SETTINGS.rosterIds[0]);
  const taskSheet = getCollect(LIBRARY_SETTINGS.sheetId_task);
  const taskCol = LIBRARY_SETTINGS.dataCols.taskAssigned;
  const total_rows = sheet.getMaxRows();
  const task_rows = task_getLastRow(taskSheet, "Backlog");
  let total_assignees = [];

  for (let i = 6; i < total_rows; i++) {
    const rank = sheet.getRange(i, 4).getValue();
    if (rank === LIBRARY_SETTINGS.ranks[LIBRARY_SETTINGS.ranks.length - 1]) {
      sheet.getRange(i, taskCol).setValue("N/A");
      continue;
    }

    if (!rank) continue;
    const member = sheet.getRange(i, 5).getDisplayValue();

    if (!member) {
      sheet.getRange(i, taskCol).setValue(false);
      continue;
    }

    for (let j = 10; j <= task_rows; j++) {
      const assignees = taskSheet.getRange(j, 7).getValue();
      if (!assignees) continue;
      if (!newTask) total_assignees.push(assignees);

      if (assignees.includes(member)) sheet.getRange(i, taskCol).setValue(true);
    }

    if (!newTask) {
      if (!total_assignees.includes(sheet.getRange(i, taskCol).getValue())) sheet.getRange(i, taskCol).setValue(false);
      total_assignees = [];
    }
  } 
}

/**
 * Regex, used in assigning / deassinging to a task
 * Made using AI (One day I will understand how this works)
 * @param {String} str - The complete string of current assignees
 * @param {String} name - The name to remove from str
 * @returns {String}
 */
function task_removeAssignee(str, name) {
  if (str.includes(name)) {
    const escapedName = name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\s*${escapedName}\\s*,?|,?\\s*${escapedName}\\s*`, 'g');
    const newStr = str.replace(regex, '').trim();
    return newStr;
  } else {
    return str;
  }
}

/**
 * Check if a task is overdue. All asignees will be striked.
 */
function task_checkOverdue() {
  const taskSheet = getCollect(LIBRARY_SETTINGS.sheetId_task);
  const sheet = getCollect(LIBRARY_SETTINGS.rosterIds[0]);
  const infractionSheet = getCollect(LIBRARY_SETTINGS.sheetId_infraction);
  const total_rows = sheet.getMaxRows();

  for (type of ["Backlog", "In Progress"]) {
    const task_rows = task_getLastRow(taskSheet, type);
    const start_task_rows = task_getFirstRow(taskSheet, type);

    if (task_rows < start_task_rows) continue;

    for (let i = start_task_rows; i <= task_rows; i++) {
      const assignees = taskSheet.getRange(i, 7).getValue();
      console.log(assignees);
      if (!assignees) continue;

      const dueDate = taskSheet.getRange(i, 4).getValue();

      // Check if dueDate is valid
      if (!(dueDate instanceof Date)) {
        Logger.log(`Invalid date at row ${i}: ${dueDate}`);
        continue;
      }

      Logger.log(dueDate.valueOf() - new Date().valueOf());
      if (dueDate.valueOf() <= new Date().valueOf()) {
        for (let j = 6; j < total_rows; j++) {
          const name = sheet.getRange(j, 5).getValue();
          console.log(name);
          if (!name) continue;
          if (assignees.includes(name)) {
            taskSheet.getRange(i, 7).setValue(task_removeAssignee(assignees, name));

            let inputData = {
              title: taskSheet.getRange(i, 5).getValue(),
              description: taskSheet.getRange(i, 6).getValue(),
              deadline: taskSheet.getRange(i, 4).getValue()
            };

            let targetData = {
              name: name,
              discordId: sheet.getRange(j, 7).getValue(),
              playerId: sheet.getRange(j, 6).getValue(),
              rank: sheet.getRange(j, 4).getValue()
            };

            const insertLogRow = getLastRow(infractionSheet);
            infractionSheet
              .getRange(insertLogRow, 3, 1, 12)
              .setValues([
                [
                  new Date(),
                  targetData.name,
                  targetData.playerId,
                  targetData.discordId,
                  targetData.rank,
                  "Regular",
                  false,
                  `Failure to complete the ${inputData.title} task before the deadline.`,
                  "",
                  "Task Manager",
                  "N/A",
                  "Task Manager"
                ]
              ]);

            protectRange("A", infractionSheet, 9, insertLogRow);

            Logger.log("Infraction Logged");
            task_sendDiscordMessage("Unassigned", inputData, targetData);
          }
        }
      }
    }
  }

  task_isAssigned();
}

/**
 * Cycle the status of the task located at "row": Backlog -> In Progress -> Completed
 * @param {Number} row - Row where the task is located
 * @returns {String}
 */
function task_cycleStatus(row) {
  const s = getCollect(LIBRARY_SETTINGS.sheetId_task);
  if (s.getRange(row, 5).getValue() == "") return "This task is empty";

  let type = s.getRange(row, 2).getValue();
  if (!types.includes(s.getRange(row, 2).getValue())) return "This is not a task";
  if (types[2].includes(s.getRange(row, 2).getValue())) return "You cannot change the status of a completed task";

  let inputData = {
    title: s.getRange(row, 5).getValue(),
    status: s.getRange(row, 2).getValue(),
    deadline: s.getRange(row, 4).getValue()
  };

  let newLoc;
  let endLoc;

  switch (type) {
    case "Backlog":
      newLoc = task_getEmptyRow(s, "In Progress");
      endLoc = task_getLastRow(s, "In Progress");
      type = "In Progress";
      break;
    case "In Progress":
      newLoc = task_getEmptyRow(s, "Completed");
      endLoc = task_getLastRow(s, "Completed");
      type = "Completed";
      break;
    case "Completed":
      return "You cannot change the status of a completed task";
    default:
      throw new Error("No matching type found");
  }
  console.log(`Loc: ${newLoc}\nEndLoc: ${endLoc}`);

  const data = s.getRange(row, 3, 1, 6).getValues();
  task_delete(row, 11);
  console.log(`Data: ${data}`)

  // If there are no more free slots in a type
  if (!newLoc) {
    s.insertRowAfter(endLoc);
    newLoc = endLoc + 1;
    console.log(newLoc);

    // Style new row
    [[3, 8], [10, 14]].forEach(cellpair => {
      let numcols = (cellpair[1] - cellpair[0]) + 1;

      // Border styling
      s.getRange(newLoc, cellpair[0], 1, numcols).setBorder(null, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      if (type === "Completed" && cellpair[0] === 10) {
        s.getRange(newLoc, cellpair[0], 1, numcols).setBorder(false, null, null, null, false, false);
      } else {
        s.getRange(newLoc, cellpair[0], 1, numcols).setBorder(true, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
      }

      // Remove checboxes to avoid confusion
      if (cellpair[0] === 10 && type === "Completed") s.getRange(newLoc, cellpair[0], 1, numcols).clearDataValidations().clearContent();

      // Set background color just in case (spreadsheets can be slippery with conditional formatting)
      if (newLoc > row) s.getRange(row, cellpair[0], 1, numcols).setBackground("#666666");
      if (newLoc < row) s.getRange(row + 1, cellpair[0], 1, numcols).setBackground("#666666");
    });
  }

  s.getRange(newLoc, 3, 1, 6).setValues(data);
  s.getRange(newLoc, 2).setValue(type);
  if (type === "Completed") {
    s.getRange(newLoc, 4).setValue(new Date());
    protectRange("N", s, null, newLoc);
  }
  task_sendDiscordMessage("Status", inputData);
}

/**
 * Edit the priority level of a task
 * @param {Object} inputData - Data inputted by the user (priority, row, col, title)
 * @returns {String}
 */
function task_changePriority(inputData) {
  if (!inputData) throw new Error("Do not run this function from the editor");
  const s = getCollect(LIBRARY_SETTINGS.sheetId_task);
  if (s.getRange(inputData.row, 5).getValue() == "") return "This task is empty";

  if (!types.includes(s.getRange(inputData.row, 2).getValue())) return "This is not a task";
  if (types[2].includes(s.getRange(inputData.row, 2).getValue())) return "You cannot change the priority of a completed task";

  s.getRange(inputData.row, 8).setValue(inputData.priority);
  task_sendDiscordMessage("Priority", inputData);
  return "Priority Edited";
}

/**
 * Deletes a task in "row"
 * 
 * @param {Number} row - Row where task to delete is located
 * @param {Number} [clearcell = 14] - The cell where the "delete" button (checkbox) is located
 * @parm {Number} [endLoc = null]
 * @param {Number} [startLoc = null]
 * @returns {String|Object}
 */
function task_delete(row, clearcell = 14, endLoc = null, startLoc = null) {
  if (!row) throw new Error("Do not run this function from the editor");
  const s = getCollect(LIBRARY_SETTINGS.sheetId_task);
  if (s.getRange(row, 5).getValue() == "") return "This task is empty";

  if (!types.includes(s.getRange(row, 2).getValue())) return "This is not a task";
  if (types[2].includes(s.getRange(row, 2).getValue())) return "You cannot delete completed tasks";

  endLoc = endLoc ? endLoc : task_getLastRow(s, s.getRange(row, 2).getValue());
  startLoc = startLoc ? startLoc : task_getFirstRow(s, s.getRange(row, 2).getValue());
  let numcols;

  let inputData = {
    title: s.getRange(row, 5).getValue()
  };

  if (row === endLoc && row === startLoc) {
    // Only one task row
    s.getRange(row, 3, 1, 6).clearContent();
    s.getRange(row, clearcell).setValue(false);
  } else if (row === endLoc && row !== startLoc) {
    // Task is at end of section
    [[3, 8], [10, 14]].forEach(cellpair => {
      numcols = (cellpair[1] - cellpair[0]) + 1;
      s.getRange(row - 1, cellpair[0], 1, numcols).setBorder(null, null, true, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    });
    s.deleteRow(row);
  } else if (row !== endLoc && row === startLoc) {
    // Task is the first of that section
    [[3, 8], [10, 14]].forEach(cellpair => {
      numcols = (cellpair[1] - cellpair[0]) + 1;
      s.getRange(row + 1, cellpair[0], 1, numcols).setBorder(true, null, null, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    });
    s.deleteRow(row);
  } else {
    s.deleteRow(row);
  }

  return inputData;
}