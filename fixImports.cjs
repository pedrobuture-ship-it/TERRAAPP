const fs = require('fs');

let form = fs.readFileSync('src/components/animals/AnimalForm.tsx', 'utf8');
form = form.replace(
  /animalStatusOptions,/,
  "animalStatusOptions,\n  COMMON_BREEDS,"
);
fs.writeFileSync('src/components/animals/AnimalForm.tsx', form);

let semen = fs.readFileSync('src/pages/BullsSemenPage.tsx', 'utf8');
semen = semen.replace(
  /import \{ getSemenStatusLabel, semenStatusOptions \} from '\.\.\/constants\/semenOptions';/,
  "import { getSemenStatusLabel, semenStatusOptions } from '../constants/semenOptions';\nimport { COMMON_BREEDS } from '../constants/animalOptions';"
);
fs.writeFileSync('src/pages/BullsSemenPage.tsx', semen);
