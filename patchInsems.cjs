const fs = require('fs');
let b = fs.readFileSync('src/services/inseminationsService.ts', 'utf8');

b = b.replace(
  /assertRequiredDate,\n  assertRequiredText,/,
  "assertRequiredDate,\n  assertPastOrTodayDate,\n  assertRequiredText,"
);
b = b.replace(
  /assertRequiredDate\(record\.date, 'Data da insemina\u00e7\u00a3o'\);/,
  "assertPastOrTodayDate(record.date, 'Data da inseminação');"
);
b = b.replace(
  /assertRequiredDate\(record\.date, 'Data da inseminao'\);/,
  "assertPastOrTodayDate(record.date, 'Data da inseminação');"
);
b = b.replace(
  /assertRequiredDate\(record\.date, 'Data da insemina\u00e7\u00e3o'\);/,
  "assertPastOrTodayDate(record.date, 'Data da inseminação');"
);
// just brute force replace it
b = b.replace(/assertRequiredDate\(record\.date, 'Data da insemina.*'\);/, "assertPastOrTodayDate(record.date, 'Data da inseminação');");

fs.writeFileSync('src/services/inseminationsService.ts', b);