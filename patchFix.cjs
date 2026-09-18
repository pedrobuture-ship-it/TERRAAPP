const fs = require('fs');
let s = fs.readFileSync('src/pages/BirthsPage.tsx', 'utf8');

s = s.replace(
  /\}\);\n  \}\)\);\n  \}/,
  `});\n  }`
);

// line 771 error: check end of file
s = s.replace(/\}\n\s*\}\n$/, "}\n"); // try to fix extra bracket at the end

fs.writeFileSync('src/pages/BirthsPage.tsx', s);