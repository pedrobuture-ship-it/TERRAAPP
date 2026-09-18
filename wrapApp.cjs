const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

if (!app.includes('ErrorBoundary')) {
  app = app.replace(
    /import \{ AppLayout \} from '.\/layouts\/AppLayout';/,
    "import { AppLayout } from './layouts/AppLayout';\nimport { ErrorBoundary } from './components/layout/ErrorBoundary';"
  );
  app = app.replace(
    /<Routes>/,
    "<ErrorBoundary>\n    <Routes>"
  );
  app = app.replace(
    /<\/Routes>/,
    "</Routes>\n    </ErrorBoundary>"
  );
  fs.writeFileSync('src/App.tsx', app);
}