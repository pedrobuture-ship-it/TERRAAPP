const fs = require('fs');
let lines = fs.readFileSync('src/pages/BirthsPage.tsx', 'utf8').split('\n');
// We want to delete lines 605 and 606. Wait, let's verify what they are exactly.
console.log("603:", lines[603]);
console.log("604:", lines[604]);
console.log("605:", lines[605]);
console.log("606:", lines[606]);