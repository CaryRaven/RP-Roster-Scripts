function GetSpreadsheetData(inputValue) {

    const sheets = [
        { id: 1108325195, label: "Rank Change" },
        { id: 1412014967, label: "Infraction" },
        { id: 483225742, label: "LOA Log" },
        { id: 768736387, label: "Sr CL4 Blacklists / Suspensions" }
    ];

    const results = [];

    sheets.forEach(sheetInfo => {
        try {
        const sheet = getCollect(sheetInfo.id);
        const sheetName = sheet.getName();

        if (!sheet) {
            Logger.log(`Sheet not found: ${sheetName}`);
            return;
        }

        const headersRaw = sheet.getRange(6, 3, 1, 11).getValues();
        const headers = headersRaw[0];
        Logger.log(`Headers for sheet ${sheetName}: ${JSON.stringify(headers)}`);

        const data = sheet.getRange(7, 3, sheet.getLastRow() - 6, 11).getValues();
        Logger.log(`Data from sheet ${sheetName}: ${JSON.stringify(data)}`);

        const matchingData = data.filter(row => {
            if (!row || row.length < 8 || !row[2]) return false;

            const cellValue = row[2].toString().trim().toLowerCase();
            const normalizedInput = inputValue.trim().toLowerCase();
            Logger.log(`Comparing "${cellValue}" with "${normalizedInput}"`);
            return cellValue === normalizedInput;

            }).map(row => {
                const rowObject = { sheetLabel: sheetInfo.label };
                headers.forEach((header, index) => {
                    rowObject[header] = row[index] !== undefined ? row[index] : null;
                });
                return rowObject;
            });

            Logger.log(`Matching data from sheet ${sheetName}: ${JSON.stringify(matchingData)}`);
            results.push(...matchingData);
        } catch (error) {
            Logger.log(`Error processing sheet ${sheetName}: ${error.message}`);
        }
    });

    Logger.log(`Combined Results: ${JSON.stringify(results)}`);
    return JSON.stringify(results);
}