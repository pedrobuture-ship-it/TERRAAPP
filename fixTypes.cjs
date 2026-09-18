const fs = require('fs');
let content = fs.readFileSync('src/pages/BirthsPage.tsx', 'utf8');

content = content.replace(/calf_count: number;/g, "calf_count: string;");
content = content.replace(/calf_count: 1,/g, "calf_count: '1',");
content = content.replace(/calf_count: birth\.calf_count \?\? 1,/g, "calf_count: birth.calf_count ? String(birth.calf_count) : '1',");
content = content.replace(/editingBirth\.mother_id/g, "editingBirth.animal_id");

fs.writeFileSync('src/pages/BirthsPage.tsx', content);