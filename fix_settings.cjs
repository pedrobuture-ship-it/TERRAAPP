const fs = require('fs');
let content = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

// 1. Remove compact_mode and dark_mode from FarmSettingsFormState
content = content.replace('  compact_mode: boolean;\n  dark_mode: boolean;\n', '');
content = content.replace('  compact_mode: false,\n  dark_mode: false,\n', '');
content = content.replace('    compact_mode: Boolean(settings?.app_preferences?.compact_mode),\n    dark_mode: Boolean(settings?.app_preferences?.dark_mode),\n', '');
content = content.replace('      compact_mode: form.compact_mode,\n      dark_mode: form.dark_mode,\n', '');

// 2. Remove the DOM class toggling from handleSubmit
content = content.replace(/      if \(savedSettings\.app_preferences\?\.compact_mode\) \{\s*document\.body\.classList\.add\('compact-mode'\);\s*\} else \{\s*document\.body\.classList\.remove\('compact-mode'\);\s*\}\s*if \(savedSettings\.app_preferences\?\.dark_mode\) \{\s*document\.documentElement\.classList\.add\('dark'\);\s*\} else \{\s*document\.documentElement\.classList\.remove\('dark'\);\s*\}/, '');

// 3. Add local states for compactMode and darkMode inside SettingsPage
const stateToAdd = `
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem('terra_compact_mode') === 'true');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('terra_dark_mode') === 'true');

  function toggleCompactMode(val) {
    setCompactMode(val);
    localStorage.setItem('terra_compact_mode', String(val));
    if (val) document.body.classList.add('compact-mode');
    else document.body.classList.remove('compact-mode');
  }

  function toggleDarkMode(val) {
    setDarkMode(val);
    localStorage.setItem('terra_dark_mode', String(val));
    if (val) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }
`;

content = content.replace('  const [settings, setSettings] = useState<FarmSettings | undefined>();', stateToAdd + '\n  const [settings, setSettings] = useState<FarmSettings | undefined>();');

// 4. Change "Preferências do app" to "Alertas da Fazenda" and remove the checkboxes
const checkboxesToRemove = `                  <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.compact_mode}
                      onChange={(event) => updateForm('compact_mode', event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-field-600 focus:ring-field-600"
                    />
                    Modo compacto
                  </label>

                  <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.dark_mode}
                      onChange={(event) => updateForm('dark_mode', event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-field-600 focus:ring-field-600"
                    />
                    Modo escuro
                  </label>

`;

content = content.replace('Preferências do app', 'Alertas da fazenda');
content = content.replace(checkboxesToRemove, '');
content = content.replace('md:grid-cols-3', 'md:grid-cols-2');

// 5. Add a new section for Configurações do Aplicativo above the Farm Settings
const appSettingsUI = `            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-950">Configurações do Aplicativo</h3>
              <p className="mt-1 mb-4 text-sm leading-6 text-slate-600">
                Essas preferências afetam apenas como você vê o aplicativo neste dispositivo.
              </p>
              
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={compactMode}
                    onChange={(event) => toggleCompactMode(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-field-600 focus:ring-field-600"
                  />
                  Modo compacto (telas menores)
                </label>

                <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(event) => toggleDarkMode(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-field-600 focus:ring-field-600"
                  />
                  Modo escuro
                </label>
              </div>
            </section>
`;

content = content.replace('<div className="space-y-6">', '<div className="space-y-6">\n' + appSettingsUI);

fs.writeFileSync('src/pages/SettingsPage.tsx', content, 'utf8');
console.log('Done!');
