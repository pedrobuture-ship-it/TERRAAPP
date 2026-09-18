import { db } from '../db';
import type { Animal } from '../types';
import {
  assertOptionalDate,
  assertOptionalPositiveNumber,
  assertRequiredText,
  normalizeIdentifier,
  normalizeOptionalText,
  normalizeText,
} from '../utils/validation';
import { createCrudService, type EntityCreateInput, type EntityUpdateInput } from './localCrud';

export type CreateAnimalInput = EntityCreateInput<Animal>;
export type UpdateAnimalInput = EntityUpdateInput<Animal>;

async function ensureUniqueIdentification(identification: string, currentId: string) {
  const normalizedIdentification = normalizeIdentifier(identification);
  const animals = await db.animals.toArray();
  const duplicated = animals.some(
    (animal) =>
      animal.id !== currentId &&
      !animal.deleted_at &&
      normalizeIdentifier(animal.identification) === normalizedIdentification,
  );

  if (duplicated) {
    throw new Error('Já existe um animal com este brinco/identificação.');
  }
}

async function ensureParentReferences(record: Animal) {
  const animals = await db.animals.toArray();
  const activeAnimals = animals.filter((animal) => !animal.deleted_at);

  if (record.mother_id === record.id) {
    throw new Error('O animal não pode ser vinculado como a própria mãe.');
  }

  if (record.father_id === record.id) {
    throw new Error('O animal não pode ser vinculado como o próprio pai.');
  }

  if (record.mother_id) {
    const mother = activeAnimals.find((animal) => animal.id === record.mother_id);

    if (!mother) {
      throw new Error('A mãe informada não foi encontrada.');
    }

    if (mother.sex !== 'female') {
      throw new Error('A mãe informada precisa ser uma fêmea.');
    }
  }

  if (record.father_id) {
    const father = activeAnimals.find((animal) => animal.id === record.father_id);

    if (father) {
      if (father.sex !== 'male') {
        throw new Error('O pai informado precisa ser um macho.');
      }
    } else {
      const semen = await db.semen.get(record.father_id);
      if (!semen || semen.deleted_at) {
        throw new Error('O pai informado não foi encontrado.');
      }
    }
  }

  if (
    record.sex !== 'female' &&
    activeAnimals.some((animal) => animal.id !== record.id && animal.mother_id === record.id)
  ) {
    throw new Error('Este animal está vinculado como mãe de outro animal e precisa permanecer fêmea.');
  }

  if (
    record.sex !== 'male' &&
    activeAnimals.some((animal) => animal.id !== record.id && animal.father_id === record.id)
  ) {
    throw new Error('Este animal está vinculado como pai de outro animal e precisa permanecer macho.');
  }
}

function prepareAnimal(record: Animal): Animal {
  return {
    ...record,
    identification: normalizeText(record.identification),
    name: normalizeOptionalText(record.name),
    breed: normalizeOptionalText(record.breed),
    lot_id: normalizeOptionalText(record.lot_id),
    mother_id: normalizeOptionalText(record.mother_id),
    father_id: normalizeOptionalText(record.father_id),
    notes: normalizeOptionalText(record.notes),
  };
}

async function validateAnimal(record: Animal) {
  assertRequiredText(record.identification, 'Brinco/identificação');
  assertRequiredText(record.sex, 'Sexo');
  assertRequiredText(record.category, 'Categoria');
  assertRequiredText(record.status, 'Status');
  assertOptionalDate(record.birth_date, 'Data de nascimento');
  assertOptionalPositiveNumber(record.weight_kg, 'Peso');
  await ensureUniqueIdentification(record.identification, record.id);
  await ensureParentReferences(record);
}

import { sanitaryManagementService } from './sanitaryManagementService';

export const animalsService = createCrudService<Animal>({
  table: db.animals,
  entityName: 'animals',
  idPrefix: 'animal',
  prepare: prepareAnimal,
  validate: validateAnimal,
});

const originalUpdate = animalsService.update;
export const { create, list, getById } = animalsService;
const originalDeleteAnimal = animalsService.delete;
export async function deleteAnimal(id: string) {
  const asMother = await db.births.where('animal_id').equals(id).filter(b => !b.deleted_at).count();
  const asInsemAnimal = await db.inseminations.where('animal_id').equals(id).filter(i => !i.deleted_at).count();
  const asInsemBull = await db.inseminations.where('bull_id').equals(id).filter(i => !i.deleted_at).count();
  if (asMother > 0 || asInsemAnimal > 0 || asInsemBull > 0) {
    throw new Error('Não é possível excluir este animal pois ele possui histórico reprodutivo (partos ou inseminações).');
  }
  return originalDeleteAnimal(id);
}

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

