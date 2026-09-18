const fs = require('fs');

let content = fs.readFileSync('src/routes/appRoutes.tsx', 'utf-8');

// 1. Add GitFork to imports
content = content.replace(
  '  DatabaseBackup,',
  '  DatabaseBackup,\n  GitFork,'
);

// 2. Add GenealogyPage to imports
content = content.replace(
  "import { SettingsPage } from '../pages/SettingsPage';",
  "import { SettingsPage } from '../pages/SettingsPage';\nimport { GenealogyPage } from '../pages/GenealogyPage';"
);

// 3. Add the route before 'configuracoes'
const genealogyRoute = `  {
    id: 'genealogia',
    path: '/genealogy',
    label: 'Genealogia',
    shortLabel: 'Gen.',
    icon: GitFork,
    Component: GenealogyPage,
  },
`;

content = content.replace(
  "  {\n    id: 'configuracoes',",
  genealogyRoute + "  {\n    id: 'configuracoes',"
);

fs.writeFileSync('src/routes/appRoutes.tsx', content, 'utf-8');
console.log('done');
