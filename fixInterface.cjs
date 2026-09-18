const fs = require('fs');
let content = fs.readFileSync('src/services/genealogyService.ts', 'utf8');

content = content.replace(
  "insemination_count?: number;\n}",
  "insemination_count?: number;\n  father_label?: string;\n}"
);
content = content.replace(
  "insemination_count?: number;\r\n}",
  "insemination_count?: number;\r\n  father_label?: string;\r\n}"
);

fs.writeFileSync('src/services/genealogyService.ts', content);