const fs = require('fs');
let b = fs.readFileSync('src/services/birthsService.ts', 'utf8');

b = b.replace(
  /assertRequiredDate,\n  assertRequiredText,/,
  "assertRequiredDate,\n  assertPastOrTodayDate,\n  assertRequiredText,"
);
b = b.replace(
  /assertRequiredDate\(record\.birth_date, 'Data do parto'\);/,
  "assertPastOrTodayDate(record.birth_date, 'Data do parto');"
);

fs.writeFileSync('src/services/birthsService.ts', b);