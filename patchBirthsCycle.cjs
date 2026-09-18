const fs = require('fs');
let b = fs.readFileSync('src/services/birthsService.ts', 'utf8');

const newEvidence = `async function matrixHasPregnancyEvidence(record: Birth) {
  const activeDiagnosis = (await db.pregnancyDiagnoses.where('animal_id').equals(record.animal_id).toArray())
    .filter((d) => !d.deleted_at && d.result === 'pregnant' && d.cycle_status === 'active');
    
  return activeDiagnosis.length > 0;
}`;

b = b.replace(/async function matrixHasPregnancyEvidence\(record: Birth\) \{[\s\S]*?return false;\n\}/, newEvidence);

// Inject cycle closure in `setMatrixStatus` or `create`/`update`
// It's cleaner to inject inside `create` and `update` directly.
const closeCycleCode = `
  const activeInseminations = await db.inseminations.where('animal_id').equals(record.animal_id).toArray();
  for (const ins of activeInseminations) {
    if (!ins.deleted_at && ins.cycle_status === 'active') {
      await db.inseminations.update(ins.id, { cycle_status: 'closed' });
    }
  }
  
  const activeDiagnoses = await db.pregnancyDiagnoses.where('animal_id').equals(record.animal_id).toArray();
  for (const diag of activeDiagnoses) {
    if (!diag.deleted_at && diag.cycle_status === 'active') {
      await db.pregnancyDiagnoses.update(diag.id, { cycle_status: 'closed' });
    }
  }
`;

b = b.replace(
  /export async function create\(data: CreateBirthInput\) \{[\s\S]*?return record;\n\}/,
  `export async function create(data: CreateBirthInput) {
  const record = await baseBirthsService.create(data);
  await setMatrixStatus(record.animal_id, 'empty');
${closeCycleCode}
  return record;
}`
);

b = b.replace(
  /export async function update\(id: string, data: UpdateBirthInput\) \{[\s\S]*?return record;\n\}/,
  `export async function update(id: string, data: UpdateBirthInput) {
  const existing = await baseBirthsService.getById(id);
  if (!existing) throw new Error('Parto não encontrado.');

  const record = await baseBirthsService.update(id, data);
  await setMatrixStatus(record.animal_id, 'empty');

  if (existing.animal_id !== record.animal_id) {
    await refreshMatrixStatus(existing.animal_id);
  }
${closeCycleCode}
  return record;
}`
);

fs.writeFileSync('src/services/birthsService.ts', b);