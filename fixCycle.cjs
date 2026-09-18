const fs = require('fs');

let service = fs.readFileSync('src/services/birthsService.ts', 'utf8');

const newEvidenceFunc = `async function matrixHasPregnancyEvidence(record: Birth) {
  const matrix = await animalsService.getById(record.animal_id);
  if (!matrix) return false;

  if (matrix.reproductive_status === 'pregnant') {
    return true;
  }

  const previousBirths = (await db.births.where('animal_id').equals(record.animal_id).toArray())
    .filter((b) => !b.deleted_at && b.id !== record.id && b.birth_date <= record.birth_date)
    .sort((a, b) => b.birth_date.localeCompare(a.birth_date));
  const lastBirth = previousBirths[0];

  const positiveDiagnoses = (await db.pregnancyDiagnoses.where('animal_id').equals(record.animal_id).toArray())
    .filter((d) => !d.deleted_at && d.result === 'pregnant' && d.diagnosis_date <= record.birth_date)
    .sort((a, b) => b.diagnosis_date.localeCompare(a.diagnosis_date));
  const lastDiagnosis = positiveDiagnoses[0];

  if (lastDiagnosis) {
    if (!lastBirth || lastDiagnosis.diagnosis_date >= lastBirth.birth_date) {
      return true;
    }
  }

  return false;
}`;

// Replace function
service = service.replace(
  /async function matrixHasPregnancyEvidence\(animalId: string\) \{[\s\S]*?return Boolean\(positiveDiagnosis\);\n\}/,
  newEvidenceFunc
);

// Replace call in validateBirth
service = service.replace(
  /if \(!\(await matrixHasPregnancyEvidence\(record\.animal_id\)\)\) \{/,
  "if (!(await matrixHasPregnancyEvidence(record))) {"
);

fs.writeFileSync('src/services/birthsService.ts', service);