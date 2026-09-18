const fs = require('fs');
let s = fs.readFileSync('src/services/birthsService.ts', 'utf8');

s = s.replace(
  /import \* as animalsService from '.\/animalsService';/,
  "import * as animalsService from './animalsService';\nimport { updateMatrixStatus } from './reproductionCycleService';"
);

s = s.replace(
  /async function setMatrixStatus[\s\S]*?async function refreshMatrixStatus[\s\S]*?\n\}/,
  ""
);

s = s.replace(/await setMatrixStatus\([\s\S]*?\);/g, "await updateMatrixStatus(record.animal_id);");
s = s.replace(/await refreshMatrixStatus\(existing\.animal_id\);/g, "await updateMatrixStatus(existing.animal_id);");
s = s.replace(/await refreshMatrixStatus\(record\.animal_id\);/g, "await updateMatrixStatus(record.animal_id);");

fs.writeFileSync('src/services/birthsService.ts', s);