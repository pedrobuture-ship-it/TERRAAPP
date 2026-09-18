const fs = require('fs');

let animalOptions = fs.readFileSync('src/constants/animalOptions.ts', 'utf8');

if (!animalOptions.includes('COMMON_BREEDS')) {
  animalOptions += `\n\nexport const COMMON_BREEDS = [
  'Nelore',
  'Angus',
  'Brahman',
  'Brangus',
  'Senepol',
  'Tabapuã',
  'Guzerá',
  'Sindi',
  'Gir',
  'Girolando',
  'Holandês',
  'Jersey',
  'Nelore Pintado',
  'Wagyu',
];\n`;
  fs.writeFileSync('src/constants/animalOptions.ts', animalOptions);
}

// 1. Update AnimalForm.tsx
let animalForm = fs.readFileSync('src/components/animals/AnimalForm.tsx', 'utf8');
if (!animalForm.includes('COMMON_BREEDS')) {
  animalForm = animalForm.replace(
    /import \{ getAnimalCategoryLabel \} from '\.\.\/\.\.\/constants\/animalOptions';/g,
    "import { getAnimalCategoryLabel, COMMON_BREEDS } from '../../constants/animalOptions';"
  );
  animalForm = animalForm.replace(
    /className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none \\ntransition focus:border-field-600 focus:ring-2 focus:ring-field-100"\s*\/>/m,
    `list="common-breeds"
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100"
            />
            <datalist id="common-breeds">
              {COMMON_BREEDS.map((breed) => (
                <option key={breed} value={breed} />
              ))}
            </datalist>`
  );
  fs.writeFileSync('src/components/animals/AnimalForm.tsx', animalForm);
}

// 2. Update BullsSemenPage.tsx
let bullsSemen = fs.readFileSync('src/pages/BullsSemenPage.tsx', 'utf8');
if (!bullsSemen.includes('COMMON_BREEDS')) {
  bullsSemen = bullsSemen.replace(
    /import \{ getSemenStatusLabel, semenStatusOptions \} from '\.\.\/constants\/semenOptions';/g,
    "import { getSemenStatusLabel, semenStatusOptions } from '../constants/semenOptions';\nimport { COMMON_BREEDS } from '../constants/animalOptions';"
  );
  bullsSemen = bullsSemen.replace(
    /className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none \\nfocus:border-field-600 focus:ring-2 focus:ring-field-100"\s*\/>/m,
    `list="common-breeds"
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
                />
                <datalist id="common-breeds">
                  {COMMON_BREEDS.map((breed) => (
                    <option key={breed} value={breed} />
                  ))}
                </datalist>`
  );
  fs.writeFileSync('src/pages/BullsSemenPage.tsx', bullsSemen);
}