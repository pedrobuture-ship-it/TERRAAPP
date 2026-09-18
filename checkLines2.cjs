const fs = require('fs');
let lines = fs.readFileSync('src/pages/BirthsPage.tsx', 'utf8').split('\n');
for (let i = 595; i <= 605; i++) {
  console.log(i + ": " + lines[i]);
}