function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function appError_(code, message) {
  var error = new Error(message);
  error.publicCode = code;
  return error;
}

function pickFields_(source, fields) {
  var result = {};
  fields.forEach(function (field) {
    if (Object.prototype.hasOwnProperty.call(source, field)) result[field] = source[field];
  });
  return result;
}
