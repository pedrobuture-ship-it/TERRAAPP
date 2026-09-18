const fs = require('fs');
let v = fs.readFileSync('src/utils/validation.ts', 'utf8');

if (!v.includes('assertPastOrTodayDate')) {
  v = v.replace(
    /import \{ isValidDateString \} from '.\/date';/,
    "import { isValidDateString, isFutureDate } from './date';"
  );
  v += `\nexport function assertPastOrTodayDate(value: unknown, fieldName: string) {
  assertRequiredDate(value, fieldName);
  if (typeof value === 'string' && isFutureDate(value)) {
    throw new ValidationError(\`\${fieldName} não pode ser uma data futura.\`);
  }
}\n`;
  fs.writeFileSync('src/utils/validation.ts', v);
}