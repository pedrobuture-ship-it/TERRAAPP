const fs = require('fs');
let s = fs.readFileSync('src/pages/BirthsPage.tsx', 'utf8');

// 1. Remove auto_create_calf validation check and replace with mandatory check
s = s.replace(
  /if \(calf\.status === 'alive' && form\.auto_create_calf && !calf\.identification\.trim\(\)\) \{[\s\S]*?return;\n\s*\}/,
  `if (calf.status === 'alive' && !calf.identification.trim()) {
        setError(\`A identificação do bezerro \${i + 1} é obrigatória para bezerros vivos.\`);
        setSaving(false);
        return;
      }`
);

// 2. Wrap existingDuplicateCalf check in !editingBirth so it doesn't block edits of existing births
s = s.replace(
  /if \(form\.auto_create_calf\) \{\n\s*const existingDuplicateCalf = animals\.some\(\(animal\) =>\n\s*uniqueIdents\.has\(animal\.identification\.trim\(\)\.toLocaleLowerCase\('pt-BR'\)\),\n\s*\);\n\n\s*if \(existingDuplicateCalf\) \{\n\s*setError\('Já existe um animal com a identificação informada para um dos bezerros\.'\);\n\s*setSaving\(false\);\n\s*return;\n\s*\}\n\s*\}/,
  `if (!editingBirth) {
      const existingDuplicateCalf = animals.some((animal) =>
        uniqueIdents.has(animal.identification.trim().toLocaleLowerCase('pt-BR')),
      );

      if (existingDuplicateCalf) {
        setError('Já existe um animal cadastrado com a identificação informada para um dos bezerros.');
        setSaving(false);
        return;
      }
    }`
);

// 3. In the editingBirth block, remove the calf creation logic, just update the birth.
s = s.replace(
  /if \(editingBirth\) \{[\s\S]*?setMessage\([\s\S]*?\);\n\s*\} else \{/,
  `if (editingBirth) {
        await birthsService.update(editingBirth.id, {
          ...payload,
          calf_id: editingBirth.calf_id,
        });

        setMessage('Parto atualizado com sucesso.');
      } else {`
);

// 4. In the creation block, remove the if (form.auto_create_calf) check since it's mandatory now
s = s.replace(
  /if \(form\.auto_create_calf\) \{\n\s*const matrix = animals\.find\(\(a\) => a\.id === form\.animal_id\);\n\s*const calvesToCreate = form\.calves\.filter\(c => c\.status === 'alive' && c\.identification\.trim\(\)\);[\s\S]*?anyCreated = true;\n\s*\}\n\s*\}/,
  `const matrix = animals.find((a) => a.id === form.animal_id);
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
            }`
);

// 5. Update the UI block for calf.status === 'alive' to remove the checkbox and always show identification
s = s.replace(
  /\{calf\.status === 'alive' \? \([\s\S]*?\) : null\}/,
  `{calf.status === 'alive' ? (
                    <label className="block sm:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Identificação do bezerro {index + 1} *</span>
                      <input
                        value={calf.identification}
                        onChange={(event) => updateCalf(index, 'identification', event.target.value)}
                        placeholder={\`Ex.: BZ-00\${index + 1}\`}
                        maxLength={50}
                        className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
                      />
                    </label>
                  ) : null}`
);

// Also remove the "Cadastrar automaticamente..." text at the bottom of the form
s = s.replace(
  /<div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">\n\s*<Baby size=\{18\} className="mb-2 text-field-700" aria-hidden="true" \/>\n\s*Bezerros vivos podem ser cadastrados automaticamente em Animais com categoria bezerro.\n\s*<\/div>/,
  `<div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        <Baby size={18} className="mb-2 text-field-700" aria-hidden="true" />
        Todo bezerro nascido vivo é cadastrado automaticamente no inventário de Animais para manter o rebanho sincronizado.
      </div>`
);

fs.writeFileSync('src/pages/BirthsPage.tsx', s);