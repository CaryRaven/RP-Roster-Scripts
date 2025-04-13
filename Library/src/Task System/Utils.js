 /**
  * Get the first empty row a certain type of task
  * @param {Object} s - Sheet object, use getCollect to extract it
  * @param {String} type - Backlog, In Progress or Completed
  * @returns {Number}
  */
function getTaskRow(s, type) {
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
function getLastTaskRow(s, type) {
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