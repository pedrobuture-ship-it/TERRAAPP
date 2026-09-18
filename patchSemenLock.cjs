const fs = require('fs');

let a = fs.readFileSync('src/services/semenService.ts', 'utf8');

a = a.replace(
  /export const \{ create, update, delete: deleteSemen, list, getById \} = semenService;/,
  `export const { create, update, list, getById } = semenService;
const originalDeleteSemen = semenService.delete;
export async function deleteSemen(id: string) {
  const usedInInsem = await db.inseminations.where('semen_id').equals(id).filter((i) => !i.deleted_at).count();
  if (usedInInsem > 0) {
    throw new Error('Não é possível excluir este sêmen pois ele já foi utilizado em inseminações.');
  }
  return originalDeleteSemen(id);
}`
);

fs.writeFileSync('src/services/semenService.ts', a);