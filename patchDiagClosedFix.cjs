const fs = require('fs');
let s = fs.readFileSync('src/services/pregnancyDiagnosesService.ts', 'utf8');

s = s.replace(/data\.result === 'negative' \|\| data\.result === 'aborted'/g, "data.result === 'empty'");
s = s.replace(/diagnosis\.result === 'negative' \|\| diagnosis\.result === 'aborted'/g, "diagnosis.result === 'empty'");

fs.writeFileSync('src/services/pregnancyDiagnosesService.ts', s);