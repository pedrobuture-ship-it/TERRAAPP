const fs = require('fs');
let form = fs.readFileSync('src/components/animals/AnimalForm.tsx', 'utf8');

// Replace imports
if (!form.includes('COMMON_BREEDS')) {
  form = form.replace(
    /import { getAnimalCategoryLabel } from '\.\.\/\.\.\/constants\/animalOptions';/,
    "import { getAnimalCategoryLabel, COMMON_BREEDS } from '../../constants/animalOptions';"
  );
}

// Find the input block for breed
const target1 = `onChange={(event) => updateField('breed', event.target.value)}
              placeholder="Ex.: Nelore"
              maxLength={100}
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100"
            />`;
const replacement1 = `onChange={(event) => updateField('breed', event.target.value)}
              placeholder="Ex.: Nelore"
              maxLength={100}
              list="common-breeds"
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100"
            />
            <datalist id="common-breeds">
              {COMMON_BREEDS.map((breed) => (
                <option key={breed} value={breed} />
              ))}
            </datalist>`;

if (form.includes(target1)) {
  form = form.replace(target1, replacement1);
} else {
  // Try alternative whitespace handling
  const r = /onChange=\{\(event\) => updateField\('breed', event\.target\.value\)\}[\s\S]*?className="[\s\S]*?"\s*\/>/m;
  const match = form.match(r);
  if (match) {
    let replaced = match[0].replace('/>', `list="common-breeds" />\n<datalist id="common-breeds">{COMMON_BREEDS.map((b) => (<option key={b} value={b} />))}</datalist>`);
    form = form.replace(match[0], replaced);
  }
}

fs.writeFileSync('src/components/animals/AnimalForm.tsx', form);

let semen = fs.readFileSync('src/pages/BullsSemenPage.tsx', 'utf8');
if (!semen.includes('COMMON_BREEDS')) {
  semen = semen.replace(
    /import { getSemenStatusLabel, semenStatusOptions } from '\.\.\/constants\/semenOptions';/,
    "import { getSemenStatusLabel, semenStatusOptions } from '../constants/semenOptions';\nimport { COMMON_BREEDS } from '../constants/animalOptions';"
  );
}
const r2 = /onChange=\{\(event\) => updateForm\('breed', event\.target\.value\)\}[\s\S]*?className="[\s\S]*?"\s*\/>/m;
const match2 = semen.match(r2);
if (match2 && !semen.includes('common-breeds')) {
  let replaced2 = match2[0].replace('/>', `list="common-breeds" />\n<datalist id="common-breeds">{COMMON_BREEDS.map((b) => (<option key={b} value={b} />))}</datalist>`);
  semen = semen.replace(match2[0], replaced2);
}
fs.writeFileSync('src/pages/BullsSemenPage.tsx', semen);
