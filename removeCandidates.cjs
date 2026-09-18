const fs = require('fs');

// 1. Atualizar genealogyService.ts
let serviceContent = fs.readFileSync('src/services/genealogyService.ts', 'utf8');
const candidateRegex = /\/\/ 5\. Edges de semen disponivel para matrizes \(candidatos\).*?(?=return \{ nodes, edges \};)/s;
serviceContent = serviceContent.replace(candidateRegex, '');
fs.writeFileSync('src/services/genealogyService.ts', serviceContent);

// 2. Atualizar GenealogyPage.tsx
let pageContent = fs.readFileSync('src/pages/GenealogyPage.tsx', 'utf8');

// Remover lógicas do semen_source nas edges iniciais
pageContent = pageContent.replace(
  /animated: e\.type === 'semen_source',/g,
  "animated: false,"
);
pageContent = pageContent.replace(
  /strokeDasharray: e\.type === 'semen_source' \? '5,5' : undefined,/g,
  "strokeDasharray: undefined,"
);
pageContent = pageContent.replace(
  /stroke: e\.type === 'semen_source' \? '#8b5cf6' : '#94a3b8',/g,
  "stroke: '#94a3b8',"
);

// Remover item da legenda
pageContent = pageContent.replace(
  /<div className="flex items-center gap-2"><div className="h-0\.5 w-4 border-t-2 border-dashed border-purple-500" \/> Uso Sêmen<\/div>/g,
  ""
);

fs.writeFileSync('src/pages/GenealogyPage.tsx', pageContent);