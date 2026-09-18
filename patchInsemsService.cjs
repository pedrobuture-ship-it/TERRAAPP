const fs = require('fs');
let s = fs.readFileSync('src/services/inseminationsService.ts', 'utf8');

s = s.replace(
  /import \* as animalsService from '.\/animalsService';/,
  "import * as animalsService from './animalsService';\nimport { updateMatrixStatus } from './reproductionCycleService';"
);

s = s.replace(
  /cycle_status: record\.cycle_status \?\? 'active',/,
  "cycle_status: record.id ? record.cycle_status : (record.cycle_status ?? 'active'),"
);

s = s.replace(
  /async function setMatrixReproductiveStatus[\s\S]*?async function refreshMatrixReproductiveStatus[\s\S]*?\n\}/,
  ""
);

s = s.replace(/await setMatrixReproductiveStatus\([\s\S]*?\);/g, "await updateMatrixStatus(record.animal_id);");
s = s.replace(/await refreshMatrixReproductiveStatus\(existing\.animal_id\);/g, "await updateMatrixStatus(existing.animal_id);");
s = s.replace(/await refreshMatrixReproductiveStatus\(record\.animal_id\);/g, "await updateMatrixStatus(record.animal_id);");

fs.writeFileSync('src/services/inseminationsService.ts', s);