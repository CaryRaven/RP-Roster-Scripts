// Task system constants
const types = ["Backlog", "In Progress", "Completed"];

const taskCols = {
  type: 2,
  c_date: 3,
  deadline: 4,
  title: 5,
  desc: 6,
  assignees: 7,
  priority: 8,
  b_assign: 10,
  b_status: 11,
  b_postpone: 12,
  b_priority: 13,
  b_delete: 14
}

/**
 * @returns {String}
 */
function task_add(inputData) {
  if (!isInit) throw new Error("Library is not yet initialized");

  const s = getCollect(LIBRARY_SETTINGS.sheetId_task);
  let loc = task_getEmptyRow(s, "Backlog");
  let endLoc = task_getLastRow(s, "Backlog");
  console.log(`End Loc: ${endLoc}\nLoc: ${loc}`);
  if (!endLoc) return;

  const now_ms = new Date().valueOf();
  const deadline_ms = dateToMilliseconds(formatDate(inputData.deadline));
  if (deadline_ms <= now_ms) return "Deadline cannot be in the past";

  // If there are no more free slots in a type
  if (!loc) {
    s.insertRowAfter(endLoc);
    loc = endLoc + 1;

    // Style new row
    [[taskCols.c_date, taskCols.priority], [taskCols.b_assign, taskCols.b_delete]].forEach(cellpair => {
      let numcols = (cellpair[1] - cellpair[0]) + 1;
      s.getRange(loc, cellpair[0], 1, numcols).setBorder(null, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      s.getRange(loc, cellpair[0], 1, numcols).setBorder(true, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
    });
  }

  // :hardcode
  const values = [["Backlog", Utilities.formatDate(new Date(), "GMT", 'dd MMMM yyyy'), inputData.deadline, inputData.title, inputData.description, "", inputData.priority]];

  s.getRange(loc, taskCols.type, 1, values[0].length).setValues(values);
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
  if (!isInit) throw new Error("Library is not yet initialized");

  const col = range.getColumn();
  const row = range.getRow();
  const sheetID = sheet.getSheetId();

  console.log(col);

  // Checks
  if (sheetID !== LIBRARY_SETTINGS.sheetId_task || LIBRARY_SETTINGS.rosterIds.includes(sheetID)) return;
  if (range.getValue() === false) range.setValue(false);

  if (!types.includes(sheet.getRange(row, taskCols.type).getValue())) {
    range.clearContent();
    return "This is not a task";
  }

  const completed = types[2].includes(sheet.getRange(row, taskCols.type).getValue());
  if (sheet.getRange(row, taskCols.c_date).getValue() == "" && !completed) {
    range.setValue(false);
    return "This task is empty";
  }

  if (completed) {
    return "You cannot edit a completed task";
  }

  const title = sheet.getRange(row, taskCols.title).getValue();

  switch (col) {
    case taskCols.title: // Editing title

      // :hardcode
      if (range.getValue().length > 30 || range.getValue() === "") {
        range.setValue(oldValue);
        return "Invalid Title";
      }

      return "Title Edited";

    case taskCols.desc: // Editing description
      if (range.getValue().length > 1500 || range.getValue() === "") {
        range.setValue(oldValue);
        return "Invalid Description";
      }

      return "Description Edited";

    case taskCols.b_assign: // Assigning
      range.setValue(false);
      return ["Assign", row, col, title];

    case taskCols.b_status: // Cycling status
      const r = task_cycleStatus(row);

      if (r) return r;
      return;

    case taskCols.b_postpone: // Postponing
      range.setValue(false);
      return ["Postpone", row, col, title];

    case taskCols.b_priority: // Changing priority
      range.setValue(false);
      return ["Priority", row, col, title];

    case taskCols.b_delete: // Deleting
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
  if (!isInit) throw new Error("Library is not yet initialized");
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
  let r = s.getRange(10, taskCols.type, total_rows, 1).getValues();

  for (let i = 10; i <= total_rows; i++) {
    let taskType = r[i - 10][0];
    if (s.getRange(i, taskCols.c_date).getValue() === "" && taskType == type) return i;
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

  let r = s.getRange(9, taskCols.type, s.getMaxRows(), 1).getValues();
  const total_rows = s.getMaxRows();

  for (let i = 10; i <= total_rows; i++) {
    let taskType = r[i - 9][0];
    if (taskType !== type && r[i - 10][0] == type) return i - 1;
  }
  return undefined;
}

 /**
  * Get the first row of a certain type of task
  * @param {Object} s     - Sheet object, use RosterService.getCollect to extract it
  * @param {String} type  - Backlog, In Progress or Completed
  */
function task_getFirstRow(s, type) {
  if (!s || !type) throw new Error("Do not run this function from the editor");

  // :hardcode
  let r = s.getRange(10, taskCols.type, s.getMaxRows(), 1).getValues();
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
  if (!isInit) throw new Error("Library is not yet initialized");

  const s = getCollect(LIBRARY_SETTINGS.sheetId_task);

  // :hardcode column
  if (types[2].includes(s.getRange(taskData.row, taskCols.type).getValue())) return "You cannot change the status of a completed task";
  if (!types.includes(s.getRange(taskData.row, taskCols.type).getValue())) return "This is not a task";

  taskData.deadline = new Date(taskData.deadline);
  s.getRange(taskData.row, taskCols.deadline).setValue(taskData.deadline);
  s.getRange(taskData.row, taskData.col).setValue(false);
  
  taskData["title"] = s.getRange(taskData.row, taskCols.title).getValue();
  taskData["description"] = s.getRange(taskData.row, taskCols.desc).getValue();
  task_sendDiscordMessage("Postpone", taskData);
}

/**
 * @returns {String}
 */
function task_changeAssignment(inputData) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!inputData) throw new Error("Do not run this function from the editor");
  if (!inputData.gmail.includes("@") || !inputData.gmail.includes(".")) return "Not a valid Gmail";
  
  const targetData = getUserData(inputData.gmail);
  if (!targetData.row) return "User not found";

  const s = getCollect(LIBRARY_SETTINGS.sheetId_task);

  const deadline_ms = dateToMilliseconds(s.getRange(inputData.row, taskCols.deadline).getDisplayValue());
  const now_ms = new Date().valueOf();
  if (deadline_ms <= now_ms + 86400000) return "Task too close to deadline";

  let currentAssignees = s.getRange(inputData.row, taskCols.assignees).getValue();
  let assigned = false;

  if (currentAssignees.includes(targetData.name)) {
    currentAssignees = task_removeAssignee(currentAssignees, targetData.name);
  } else {
    // Do not assign tasks to LOA as they can be striked for not completing on time, would be unfair
    // TODO: Improving LOAs: allow for early ending of an LOA & to select a start date (instead of assuming log date)
    if (targetData.status === "LOA") return "Cannot assign a task, user is on LOA";
    currentAssignees = currentAssignees + `${currentAssignees ? ", " : ""} ${targetData.name}`;
    assigned = true;
  }

  s.getRange(inputData.row, taskCols.assignees).setValue(currentAssignees);
  assigned = `${assigned ? "Assigned" : "Unassigned"}`;

  // :hardcode
  inputData["description"] = s.getRange(inputData.row, taskCols.desc).getValue();

  // :hardcode
  inputData["deadline"] = s.getRange(inputData.row, taskCols.deadline).getValue();

  task_sendDiscordMessage(assigned, inputData, targetData);

  return `${targetData.name} ${assigned}`;
}

/**
 * Check whether a person has a task assigned to them or not
 * @param {Boolean} newTask
 * @returns {void}
 */
function task_isAssigned() {
  if (!isInit) throw new Error("Library is not yet initialized");

  const sheet = getCollect(LIBRARY_SETTINGS.rosterIds[0]);
  const taskSheet = getCollect(LIBRARY_SETTINGS.sheetId_task);
  const taskCol = LIBRARY_SETTINGS.dataCols.taskAssigned;
  const total_rows = sheet.getMaxRows();
  const task_rows = task_getLastRow(taskSheet, "Backlog");

  for (let i = 6; i < total_rows; i++) {

    // :hardcode
    const rank = sheet.getRange(i, LIBRARY_SETTINGS.dataCols.rank).getValue();
    if (rank === LIBRARY_SETTINGS.ranks[LIBRARY_SETTINGS.ranks.length - 1]) {
      sheet.getRange(i, taskCol).setValue("N/A");
      continue;
    }

    if (!rank) continue;
    const member = sheet.getRange(i, LIBRARY_SETTINGS.dataCols.name).getDisplayValue();
    sheet.getRange(i, taskCol).setValue(false);

    if (!member) continue;
    
    for (let j = 10; j <= task_rows; j++) {

      // :hardcode
      const assignees = taskSheet.getRange(j, taskCols.assignees).getValue();
      if (!assignees) continue;

      if (assignees.includes(member)) {
        sheet.getRange(i, taskCol).setValue(true);
        continue;
      }
    }
  } 
}

/**
 * Regex, used in assigning / deassinging to a task
 * Made using AI (One day I will understand how this works)
 * @param {String} str    - The complete string of current assignees
 * @param {String} name   - The name to remove from str
 * @returns {String}
 */
function task_removeAssignee(str, name) {
  if (!isInit) throw new Error("Library is not yet initialized");

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
  if (!isInit) throw new Error("Library is not yet initialized");

  const taskSheet = getCollect(LIBRARY_SETTINGS.sheetId_task);
  const sheet = getCollect(LIBRARY_SETTINGS.rosterIds[0]);
  const infractionSheet = getCollect(LIBRARY_SETTINGS.sheetId_infraction);
  const total_rows = sheet.getMaxRows();

  for (type of ["Backlog", "In Progress"]) {
    const task_rows = task_getLastRow(taskSheet, type);
    const start_task_rows = task_getFirstRow(taskSheet, type);

    if (task_rows < start_task_rows) continue;

    for (let i = start_task_rows; i <= task_rows; i++) {
      const assignees = taskSheet.getRange(i, taskCols.assignees).getValue();
      console.log(assignees);
      if (!assignees) continue;

      const dueDate = taskSheet.getRange(i, taskCols.deadline).getValue();

      // Check if dueDate is valid
      if (!(dueDate instanceof Date)) {
        Logger.log(`Invalid date at row ${i}: ${dueDate}`);
        continue;
      }

      Logger.log(dueDate.valueOf() - new Date().valueOf());
      if (dueDate.valueOf() <= new Date().valueOf()) {
        for (let j = 6; j < total_rows; j++) {
          const name = sheet.getRange(j, LIBRARY_SETTINGS.dataCols.name).getValue();
          console.log(name);
          if (!name) continue;
          if (assignees.includes(name)) {
            taskSheet.getRange(i, taskCols.assignees).setValue(task_removeAssignee(assignees, name));

            let inputData = {
              title: taskSheet.getRange(i, taskCols.title).getValue(),
              description: taskSheet.getRange(i, taskCols.desc).getValue(),
              deadline: taskSheet.getRange(i, taskCols.deadline).getValue()
            };

            let targetData = {
              name: name,
              discordId: sheet.getRange(j, LIBRARY_SETTINGS.dataCols.discordId).getValue(),
              playerId: sheet.getRange(j, LIBRARY_SETTINGS.dataCols.playerId).getValue(),
              rank: sheet.getRange(j, LIBRARY_SETTINGS.dataCols.rank).getValue()
            };

            const insertLogRow = getLastRow(infractionSheet);
            infractionSheet
              // :hardcode
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
                  `Failure to complete the task "${inputData.title}" before the deadline.`,
                  "",
                  "Task Manager",
                  "N/A",
                  "Task Manager"
                ]
              ]);

            // :hardcode
            protectRange("A", infractionSheet, 9, insertLogRow);

            Logger.log("Infraction Logged");
            inputData.description = `${inputData.description}\n${targetData.name} has been automatically unassigned from this task and striked for failure to complete it by the deadline.`;
            task_sendDiscordMessage("Unassigned", inputData, targetData);

            sheet.getRange(targetData.row, LIBRARY_SETTINGS.dataCols.taskAssigned).setValue(false);
          }
        }
      }
    }
  }
}

/**
 * Cycle the status of the task located at "row": Backlog -> In Progress -> Completed
 * @param {Number} row - Row where the task is located
 * @returns {String}
 */
function task_cycleStatus(row) {
  if (!isInit) throw new Error("Library is not yet initialized");

  const s = getCollect(LIBRARY_SETTINGS.sheetId_task);
  if (s.getRange(row, taskCols.title).getValue() == "") return "This task is empty";

  let type = s.getRange(row, taskCols.type).getValue();
  if (!types.includes(s.getRange(row, taskCols.type).getValue())) return "This is not a task";
  if (types[2].includes(s.getRange(row, taskCols.type).getValue())) return "You cannot change the status of a completed task";

  let inputData = {
    title: s.getRange(row, taskCols.title).getValue(),
    status: s.getRange(row, taskCols.type).getValue(),
    deadline: s.getRange(row, taskCols.deadline).getValue()
  };

  let newLoc;
  let startLoc;

  const data = s.getRange(row, taskCols.c_date, 1, 6).getValues();
  console.log(`Data: ${data}`);
  task_delete(row, taskCols.b_delete);

  switch (type) {
    case "Backlog":
      newLoc = task_getEmptyRow(s, "In Progress");
      startLoc = task_getFirstRow(s, "In Progress");
      type = "In Progress";
      break;
    case "In Progress":
      newLoc = task_getEmptyRow(s, "Completed");
      startLoc = task_getFirstRow(s, "Completed");
      type = "Completed";
      break;
    case "Completed":
      return "You cannot change the status of a completed task";
    default:
      throw new Error("No matching type found");
  }
  console.log(`Loc: ${newLoc}\nstartLoc: ${startLoc}`);


  // If there are no more free slots in a type
  if (!newLoc) {
    s.insertRowBefore(startLoc);
    newLoc = startLoc;
    console.log(newLoc);

    // Style new row
    [[taskCols.c_date, taskCols.priority], [taskCols.b_assign, taskCols.b_delete]].forEach(cellpair => {
      let numcols = (cellpair[1] - cellpair[0]) + 1;

      // Border styling
      s.getRange(newLoc, cellpair[0], 1, numcols).setBorder(true, true, null, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      if (type === "Completed" && cellpair[0] === 10) {
        s.getRange(newLoc, cellpair[0], 1, numcols).setBorder(null, null, false, null, false, false);
      } else {
        s.getRange(newLoc, cellpair[0], 1, numcols).setBorder(null, null, true, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
      }

      // Remove checboxes to avoid confusion
      if (cellpair[0] === taskCols.b_assign && type === "Completed") s.getRange(newLoc, cellpair[0], 1, numcols).clearDataValidations().clearContent();
    });
  }

  s.getRange(newLoc, taskCols.c_date, 1, 6).setValues(data);
  s.getRange(newLoc, taskCols.type).setValue(type);

  if (type === "Completed") {
    s.getRange(newLoc, taskCols.deadline).setValue(new Date());
    task_removeOld(s);
  }

  task_sendDiscordMessage("Status", inputData);
}

/**
 * Edit the priority level of a task
 * @param {Object} inputData - Data inputted by the user (priority, row, col, title)
 * @returns {String}
 */
function task_changePriority(inputData) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!inputData) throw new Error("Do not run this function from the editor");

  const s = getCollect(LIBRARY_SETTINGS.sheetId_task);
  if (s.getRange(inputData.row, 5).getValue() == "") return "This task is empty";

  if (!types.includes(s.getRange(inputData.row, 2).getValue())) return "This is not a task";
  if (types[2].includes(s.getRange(inputData.row, 2).getValue())) return "You cannot change the priority of a completed task";

  s.getRange(inputData.row, taskCols.priority).setValue(inputData.priority);
  task_sendDiscordMessage("Priority", inputData);
  return "Priority Edited";
}

/**
 * Deletes a task in "row"
 * 
 * @param {Number} row                - Row where task to delete is located
 * @param {Number} [clearcell = 14]   - The cell where the "delete" button (checkbox) is located
 * @param {Number} [endLoc = null]
 * @param {Number} [startLoc = null]
 * @returns {String|Object}
 */
function task_delete(row, clearcell = 14, endLoc = null, startLoc = null) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!row) throw new Error("Do not run this function from the editor");
  
  const s = getCollect(LIBRARY_SETTINGS.sheetId_task);
  if (s.getRange(row, taskCols.title).getValue() == "") return "This task is empty";

  if (!types.includes(s.getRange(row, taskCols.type).getValue())) return "This is not a task";
  if (types[2].includes(s.getRange(row, taskCols.type).getValue())) return "You cannot delete completed tasks";

  endLoc = endLoc ? endLoc : task_getLastRow(s, s.getRange(row, taskCols.type).getValue());
  startLoc = startLoc ? startLoc : task_getFirstRow(s, s.getRange(row, taskCols.type).getValue());
  let numcols;

  let inputData = {
    title: s.getRange(row, taskCols.title).getValue()
  };

  if (row === endLoc && row === startLoc) {
    // Only one task row
    // :hardcode amount of cols
    s.getRange(row, taskCols.c_date, 1, 6).clearContent();
    s.getRange(row, clearcell).setValue(false);
  } else if (row === endLoc && row !== startLoc) {

    // Task is at end of section
    [[taskCols.c_date, taskCols.priority], [taskCols.b_assign, taskCols.b_delete]].forEach(cellpair => {
      numcols = (cellpair[1] - cellpair[0]) + 1;
      s.getRange(row - 1, cellpair[0], 1, numcols).setBorder(null, null, true, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    });

    s.deleteRow(row);
  } else if (row !== endLoc && row === startLoc) {

    // Task is the first of that section
    [[taskCols.c_date, taskCols.priority], [taskCols.b_assign, taskCols.b_delete]].forEach(cellpair => {
      numcols = (cellpair[1] - cellpair[0]) + 1;
      s.getRange(row + 1, cellpair[0], 1, numcols).setBorder(true, null, null, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    });

    s.deleteRow(row);
  } else {
    s.deleteRow(row);
  }

  return inputData;
}

/**
 * Remove any completed task that was completed over 6 months ago
 * No need to have old tasks piling up, only need to show the most recent ones
 * @param {Object} s          - Sheet object
 * @param {Number} start_row   - The first task row of "Completed"
 */
function task_removeOld(s) {
  const end_row = task_getLastRow(s, "Completed");
  const start_row = task_getFirstRow(s, "Completed");

  for (let i = end_row; i >= start_row; i--) {
    const deadline = s.getRange(i, taskCols.deadline).getDisplayValue();
    const deadline_ms = dateToMilliseconds(deadline);
    const max_days_old = new Date(new Date().valueOf() - (180 * 86400000)).valueOf();

    if (deadline_ms <= max_days_old && i !== start_row) s.deleteRow(i);
    if (deadline_ms <= max_days_old && i === start_row) s.getRange(i, 3, 1, s.getMaxColumns()).clearContent();
  }
  
  [[taskCols.c_date, taskCols.priority], [taskCols.b_assign, taskCols.b_delete]].forEach(cellpair => {
    const numcols = (cellpair[1] - cellpair[0]) + 1;
    s.getRange(start_row, cellpair[0], 1, numcols).setBorder(true, true, null, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    s.getRange(end_row, cellpair[0], 1, numcols).setBorder(null, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
  });
}