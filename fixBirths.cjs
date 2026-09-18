const fs = require('fs');

let births = fs.readFileSync('src/pages/BirthsPage.tsx', 'utf8');

// Replace the entire matrixOptions block safely
const start = births.indexOf('const matrixOptions = useMemo(');
const end = births.indexOf('const sortedBirths = useMemo(');

const newBlock = `const matrixOptions = useMemo(
    () =>
      animals
        .filter((animal) => {
          if (editingBirth && animal.id === editingBirth.mother_id) return true;
          if (
            animal.sex !== 'female' ||
            (animal.category !== 'matrix' && animal.category !== 'heifer') ||
            (animal.status !== 'active' && animal.status !== 'inactive') ||
            animal.reproductive_status === 'calved' ||
            animal.reproductive_status === 'discarded'
          ) {
            return false;
          }

          const latestConclusiveDiagnosis = diagnoses
            .filter(
              (diagnosis) =>
                diagnosis.animal_id === animal.id && diagnosis.result !== 'inconclusive',
            )
            .sort((a, b) => b.diagnosis_date.localeCompare(a.diagnosis_date))[0];

          return latestConclusiveDiagnosis?.result === 'pregnant';
        })
        .sort((a, b) => a.identification.localeCompare(b.identification, 'pt-BR')),
    [animals, diagnoses, editingBirth],
  );

  `;

births = births.substring(0, start) + newBlock + births.substring(end);
fs.writeFileSync('src/pages/BirthsPage.tsx', births);