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

  // Meaning we're adding a new one
  if (edit === "") {
    LIBRARY_SETTINGS.specializations.push({
      title: title,
      desc: desc
    });
  } else {
    let found = false;
    let nothingChanged = false;
    LIBRARY_SETTINGS.specializations.forEach((spec, i) => {
      if (spec.title === edit) {
        if (spec.title === title && spec.desc === desc) return nothingChanged = true;
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