const fs = require('fs');
let page = fs.readFileSync('src/pages/BirthsPage.tsx', 'utf8');

// 1. Add AlertTriangle import
page = page.replace(
  /import \{ Baby, Edit, Plus, Save, Trash2, X \} from 'lucide-react';/,
  "import { Baby, Edit, Plus, Save, Trash2, X, AlertTriangle } from 'lucide-react';"
);

// 2. Add daysBetweenDateStrings import
page = page.replace(
  /import \{ todayDateString, isFutureDate \} from '\.\.\/utils\/date';/,
  "import { todayDateString, isFutureDate, daysBetweenDateStrings } from '../utils/date';"
);

// 3. Inject the derived state before return (
const hookInjection = `
  const shortIntervalWarning = useMemo(() => {
    if (!formOpen || !form.animal_id || !form.birth_date) return null;

    const previousBirths = births.filter(
      (b) => b.animal_id === form.animal_id && (!editingBirth || b.id !== editingBirth.id)
    );

    if (previousBirths.length === 0) return null;

    for (const b of previousBirths) {
      const diff = Math.abs(daysBetweenDateStrings(b.birth_date, form.birth_date));
      if (diff < 300) {
        return diff;
      }
    }
    return null;
  }, [formOpen, form.animal_id, form.birth_date, births, editingBirth]);

  return (
`;
page = page.replace(/\s+return \(\s*<PageShell>/, hookInjection + "    <PageShell>");

// 4. Inject the warning UI before the buttons
const uiInjection = `
            {shortIntervalWarning !== null && (
              <div className="mt-4 sm:col-span-2 flex gap-3 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 border border-yellow-200">
                <AlertTriangle size={20} className="shrink-0 mt-0.5 text-yellow-600" aria-hidden="true" />
                <p>
                  <strong>Atenção:</strong> O intervalo entre este evento e outro parto da mesma matriz é de apenas <strong>{shortIntervalWarning} dias</strong> (menor que 10 meses).<br/>
                  Biologicamente, isso é improvável para um parto a termo. Verifique se há erro de digitação ou certifique-se de preencher o status como "Aborto".
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
`;
page = page.replace(/\s*<div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">/, uiInjection);

fs.writeFileSync('src/pages/BirthsPage.tsx', page);