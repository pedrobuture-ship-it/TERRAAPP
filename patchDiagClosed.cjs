const fs = require('fs');
let s = fs.readFileSync('src/services/pregnancyDiagnosesService.ts', 'utf8');

const replacement = `const cycleStatus = (data.result === 'negative' || data.result === 'aborted') ? 'closed' : (data.id ? data.cycle_status : 'active');
  
  const record = await basePregnancyDiagnosesService.create({
    ...data,
    cycle_status: cycleStatus,
    expected_birth_date: data.expected_birth_date ?? relatedInsemination?.birth_due_date,
  });`;

s = s.replace(
  /const record = await basePregnancyDiagnosesService\.create\(\{\n\s*\.\.\.data,\n\s*expected_birth_date: data\.expected_birth_date \?\? relatedInsemination\?\.birth_due_date,\n\s*\}\);/,
  replacement
);

const replacementUpdate = `const cycleStatus = (data.result === 'negative' || data.result === 'aborted') ? 'closed' : (data.cycle_status ?? existing.cycle_status);

  const record = await basePregnancyDiagnosesService.update(id, {
    ...data,
    cycle_status: cycleStatus,
    expected_birth_date: data.expected_birth_date ?? relatedInsemination?.birth_due_date,
  });`;

s = s.replace(
  /const record = await basePregnancyDiagnosesService\.update\(id, \{\n\s*\.\.\.data,\n\s*expected_birth_date: data\.expected_birth_date \?\? relatedInsemination\?\.birth_due_date,\n\s*\}\);/,
  replacementUpdate
);

fs.writeFileSync('src/services/pregnancyDiagnosesService.ts', s);