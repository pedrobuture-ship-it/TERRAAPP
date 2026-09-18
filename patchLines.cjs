const fs = require('fs');
const lines = fs.readFileSync('src/pages/BirthsPage.tsx', 'utf8').split('\n');

const replacement = `{form.calves.map((calf, index) => (
              <div key={index} className="sm:col-span-2 rounded-lg border border-slate-200 p-4 bg-slate-50 space-y-4">
                <h4 className="font-semibold text-slate-700">Bezerro {index + 1}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Sexo</span>
                    <select
                      value={calf.sex}
                      onChange={(event) => updateCalf(index, 'sex', event.target.value as AnimalSex)}
                      className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
                    >
                      <option value="female">Fêmea</option>
                      <option value="male">Macho</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Status</span>
                    <select
                      value={calf.status}
                      onChange={(event) => updateCalf(index, 'status', event.target.value as CalfStatus)}
                      className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
                    >
                      {calfStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Peso (kg)</span>
                    <input
                      type="text"
                      value={calf.weight_kg}
                      onChange={(event) => updateCalf(index, 'weight_kg', event.target.value.replace(/[^0-9,]/g, ''))}
                      placeholder="Ex.: 35,5"
                      inputMode="decimal"
                      className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
                    />
                  </label>

                  {calf.status === 'alive' ? (
                    <div className="rounded-lg border border-field-100 bg-field-50 p-3 sm:col-span-2">
                      <label className="flex items-start gap-3 text-sm font-medium text-field-700">
                        {index === 0 && (
                          <input
                            type="checkbox"
                            checked={form.auto_create_calf}
                            onChange={(event) => updateForm('auto_create_calf', event.target.checked)}
                            className="mt-1"
                            disabled={Boolean(editingBirth)}
                          />
                        )}
                        {index === 0 ? 'Cadastrar automaticamente os bezerros em Animais' : 'Identificação deste bezerro'}
                      </label>
                      {form.auto_create_calf ? (
                        <label className="mt-3 block">
                          <span className="text-sm font-medium text-slate-700">Identificação do bezerro {index + 1}</span>
                          <input
                            value={calf.identification}
                            onChange={(event) => updateCalf(index, 'identification', event.target.value)}
                            placeholder={\`Ex.: BZ-00\${index + 1}\`}
                            maxLength={50}
                            className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
                          />
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}`;

// Slice lines out 
// line 585 is index 584
lines.splice(584, 647 - 584 + 1, replacement);

fs.writeFileSync('src/pages/BirthsPage.tsx', lines.join('\n'));