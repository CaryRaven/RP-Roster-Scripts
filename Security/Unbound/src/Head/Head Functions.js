/**
 * Get the emails of all staff members that are allowed to access this admin menu
 * @returns {Void}
 */
function GetAllowedStaff() {
    const staffAdminRoster = SpreadsheetApp.openById("1Y5vRfPV4v1NnD32eLJf4TWBRrur3xJpYjOBpgwRmHrU").getSheetById(591802026);
    const rows = staffAdminRoster.getMaxRows();
    let emails = [];

    staffAdminRoster.getRange(8, 8, rows, 1).getValues().forEach(row => {
        const email = row[0];
        if (!email) return;
        emails.push(email);
    });

    PropertiesService.getScriptProperties().setProperty("allowedStaff", JSON.stringify(emails));
}