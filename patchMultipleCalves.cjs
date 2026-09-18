const fs = require('fs');
let s = fs.readFileSync('src/pages/BirthsPage.tsx', 'utf8');

// 1. Update form interfaces
s = s.replace(
  /interface BirthFormState \{[\s\S]*?\n\}/,
  `interface CalfInput {
  identification: string;
  sex: AnimalSex;
  status: CalfStatus;
  weight_kg: string;
}

interface BirthFormState {
  animal_id: string;
  birth_date: string;
  birth_type: BirthType;
  calf_count: string;
  auto_create_calf: boolean;
  calves: CalfInput[];
  notes: string;
}`
);

s = s.replace(
  /const emptyForm: BirthFormState = \{[\s\S]*?\};/,
  `const emptyForm: BirthFormState = {
  animal_id: '',
  birth_date: todayDateString(),
  birth_type: 'normal',
  calf_count: '1',
  auto_create_calf: false,
  calves: [{ identification: '', sex: 'male', status: 'alive', weight_kg: '' }],
  notes: '',
};`
);

s = s.replace(
  /function birthToForm\(birth\?: Birth \| null\): BirthFormState \{[\s\S]*?\n\}/,
  `function birthToForm(birth?: Birth | null): BirthFormState {
  if (!birth) return emptyForm;
  
  const count = birth.calf_count ? Math.max(1, birth.calf_count) : 1;
  const idents = (birth.calf_identification || '').split(',').map(s => s.trim());
  const calves: CalfInput[] = [];
  
  for (let i = 0; i < count; i++) {
    calves.push({
      identification: idents[i] || '',
      sex: birth.calf_sex ?? 'male',
      status: birth.calf_status ?? 'alive',
      weight_kg: birth.birth_weight_kg ? String(birth.birth_weight_kg / count) : '',
    });
  }

  return {
    animal_id: birth.animal_id,
    birth_date: birth.birth_date,
    birth_type: birth.birth_type ?? 'normal',
    calf_count: String(count),
    auto_create_calf: false,
    calves,
    notes: birth.notes ?? '',
  };
}`
);

s = s.replace(
  /function updateForm<K extends keyof BirthFormState>\(field: K, value: BirthFormState\[K\]\) \{[\s\S]*?\}/,
  `function updateForm<K extends keyof BirthFormState>(field: K, value: BirthFormState[K]) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'calf_count') {
        const count = parseInt(value as string) || 1;
        const newCalves = [...current.calves];
        while (newCalves.length < count) {
          newCalves.push({ identification: '', sex: 'male', status: 'alive', weight_kg: '' });
        }
        if (newCalves.length > count) {
          newCalves.splice(count);
        }
        next.calves = newCalves;
      }
      return next;
    });
  }

  function updateCalf(index: number, field: keyof CalfInput, value: string) {
    setForm((current) => {
      const newCalves = [...current.calves];
      newCalves[index] = { ...newCalves[index], [field]: value };
      return { ...current, calves: newCalves };
    });
  }`
);

s = s.replace(
  /async function handleSubmit\(event: FormEvent<HTMLFormElement>\) \{[\s\S]*?catch \(birthError\) \{[\s\S]*?throw birthError;\n\s*\}\n\s*setMessage\(\n\s*calfCreated\n\s*\? 'Parto registrado e bezerro cadastrado com sucesso\.'\n\s*: 'Parto registrado com sucesso\.',\n\s*\);\n\s*\}/,
  `async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const calfCount = parseInteger(form.calf_count) ?? 1;

    if (!form.animal_id) {
      setError('Selecione uma matriz prenha.');
      setSaving(false);
      return;
    }

    if (!form.birth_date || isFutureDate(form.birth_date)) {
      setError('Informe uma data de parto válida.');
      setSaving(false);
      return;
    }

    if (calfCount < 1) {
      setError('Informe a quantidade de bezerros.');
      setSaving(false);
      return;
    }
    
    let totalWeight = 0;
    let hasAlive = false;
    let firstSex: AnimalSex = 'male';

    for (let i = 0; i < form.calves.length; i++) {
      const calf = form.calves[i];
      const w = parseDecimal(calf.weight_kg);
      if (w !== undefined && (Number.isNaN(w) || w < 0)) {
        setError(\`Informe um peso válido para o bezerro \${i + 1}.\`);
        setSaving(false);
        return;
      }
      if (w) totalWeight += w;
      if (calf.status === 'alive') hasAlive = true;
      if (i === 0) firstSex = calf.sex;
      
      if (calf.status === 'alive' && form.auto_create_calf && !calf.identification.trim()) {
        setError(\`Informe a identificação do bezerro \${i + 1} para cadastrar automaticamente.\`);
        setSaving(false);
        return;
      }
    }

    const allIdents = form.calves.map(c => c.identification.trim()).filter(Boolean);
    const uniqueIdents = new Set(allIdents.map(id => id.toLocaleLowerCase('pt-BR')));
    if (uniqueIdents.size < allIdents.length) {
      setError('Existem identificações de bezerros duplicadas neste formulário.');
      setSaving(false);
      return;
    }

    if (form.auto_create_calf) {
      const existingDuplicateCalf = animals.some((animal) =>
        uniqueIdents.has(animal.identification.trim().toLocaleLowerCase('pt-BR')),
      );

      if (existingDuplicateCalf) {
        setError('Já existe um animal com a identificação informada para um dos bezerros.');
        setSaving(false);
        return;
      }
    }

    const outcome: BirthOutcome = hasAlive ? 'alive' : 'stillborn';
    const averageWeight = totalWeight > 0 ? (totalWeight / form.calves.length) : undefined;
    const finalIdentification = allIdents.join(', ') || undefined;

    try {
      const payload = {
        animal_id: form.animal_id,
        birth_date: form.birth_date,
        birth_type: form.birth_type,
        calf_count: calfCount,
        calf_sex: firstSex,
        calf_status: hasAlive ? 'alive' : 'dead',
        calf_identification: finalIdentification,
        birth_weight_kg: averageWeight,
        calf_id: editingBirth?.calf_id,
        outcome,
        notes: cleanText(form.notes),
      } satisfies birthsService.CreateBirthInput;

      if (editingBirth) {
        let createdCalves: Animal[] = [];
        let anyCreated = false;

        try {
          if (form.auto_create_calf) {
            const matrix = animals.find((a) => a.id === form.animal_id);
            const calvesToCreate = form.calves.filter(c => c.status === 'alive' && c.identification.trim());
            
            for (const calfInput of calvesToCreate) {
              const newCalf = await animalsService.create({
                identification: calfInput.identification.trim(),
                sex: calfInput.sex,
                category: 'calf',
                status: 'active',
                birth_date: form.birth_date,
                weight_kg: parseDecimal(calfInput.weight_kg),
                mother_id: matrix?.id,
                lot_id: matrix?.lot_id,
              });
              createdCalves.push(newCalf);
              anyCreated = true;
            }
          }

          await birthsService.update(editingBirth.id, {
            ...payload,
            calf_id: createdCalves.length > 0 ? createdCalves[0].id : payload.calf_id,
          });
        } catch (birthError) {
          if (createdCalves.length > 0) {
            for (const c of createdCalves) {
              await animalsService.deleteAnimal(c.id).catch(() => undefined);
            }
          }
          throw birthError;
        }

        setMessage(
          anyCreated
            ? 'Parto atualizado e bezerros cadastrados com sucesso.'
            : 'Parto atualizado com sucesso.',
        );
      } else {
        let createdCalves: Animal[] = [];
        let anyCreated = false;

        try {
          if (form.auto_create_calf) {
            const matrix = animals.find((a) => a.id === form.animal_id);
            const calvesToCreate = form.calves.filter(c => c.status === 'alive' && c.identification.trim());
            
            for (const calfInput of calvesToCreate) {
              const newCalf = await animalsService.create({
                identification: calfInput.identification.trim(),
                sex: calfInput.sex,
                category: 'calf',
                status: 'active',
                birth_date: form.birth_date,
                weight_kg: parseDecimal(calfInput.weight_kg),
                mother_id: matrix?.id,
                lot_id: matrix?.lot_id,
              });
              createdCalves.push(newCalf);
              anyCreated = true;
            }
          }

          await birthsService.create({
            ...payload,
            calf_id: createdCalves.length > 0 ? createdCalves[0].id : payload.calf_id,
          });
        } catch (birthError) {
          if (createdCalves.length > 0) {
            for (const c of createdCalves) {
              await animalsService.deleteAnimal(c.id).catch(() => undefined);
            }
          }
          throw birthError;
        }

        setMessage(
          anyCreated
            ? 'Parto registrado e bezerros cadastrados com sucesso.'
            : 'Parto registrado com sucesso.',
        );
      }`
);

s = s.replace(
  /<label className="block">\s*<span className="text-sm font-medium text-slate-700">Sexo do bezerro<\/span>[\s\S]*?<\/label>\s*<label className="block">\s*<span className="text-sm font-medium text-slate-700">Status do bezerro<\/span>[\s\S]*?<\/label>\s*\{form\.calf_status === 'alive' \? \([\s\S]*?\} : null\}/,
  `{form.calves.map((calf, index) => (
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
            ))}`
);

s = s.replace(
  /<label className="block">\s*<span className="text-sm font-medium text-slate-700">Peso ao nascer \(kg\)<\/span>[\s\S]*?<\/label>/,
  ``
);

fs.writeFileSync('src/pages/BirthsPage.tsx', s);