const fs = require('fs');

let content = fs.readFileSync('src/services/animalsService.ts', 'utf8');

// Replace the end of the file with the new logic
const endRegex = /export const animalsService = createCrudService<Animal>\({[\s\S]*?export const { create, update, delete: deleteAnimal, list, getById } = animalsService;/m;

const replacement = `import { sanitaryManagementService } from './sanitaryManagementService';

export const animalsService = createCrudService<Animal>({
  table: db.animals,
  entityName: 'animals',
  idPrefix: 'animal',
  prepare: prepareAnimal,
  validate: validateAnimal,
});

const originalUpdate = animalsService.update;
export const { create, delete: deleteAnimal, list, getById } = animalsService;

export async function archiveAnimal(id: string, status: 'sold' | 'dead' | 'discarded') {
  const animal = await getById(id);
  if (!animal) throw new Error('Animal nǜo encontrado');

  const pendingManagements = await db.sanitaryManagement
    .where('animal_id')
    .equals(id)
    .filter((sm) => !sm.deleted_at && (sm.status === 'pending' || sm.status === 'overdue'))
    .toArray();

  for (const sm of pendingManagements) {
    await sanitaryManagementService.delete(sm.id);
  }

  await originalUpdate(id, {
    status,
    lot_id: '',
  });
}

export async function update(id: string, payload: UpdateAnimalInput) {
  if (payload.status === 'sold' || payload.status === 'dead' || payload.status === 'discarded') {
    const pendingManagements = await db.sanitaryManagement
      .where('animal_id')
      .equals(id)
      .filter((sm) => !sm.deleted_at && (sm.status === 'pending' || sm.status === 'overdue'))
      .toArray();

    for (const sm of pendingManagements) {
      await sanitaryManagementService.delete(sm.id);
    }
    
    // As per requirement, remove from lot if being archived
    payload.lot_id = ''; // Using empty string so normalizeOptionalText clears it
  }
  return originalUpdate(id, payload);
}
`;

content = content.replace(endRegex, replacement);
fs.writeFileSync('src/services/animalsService.ts', content);