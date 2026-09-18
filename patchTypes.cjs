const fs = require('fs');
let types = fs.readFileSync('src/types/offline.ts', 'utf8');

types = types.replace(
  /export interface Insemination extends LocalEntity \{/,
  "export interface Insemination extends LocalEntity {\n  cycle_status?: 'active' | 'closed';"
);

types = types.replace(
  /export interface PregnancyDiagnosis extends LocalEntity \{/,
  "export interface PregnancyDiagnosis extends LocalEntity {\n  cycle_status?: 'active' | 'closed';"
);

fs.writeFileSync('src/types/offline.ts', types);