function AddTask() {
  try {
    DriveApp.getFolderById("1p_H8U7AV0Fa21je8NxinPGK34-7rQnf-");
    const addTask = RosterService.getHtmlAddTask();
    let html = HtmlService.createHtmlOutput(addTask);
    html.setWidth(600);
    html.setHeight(800);
    return SpreadsheetApp.getUi().showModalDialog(html, "New Task");
  } catch(e) {
    return SpreadsheetApp.getUi().alert("Only Security Chiefs+ are allowed to perform this action.");
  }
}

/**
 * Add a new task to the backlog
 * @param {Object} inputData - data gathered from the user form
 */
function SubmitTask(inputData) {
  if (!inputData) throw new Error("No inputdata found");
  if (inputData.description.length > 250) throw new Error("Too long description");

  const valid = RosterService.filterQuotes(inputData);
  if (valid !== true) throw new Error("No quotes allowed");

  const s = RosterService.getCollect(1504741049);
  let loc = RosterService.getTaskRow(s, "Backlog");
  let endLoc = RosterService.getLastTaskRow(s, "Backlog");
  console.log(`End Loc: ${endLoc}\nLoc: ${loc}`);
  if (!endLoc) return;

  // If there are no more free slots in a type
  if (!loc) {
    s.insertRowAfter(endLoc);
    loc = endLoc + 1;

    // Style new row
    [[3, 8], [10, 13]].forEach(cellpair => {
      let numcols = (cellpair[1] - cellpair[0]) + 1;
      s.getRange(loc, cellpair[0], 1, numcols).setBorder(null, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      s.getRange(loc, cellpair[0], 1, numcols).setBorder(true, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
    });
  }

  s.getRange(loc, 2, 1, 7).setValues([["Backlog", Utilities.formatDate(new Date(), "GMT", 'dd MMMM yyyy'), inputData.deadline, inputData.title, inputData.description, "", inputData.priority]]);
  inputData.deadline = new Date(inputData.deadline);
  SendDiscordMessage("New", inputData);
  return "Task Added";
}

/**
 * Main function that gets called on spreadsheet edit
 */
function TaskManager(e) {
  if (!e) throw new Error("Do not run this function from the editor.");

  const sheet = e.source.getActiveSheet();
  const range = e.range;
  const col = range.getColumn();
  const row = range.getRow();
  const sheetID = sheet.getSheetId();

  if (sheetID !== 1504741049 || sheetID === 2063800821) return;
  if (range.getValue() === false) return range.setValue(false);

  const types = ["Backlog", "In Progress", "Completed"];
  if (!types.includes(sheet.getRange(row, 2).getValue())) return SpreadsheetApp.getUi().alert("This is not a task");
  if (sheet.getRange(row, 5).getValue() == "") {
    range.setValue(false);
    return SpreadsheetApp.getUi().alert("This task is empty");
  }
  const title = sheet.getRange(row, 5).getValue();

  switch (col) {
    case 10:
      OpenFile("Assign", row, col, title);
      return range.setValue(false);
    case 11:
      CycleStatus(row);
      return;
    case 12:
      OpenFile("Postpone", row, col, title);
      return range.setValue(false);
    case 13:
      OpenFile("Priority", row, col, title);
      return range.setValue(false);
    case 14:
      const response = SpreadsheetApp.getUi().alert("Delete?", "Do you wish to proceed? This action cannot be undone.\n", SpreadsheetApp.getUi().ButtonSet.YES_NO);

      if (response == SpreadsheetApp.getUi().Button.YES) {
        const inputData = DeleteTask(row);
        SendDiscordMessage("Delete", inputData);
        HasTask();
      } else {
        return range.setValue(false);
      }
      return;
    default:
      return;
  }
}

/**
 * Open a modal Dialog for the task manager
 */
function OpenFile(type, row, col, title) {
  const taskManager = RosterService.getHtmlTaskManager();
  template = HtmlService.createTemplate(taskManager);
  template.row = row;
  template.col = col;
  template.title = title;
  template.type = type
  const eval = template.evaluate();
  SpreadsheetApp.getUi().showModalDialog(eval.setWidth(600).setHeight(800), `${type} ${type === "Assign" ? "to" : ""} Task`);
}

/**
 * Used when postponing a deadline
 * @returns {String}
 */
function ChangeDeadline(inputData) {
  if (!inputData) throw new Error("Do not run this function from the editor");
  const s = RosterService.getCollect(1504741049);

  const types = ["Backlog", "In Progress", "Completed"];
  if (!types.includes(s.getRange(inputData.row, 2).getValue())) return SpreadsheetApp.getUi().alert("This is not a task");

  inputData.deadline = new Date(inputData.deadline);
  s.getRange(inputData.row, 4).setValue(inputData.deadline);
  s.getRange(inputData.row, inputData.col).setValue(false);
  
  inputData["title"] = s.getRange(inputData.row, 5).getValue();
  inputData["description"] = s.getRange(inputData.row, 6).getValue();
  SendDiscordMessage("Postpone", inputData);
  return "Task Postponed";
}

/**
 * @returns {String}
 */
function ChangeAssignment(inputData) {
  if (!inputData) throw new Error("Do not run this function from the editor");

  if (!inputData.gmail.includes("@") || !inputData.gmail.includes(".")) return "Not a valid Gmail";
  const targetData = RosterService.getUserData(inputData.gmail);
  if (!targetData.row) return "User not found";

  const s = RosterService.getCollect(1504741049);
  let currentAssignees = s.getRange(inputData.row, 7).getValue();
  let assigned = false;

  if (currentAssignees.includes(targetData.name)) {
    currentAssignees = RemoveAssignee(currentAssignees, targetData.name);
  } else {
    currentAssignees = currentAssignees + `${currentAssignees ? ", " : ""} ${targetData.name}`;
    assigned = true;
  }

  s.getRange(inputData.row, 7).setValue(currentAssignees);
  assigned = `${assigned ? "Assigned" : "Unassigned"}`;
  inputData["description"] = s.getRange(inputData.row, 6).getValue();
  inputData["deadline"] = s.getRange(inputData.row, 4).getValue();
  SendDiscordMessage(assigned, inputData, targetData);
  HasTask(assigned === "Assigned" ? true : false);

  return `${targetData.name} ${assigned}`;
}

function DeleteTask(row, clearcell = 13, endLoc = null, startLoc = null) {
  if (!row) throw new Error("Do not run this function from the editor");
  const s = RosterService.getCollect(1504741049);
  if (s.getRange(row, 5).getValue() == "") return SpreadsheetApp.getUi().alert("This task is empty");

  const types = ["Backlog", "In Progress", "Completed"];
  if (!types.includes(s.getRange(row, 2).getValue())) return SpreadsheetApp.getUi().alert("This is not a task");
  if (types[2].includes(s.getRange(row, 2).getValue())) return SpreadsheetApp.getUi().alert("You cannot delete completed tasks");

  endLoc = endLoc ? endLoc : RosterService.getLastTaskRow(s, s.getRange(row, 2).getValue());
  startLoc = startLoc ? startLoc : GetFirstTaskRow(s, s.getRange(row, 2).getValue());
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
    [[3, 8], [10, 13]].forEach(cellpair => {
      numcols = (cellpair[1] - cellpair[0]) + 1;
      s.getRange(row - 1, cellpair[0], 1, numcols).setBorder(null, null, true, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    });
    s.deleteRow(row);
  } else if (row !== endLoc && row === startLoc) {
    // Task is the first of that section
    [[3, 8], [10, 13]].forEach(cellpair => {
      numcols = (cellpair[1] - cellpair[0]) + 1;
      s.getRange(row + 1, cellpair[0], 1, numcols).setBorder(true, null, null, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
    });
    s.deleteRow(row);
  } else {
    s.deleteRow(row);
  }
  return inputData;
}

function CycleStatus(row) {
  if (!row) throw new Error("Do not run this function from the editor");
  const s = RosterService.getCollect(1504741049);
  if (s.getRange(row, 5).getValue() == "") return SpreadsheetApp.getUi().alert("This task is empty");

  const types = ["Backlog", "In Progress", "Completed"];
  let type = s.getRange(row, 2).getValue();
  if (!types.includes(s.getRange(row, 2).getValue())) return SpreadsheetApp.getUi().alert("This is not a task");
  if (types[2].includes(s.getRange(row, 2).getValue())) return SpreadsheetApp.getUi().alert("You cannot change the status of a completed task");

  let inputData = {
    title: s.getRange(row, 5).getValue(),
    status: s.getRange(row, 2).getValue(),
    deadline: s.getRange(row, 4).getValue()
  };

  let newLoc;
  let endLoc;

  switch (type) {
    case "Backlog":
      newLoc = RosterService.getTaskRow(s, "In Progress");
      endLoc = RosterService.getLastTaskRow(s, "In Progress");
      type = "In Progress";
      break;
    case "In Progress":
      newLoc = RosterService.getTaskRow(s, "Completed");
      endLoc = RosterService.getLastTaskRow(s, "Completed");
      type = "Completed";
      break;
    case "Completed":
      newLoc = RosterService.getTaskRow(s, "Backlog");
      endLoc = RosterService.getLastTaskRow(s, "Backlog");
      type = "Backlog";
      break;
    default:
      throw new Error("No matching type found");
  }
  console.log(`Loc: ${newLoc}\nEndLoc: ${endLoc}`);

  const data = s.getRange(row, 3, 1, 6).getValues();
  DeleteTask(row, 11);
  console.log(`Data: ${data}`)

  // If there are no more free slots in a type
  if (!newLoc) {
    s.insertRowAfter(endLoc);
    newLoc = endLoc + 1;

    // Style new row
    [[3, 8], [10, 13]].forEach(cellpair => {
      let numcols = (cellpair[1] - cellpair[0]) + 1;
      s.getRange(newLoc, cellpair[0], 1, numcols).setBorder(null, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID_THICK);
      s.getRange(newLoc, cellpair[0], 1, numcols).setBorder(true, null, null, null, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
    });
  }

  s.getRange(newLoc, 3, 1, 6).setValues(data);
  s.getRange(newLoc, 2).setValue(type);
  SendDiscordMessage("Status", inputData);
}

/**
 * Edit the priority level of a task
 * @param {Object} inputData - Data inputted by the user (priority, row, col, title)
 * @returns {String}
 */
function ChangePriority(inputData) {
  if (!inputData) throw new Error("Do not run this function from the editor");
  const s = RosterService.getCollect(1504741049);
  if (s.getRange(inputData.row, 5).getValue() == "") return SpreadsheetApp.getUi().alert("This task is empty");

  const types = ["Backlog", "In Progress", "Completed"];
  if (!types.includes(s.getRange(inputData.row, 2).getValue())) return SpreadsheetApp.getUi().alert("This is not a task");
  if (types[2].includes(s.getRange(inputData.row, 2).getValue())) return SpreadsheetApp.getUi().alert("You cannot change the priority of a completed task");

  s.getRange(inputData.row, 8).setValue(inputData.priority);
  SendDiscordMessage("Priority", inputData);
  return "Priority Edited";
}

/**
 * Check whether a person has a task assigned to them or not
 * @param {String} query - Cell where the reference is located
 * @returns {void}
 */
function HasTask(newTask = false) {
  const sheet = RosterService.getCollect(2063800821);
  const taskSheet = RosterService.getCollect(1504741049);
  const total_rows = sheet.getMaxRows();
  const task_rows = RosterService.getLastTaskRow(taskSheet, "Backlog");
  let total_assignees = [];

  for (let i = 6; i < total_rows; i++) {
    const rank = sheet.getRange(i, 4).getValue();
    if (rank === "Site Management") {
      sheet.getRange(i, 15).setValue("N/A");
      continue;
    }
    if (!rank) continue;
    const member = sheet.getRange(i, 5).getValue();
    if (!member) {
      sheet.getRange(i, 15).setValue(false);
      continue;
    }
    for (let j = 10; j <= task_rows; j++) {
      const assignees = taskSheet.getRange(j, 7).getValue();
      if (!assignees) continue;
      if (!newTask) total_assignees.push(assignees);
      if (assignees.includes(member)) sheet.getRange(i, 15).setValue(true);
    }

    if (!newTask) {
      if (!total_assignees.includes(sheet.getRange(i, 15).getValue())) sheet.getRange(i, 15).setValue(false);
      total_assignees = [];
    }
  }  
}

/**
 * Check if a task is overdue. All asignees will be striked.
 */
function CheckOverdue() {
  const taskSheet = RosterService.getCollect(1504741049);
  const sheet = RosterService.getCollect(2063800821);
  const infractionSheet = RosterService.getCollect(343884184);
  const total_rows = sheet.getMaxRows();
  const task_rows = RosterService.getLastTaskRow(taskSheet, "Backlog");

  for (let i = 10; i <= task_rows; i++) {
    const assignees = taskSheet.getRange(i, 7).getValue();
    if (!assignees) continue;

    const dueDate = taskSheet.getRange(i, 4).getValue();

    // Check if dueDate is valid
    if (!(dueDate instanceof Date)) {
      Logger.log(`Invalid date at row ${i}: ${dueDate}`);
      continue;
    }

    if (dueDate <= new Date()) {
      for (let j = 6; j < total_rows; j++) {
        const name = sheet.getRange(j, 5).getValue();
        console.log(name);
        if (!name) continue;
        if (assignees.includes(name)) {
          taskSheet.getRange(i, 7).setValue(RemoveAssignee(assignees, name));

          let inputData = {
            title: taskSheet.getRange(i, 5).getValue(),
            description: taskSheet.getRange(i, 6).getValue(),
            deadline: taskSheet.getRange(i, 4).getValue()
          };

          let targetData = {
            name: name,
            discordId: sheet.getRange(j, 7).getValue(),
            steamId: sheet.getRange(j, 6).getValue(),
            rank: sheet.getRange(j, 4).getValue()
          };

          const insertLogRow = RosterService.getLastRow(infractionSheet);
          infractionSheet
            .getRange(insertLogRow, 3, 1, 12)
            .setValues([
              [
                new Date(),
                targetData.name,
                targetData.steamId,
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

          let protections = infractionSheet
            .getRange(insertLogRow, 1, 1, 8)
            .protect();
          protections.removeEditors(protections.getEditors());
          if (protections.canDomainEdit()) {
            protections.setDomainEdit(false);
          }
          protections = infractionSheet
            .getRange(insertLogRow, 10, 1, infractionSheet.getMaxColumns())
            .protect();
          protections.removeEditors(protections.getEditors());
          if (protections.canDomainEdit()) {
            protections.setDomainEdit(false);
          }

          Logger.log("Infraction Logged");
          SendDiscordMessage("Unassigned", inputData, targetData);
        }
      }
    }
  }
  HasTask();
}

/* ************** UTILITY FUNCTIONS ******************* */

/**
 * Regex, used in assigning / deassinging to a task
 * Made using AI (One day I will understand how this works)
 */
function RemoveAssignee(str, name) {
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
  * Get the first row of a certain type of task
  * @param {Object} s - Sheet object, use RosterService.getCollect to extract it
  * @param {String} type - Backlog, In Progress or Completed
  */
function GetFirstTaskRow(s, type) {
  if (!s || !type) throw new Error("Do not run this function from the editor");
  let r = s.getRange(10, 2, s.getMaxRows(), 1).getValues();
  const total_rows = s.getMaxRows();

  for (let i = 10; i <= total_rows; i++) {
    let taskType = r[i - 10][0];
    if (taskType === type) return i;
  }
  return undefined;
}