const fs = require('fs');
let s = fs.readFileSync('src/services/pregnancyDiagnosesService.ts', 'utf8');

s = s.replace(
  /method: record\.method \?\? 'ultrasound',/,
  "cycle_status: record.cycle_status ?? 'active',\n    method: record.method ?? 'ultrasound',"
);

fs.writeFileSync('src/services/pregnancyDiagnosesService.ts', s);