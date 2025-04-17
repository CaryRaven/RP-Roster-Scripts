const types = ["Backlog", "In Progress", "Completed"];

function AddTask() {
  try {
    DriveApp.getFolderById("1p_H8U7AV0Fa21je8NxinPGK34-7rQnf-");
    const addTask = RosterService.getHtmlAddTask();
    let html = HtmlService.createHtmlOutput(addTask);
    html.setWidth(600);
    html.setHeight(800);
    return SpreadsheetApp.getUi().showModalDialog(html, "New Task");
  } catch(e) {
    return SpreadsheetApp.getUi().alert("Only Chief+ are allowed to perform this action.");
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
  if (valid !== true) return "No quotes allowed";

  return RosterService.task_add(inputData);
}

/**
 * Main function that gets called on spreadsheet edit
 */
function Trigger_TaskManager(e) {
  if (!e) throw new Error("Do not run this function from the editor.");
  
  const sheet = e.source.getActiveSheet();
  const range = e.range;
  const col = range.getColumn();
  let response;

  if (col === 14) {
    const re = SpreadsheetApp.getUi().alert("Delete?", "Do you wish to proceed? This action cannot be undone.\n", SpreadsheetApp.getUi().ButtonSet.YES_NO);
    if (re == SpreadsheetApp.getUi().Button.YES) {
      response = RosterService.task_manager(sheet, range);
    } else {
      return range.setValue(false);
    }
  } else {
     response = RosterService.task_manager(sheet, range);
  }

  if (typeof response === "string") return SpreadsheetApp.getUi().alert(response);
  if (Array.isArray(response) && response.length === 4) return OpenFile(response[0], response[1], response[2], response[3]);
}

/**
 * Open a modal Dialog for the task manager
 */
function OpenFile(type, row, col, title) {
  if (!type) throw new Error("Do not run this function from the editor");

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
  const response = RosterService.task_changeDeadline(inputData);

  // task_changeDeadline will return a string when preventing a deadline change
  if (response) return SpreadsheetApp.getUi().alert(response);

  return "Task Postponed";
}

/**
 * @returns {String}
 */
function ChangeAssignment(inputData) {
  if (!inputData) throw new Error("Do not run this function from the editor");
  return RosterService.task_changeAssignment(inputData);
}

/**
 * Edit the priority level of a task
 * @param {Object} inputData - Data inputted by the user (priority, row, col, title)
 * @returns {String}
 */
function ChangePriority(inputData) {
  if (!inputData) throw new Error("Do not run this function from the editor");
  const response = RosterService.task_changePriority(inputData);

  if (response !== "Priority Edited") return SpreadsheetApp.getUi().alert(response);

  return response;
}

/**
 * Time-based trigger
 * @returns {void}
 */
function Tigger_IsAssigned() {
  RosterService.task_isAssigned();
}

/**
 * Time-based trigger to check if a task is overdue. All asignees will be striked.
 */
function Trigger_CheckOverdue() {
  RosterService.task_checkOverdue();
}