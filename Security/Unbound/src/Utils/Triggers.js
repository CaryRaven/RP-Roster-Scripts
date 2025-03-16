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
  const be = PropertiesService.getScriptProperties().getProperty("backupEnabled");
  const me = PropertiesService.getScriptProperties().getProperty("manualEnabled");
  RosterService.backupSheet(be, me);
  PropertiesService.getScriptProperties().setProperty("backupTime", JSON.stringify(new Date()));
}

/**
 * Head Function - Not to be used in other scripts
 * Checks all current staff Folders for unwanted access & reports it
 */
function PermissionsGuard() {
  RosterService.permissionsGuard(JSON.parse(PropertiesService.getScriptProperties().getProperty("allowedStaff")));
}