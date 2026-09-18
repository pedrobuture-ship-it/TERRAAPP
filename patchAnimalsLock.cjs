const fs = require('fs');

let a = fs.readFileSync('src/services/animalsService.ts', 'utf8');

// Replace the delete exported function
a = a.replace(
  /export const \{ create, delete: deleteAnimal, list, getById \} = animalsService;/,
  `export const { create, list, getById } = animalsService;
const originalDeleteAnimal = animalsService.delete;
export async function deleteAnimal(id: string) {
  const asMother = await db.births.where('animal_id').equals(id).filter(b => !b.deleted_at).count();
  const asInsemAnimal = await db.inseminations.where('animal_id').equals(id).filter(i => !i.deleted_at).count();
  const asInsemBull = await db.inseminations.where('bull_id').equals(id).filter(i => !i.deleted_at).count();
  if (asMother > 0 || asInsemAnimal > 0 || asInsemBull > 0) {
    throw new Error('Não é possível excluir este animal pois ele possui histórico reprodutivo (partos ou inseminações).');
  }
  return originalDeleteAnimal(id);
}`
);

fs.writeFileSync('src/services/animalsService.ts', a);