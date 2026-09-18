const fs = require('fs');
let content = fs.readFileSync('src/pages/GenealogyPage.tsx', 'utf8');

content = content.replace(
  "Pai: {data.father_label || 'Desconhecido'}",
  "Pai: {String(data.father_label || 'Desconhecido')}"
);
content = content.replace(
  "Pai: {data.father_label || 'Desconhecido'}",
  "Pai: {String(data.father_label || 'Desconhecido')}"
);

fs.writeFileSync('src/pages/GenealogyPage.tsx', content);