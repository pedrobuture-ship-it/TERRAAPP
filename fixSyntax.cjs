const fs = require('fs');
let lines = fs.readFileSync('src/pages/BirthsPage.tsx', 'utf8').split('\n');
lines.splice(601, 2); // remove 601 and 602
fs.writeFileSync('src/pages/BirthsPage.tsx', lines.join('\n'));