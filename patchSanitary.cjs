const fs = require('fs');
let b = fs.readFileSync('src/services/sanitaryManagementService.ts', 'utf8');

b = b.replace(
  /assertRequiredDate,\n  assertRequiredText,/,
  "assertRequiredDate,\n  assertPastOrTodayDate,\n  assertRequiredText,"
);
b = b.replace(/assertRequiredDate\(record\.date, 'Data( da aplica.*)?'\);/, "assertPastOrTodayDate(record.date, 'Data da aplicação');");

fs.writeFileSync('src/services/sanitaryManagementService.ts', b);