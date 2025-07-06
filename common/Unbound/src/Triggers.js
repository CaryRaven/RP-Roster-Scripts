/**
 * Time based trigger
 * @returns {Void}
 */
function GetAllowedStaff() {
  PropertiesService.getScriptProperties().setProperty("allowedStaff", RosterService.getAllowedStaff());
}

/**
 * Time-based function (every 12h) to create a full roster backup, can be manually disabled through web app config
 * Head Function - Not to be used in other scripts
 * @deprecated
 */
function BackupSheet() {
  RosterService.backupSheet();
  PropertiesService.getScriptProperties().setProperty("backupTime", JSON.stringify(new Date()));
}

/**
 * Head Function - Not to be used in other scripts
 * Checks all current staff Folders for unwanted access & reports it
 */
function PermissionsGuard() {
  RosterService.permissionsGuard(JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff")));
}

/**
 * Process all log edits lined up in queue
 */
function Trigger_LogEdits() {
  let editQueue = PropertiesService.getScriptProperties().getProperty("editQueue")
  editQueue = !editQueue ? [] : JSON.parse(editQueue);

  if (editQueue.length <= 0) return;

  let i;
  for (i = 0; i < editQueue.length; i++) {
    const edit = editQueue[i];
    const logRow = RosterService.logEdit_getRow(edit.data, edit.row);
    if (typeof logRow !== "number") return RosterService.sendDiscordError("Corrupted Data", "Trigger_LogEdits");

    RosterService.logEdit_handler(edit.data, logRow);
  }

  editQueue.splice(0, i);
  PropertiesService.getScriptProperties().setProperty("editQueue", JSON.stringify(editQueue));
}