const fs = require('fs');
let content = fs.readFileSync('src/services/genealogyService.ts', 'utf8');

// fix the botched replacement
content = content.replace("node.data.father_label = ID: ;", "node.data.father_label = `ID: ${animal.father_id.slice(0,8)}`;");

fs.writeFileSync('src/services/genealogyService.ts', content);