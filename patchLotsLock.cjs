const fs = require('fs');

let a = fs.readFileSync('src/services/lotsService.ts', 'utf8');

a = a.replace(
  /export const \{ create, update, delete: deleteLot, list, getById \} = lotsService;/,
  `export const { create, update, list, getById } = lotsService;
const originalDeleteLot = lotsService.delete;
export async function deleteLot(id: string) {
  const hasAnimals = await db.animals.where('lot_id').equals(id).filter((a) => !a.deleted_at && (a.status === 'active' || a.status === 'inactive')).count();
  if (hasAnimals > 0) {
    throw new Error('Não é possível excluir o lote pois existem animais ativos vinculados a ele.');
  }
  return originalDeleteLot(id);
}`
);

fs.writeFileSync('src/services/lotsService.ts', a);