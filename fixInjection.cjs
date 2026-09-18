const fs = require('fs');
let page = fs.readFileSync('src/pages/BirthsPage.tsx', 'utf8');

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

  return (`;

page = page.replace(/\s+return \(\s*<PageShell/, hookInjection + "\n    <PageShell");
fs.writeFileSync('src/pages/BirthsPage.tsx', page);