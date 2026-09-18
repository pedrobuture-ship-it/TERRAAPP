const fs = require('fs');
let content = fs.readFileSync('src/services/birthsService.ts', 'utf8');

// Replace the hardcoded 'calved' assignments in create and update
content = content.replace(/await setMatrixStatus\(record.animal_id, 'calved'\);/g, "await setMatrixStatus(record.animal_id, 'empty');");

// Replace refreshMatrixStatus logic to be time-aware
const newRefresh = `async function refreshMatrixStatus(animalId: string) {
  const latestBirth = (await db.births.where('animal_id').equals(animalId).toArray())
    .filter((birth) => !birth.deleted_at)
    .sort((a, b) => b.birth_date.localeCompare(a.birth_date))[0];

  const latestDiagnosis = (await db.pregnancyDiagnoses.where('animal_id').equals(animalId).toArray())
    .filter((diagnosis) => !diagnosis.deleted_at && diagnosis.result !== 'inconclusive')
    .sort((a, b) => b.diagnosis_date.localeCompare(a.diagnosis_date))[0];

  const latestInsemination = (await inseminationsService.list())
    .filter((insemination) => insemination.animal_id === animalId)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  const bDate = latestBirth?.birth_date || '';
  const dDate = latestDiagnosis?.diagnosis_date || '';
  const iDate = latestInsemination?.date || '';

  // Find which event is the most recent
  if (bDate && bDate >= dDate && bDate >= iDate) {
    await setMatrixStatus(animalId, 'empty');
    return;
  }

  if (dDate && dDate >= bDate && dDate >= iDate) {
    await setMatrixStatus(animalId, latestDiagnosis!.result === 'pregnant' ? 'pregnant' : 'empty');
    return;
  }

  if (iDate && iDate >= bDate && iDate >= dDate) {
    await setMatrixStatus(
      animalId,
      latestInsemination!.status === 'positive'
        ? 'pregnant'
        : latestInsemination!.status === 'negative' || latestInsemination!.status === 'aborted'
          ? 'empty'
          : 'inseminated'
    );
    return;
  }

  await setMatrixStatus(animalId, 'empty');
}`;

content = content.replace(/async function refreshMatrixStatus[\s\S]*?await setMatrixStatus\(animalId, 'empty'\);\n\}/, newRefresh);

fs.writeFileSync('src/services/birthsService.ts', content);