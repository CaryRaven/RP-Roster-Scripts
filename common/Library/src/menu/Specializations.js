/**
 * @param {String} title
 * @param {String} desc
 * @param {String} edit - Title of the specialization to edit
 * @returns {Array|String}
 */
function manageSpec(title, desc, edit) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!title || typeof title !== "string") throw new Error("Invalid title");
  if (!desc || typeof desc !== "string") throw new Error("Invalid description");
  if (typeof edit !== "string") throw new Error("Invalid edit");

  let taken = true;
  LIBRARY_SETTINGS.specializations.forEach(spec => {
    if (spec.title.includes(title)) taken = false;
  })
  
  if (taken !== true && edit === "") return "Cannot have duplicate specializations";

  if (edit === "") {
    // Adding a new one
    LIBRARY_SETTINGS.specializations.push({
      title: title,
      desc: desc
    });
  } else {
    // Editing an existing one
    let found = false;
    let nothingChanged = false;

    // Search for the spec in the lib settings
    LIBRARY_SETTINGS.specializations.forEach((spec, i) => {
      if (spec.title === edit) {
        if (spec.title === title && spec.desc === desc) return nothingChanged = true;

        // Edit on roster
        const roster = getCollect(LIBRARY_SETTINGS.rosterIds[0]);
        for (let i = 15; i < roster.getMaxRows(); i++) {
          const cell = roster.getRange(i, LIBRARY_SETTINGS.dataCols.specialization);
          
          if (cell.getDisplayValue() === spec.title) {
            cell.setValue(title);
            cell.setNote(desc);
          }
        }

        // Edit in settings
        LIBRARY_SETTINGS.specializations.splice(i, 1, { title: title, desc: desc });

        found = true;
      }
    });

    if (nothingChanged) return "Nothing was edited"
    if (!found) return "Specialization not found";
  }

  return [`${edit === "" ? "Specialization Added" : "Specialization Edited"}`, LIBRARY_SETTINGS];
}

/**
 * @param {String} title
 * @returns {JSON.Array}
 */
function getSpecContent(title) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!title || typeof title !== "string") throw new Error("Invalid title");

  let returnArray = [];
  LIBRARY_SETTINGS.specializations.forEach(spec => {
    if (spec.title === title) {
      returnArray = [spec.title, spec.desc];
    }
  });
  return JSON.stringify(returnArray);
}

/**
 * @param {String} title
 * @returns {Array|String}
 */
function removeSpec(title) {
  if (!isInit) throw new Error("Library is not yet initialized");
  if (!title || typeof title !== "string") throw new Error("No valid title provided");

  let found = false;
  LIBRARY_SETTINGS.specializations.forEach((spec, i) => {
    if (spec.title === title) {
      LIBRARY_SETTINGS.specializations.splice(i, 1);
      found = true;
    }
  });
  if (!found) return "Specialization not found";
  return ["Specialization Removed", LIBRARY_SETTINGS];
}