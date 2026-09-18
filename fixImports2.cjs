const fs = require('fs');

let semen = fs.readFileSync('src/pages/BullsSemenPage.tsx', 'utf8');
semen = "import { COMMON_BREEDS } from '../constants/animalOptions';\n" + semen;
fs.writeFileSync('src/pages/BullsSemenPage.tsx', semen);
