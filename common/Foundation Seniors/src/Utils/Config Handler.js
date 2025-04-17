function ToggleManualEditing(value) {
    value = value == true ? false : true;
    PropertiesService.getScriptProperties().setProperty("manualEnabled", value);
    SendDiscordConfig("manualEdit", value);
}

function ReturnManualEditing() {
    let properties = PropertiesService.getScriptProperties();
    let manualValue = properties.getProperty("manualEnabled");
    console.log(manualValue);

    return manualValue;
}

function ToggleSheetRestore(value) {
    PropertiesService.getScriptProperties().setProperty("restoreType", value);
    SendDiscordConfig("restoreType", value);
}

function ReturnRestoreType() {
    let properties = PropertiesService.getScriptProperties();
    let restoreValue = properties.getProperty("restoreType");
    console.log(restoreValue);

    return restoreValue;
}

function ToggleBackup(value) {
    PropertiesService.getScriptProperties().setProperty("backupEnabled", value);
    SendDiscordConfig("backup", value);
}

function ReturnBackup() {
    let properties = PropertiesService.getScriptProperties();
    let backupValue = properties.getProperty("backupEnabled");
    console.log(backupValue);

    return backupValue;
}

function ToggleLockdown(value) {
    PropertiesService.getScriptProperties().setProperty("lockdownEnabled", value);
    if (value) {
        RemoveAllDocAccess();
    } else {
        RestoreAllDocAccess();
    }
    SendDiscordConfig("lockdown", value);
}

function ReturnLockdown() {
    let properties = PropertiesService.getScriptProperties();
    let lockdownValue = properties.getProperty("lockdownEnabled");
    console.log(lockdownValue);

    return lockdownValue;
}

function GetLastBackupTime() {
    const backupTime = JSON.parse(PropertiesService.getScriptProperties().getProperty("backupTime"));
    const backupDate = backupTime ? new Date(backupTime) : new Date();
    const date = new Date();
    return Math.round(((date.valueOf() - backupDate.valueOf()) / 60000));
}