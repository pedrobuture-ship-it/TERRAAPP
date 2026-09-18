const fs = require('fs');
let s = fs.readFileSync('src/services/pregnancyDiagnosesService.ts', 'utf8');

const updateRelatedInsemination = `async function updateRelatedInsemination(diagnosis: PregnancyDiagnosis) {
  if (!diagnosis.insemination_id) {
    return;
  }

  const relatedInsemination = await inseminationsService.getById(diagnosis.insemination_id);

  if (!relatedInsemination) {
    return;
  }

  const nextStatus = inseminationStatusFromDiagnosis(diagnosis.result);
  const cycleStatus = (diagnosis.result === 'negative' || diagnosis.result === 'aborted') ? 'closed' : 'active';

  await inseminationsService.update(diagnosis.insemination_id, {
    status: nextStatus,
    cycle_status: cycleStatus,
  });
}`;

s = s.replace(
  /export async function create/,
  `${updateRelatedInsemination}\n\nexport async function create`
);

fs.writeFileSync('src/services/pregnancyDiagnosesService.ts', s);