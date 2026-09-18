const fs = require('fs');

// 1. InseminationsPage.tsx
let ins = fs.readFileSync('src/pages/InseminationsPage.tsx', 'utf8');
ins = ins.replace(
  /function isEligibleMatrix\(animal: Animal\) {([\s\S]*?)return ([\s\S]*?)!animal\.deleted_at\s*;/m,
  "function isEligibleMatrix(animal: Animal) {\n  return $2(animal.status === 'active' || animal.status === 'inactive') &&\n    !animal.deleted_at;"
);
ins = ins.replace(
  /\.filter\(isEligibleMatrix\)/g,
  ".filter((a) => isEligibleMatrix(a) || (editingInsemination && a.id === editingInsemination.animal_id))"
);
fs.writeFileSync('src/pages/InseminationsPage.tsx', ins);

// 2. BirthsPage.tsx
let births = fs.readFileSync('src/pages/BirthsPage.tsx', 'utf8');
births = births.replace(
  /if \(\n\s*animal\.sex !== 'female'/m,
  "if (editingBirth && animal.id === editingBirth.mother_id) return true;\n          if (\n            animal.sex !== 'female' ||\n            (animal.category !== 'matrix' && animal.category !== 'heifer') ||\n            (animal.status !== 'active' && animal.status !== 'inactive') ||\n            animal.reproductive_status === 'calved' ||"
);
births = births.replace(
  /animal\.sex !== 'female' \|\|\n\s*\(animal\.category !== 'matrix' && animal\.category !== 'heifer'\) \|\|\n\s*animal\.reproductive_status === 'calved'/m,
  "animal.sex !== 'female' ||\n            (animal.category !== 'matrix' && animal.category !== 'heifer') ||\n            (animal.status !== 'active' && animal.status !== 'inactive') ||\n            animal.reproductive_status === 'calved'"
);
fs.writeFileSync('src/pages/BirthsPage.tsx', births);

// 3. HealthManagementPage.tsx
let health = fs.readFileSync('src/pages/HealthManagementPage.tsx', 'utf8');
health = health.replace(
  /const animalOptions = useMemo\(\n\s*\(\) => \[\.\.\.animals\]\.sort/m,
  "const animalOptions = useMemo(\n      () => animals.filter(a => a.status === 'active' || a.status === 'inactive' || (editingRecord && a.id === editingRecord.animal_id)).sort"
);
fs.writeFileSync('src/pages/HealthManagementPage.tsx', health);

// 4. PregnancyDiagnosisPage.tsx
let preg = fs.readFileSync('src/pages/PregnancyDiagnosisPage.tsx', 'utf8');
preg = preg.replace(
  /function isMatrixAnimal\(animal: Animal\) {\n\s*return animal\.sex === 'female' && \(animal\.category === 'matrix' \|\| animal\.category === 'heifer'\);\n}/m,
  "function isMatrixAnimal(animal: Animal) {\n  return animal.sex === 'female' && (animal.category === 'matrix' || animal.category === 'heifer') && (animal.status === 'active' || animal.status === 'inactive');\n}"
);
preg = preg.replace(
  /\.filter\(isMatrixAnimal\)/g,
  ".filter((a) => isMatrixAnimal(a) || (editingDiagnosis && a.id === editingDiagnosis.animal_id))"
);
fs.writeFileSync('src/pages/PregnancyDiagnosisPage.tsx', preg);

// 5. LotsPaddocksPage.tsx
let lots = fs.readFileSync('src/pages/LotsPaddocksPage.tsx', 'utf8');
// For LotsPaddocksPage, we just filter the animals mapped for the select
lots = lots.replace(
  /\{animals\.map\(\(animal\) => \(/g,
  "{animals.filter(a => a.status === 'active' || a.status === 'inactive').map((animal) => ("
);
fs.writeFileSync('src/pages/LotsPaddocksPage.tsx', lots);