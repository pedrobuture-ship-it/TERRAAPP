import { db } from '../db';
import type { Birth, MatrixReproductiveStatus } from '../types';
import { isBeforeDate, isFutureDate } from '../utils/date';
import {
  assertOptionalPositiveNumber,
  assertRequiredDate,
  assertPastOrTodayDate,
  assertRequiredText,
  normalizeOptionalText,
} from '../utils/validation';
import * as animalsService from './animalsService';
import { updateMatrixStatus } from './reproductionCycleService';
import * as inseminationsService from './inseminationsService';
import { createCrudService, type EntityCreateInput, type EntityUpdateInput } from './localCrud';

export type CreateBirthInput = EntityCreateInput<Birth>;
export type UpdateBirthInput = EntityUpdateInput<Birth>;

const MINIMUM_BIRTH_DATE = '1990-01-01';

function prepareBirth(record: Birth): Birth {
  const calfStatus = record.calf_status ?? (record.outcome === 'alive' ? 'alive' : 'dead');

  return {
    ...record,
    animal_id: record.animal_id.trim(),
    birth_type: record.birth_type ?? 'normal',
    calf_count: record.calf_count ?? 1,
    outcome: record.outcome ?? (calfStatus === 'alive' ? 'alive' : 'stillborn'),
    calf_id: normalizeOptionalText(record.calf_id),
    calf_identification: normalizeOptionalText(record.calf_identification),
    calf_status: calfStatus,
    responsible: normalizeOptionalText(record.responsible),
    notes: normalizeOptionalText(record.notes),
    is_archived: record.is_archived ?? false,
  };
}

async function matrixHasPregnancyEvidence(record: Birth) {
  const existingBirth = await db.births.get(record.id);
  if (existingBirth && existingBirth.animal_id === record.animal_id) {
    return true; // Bypass for existing birth if the matrix wasn't changed
  }

  const activeInseminations = (await db.inseminations.where('animal_id').equals(record.animal_id).toArray())
    .filter((i) => !i.deleted_at && i.status === 'positive' && (i.cycle_status === 'active' || !i.cycle_status));
    
  return activeInseminations.length > 0;
}

async function validateBirth(record: Birth) {
  assertRequiredText(record.animal_id, 'Matriz');
  assertPastOrTodayDate(record.birth_date, 'Data do parto');
  assertRequiredText(record.birth_type, 'Tipo de parto');
  assertRequiredText(record.calf_status, 'Status do bezerro');
  assertOptionalPositiveNumber(record.calf_count, 'Quantidade de bezerros');
  assertOptionalPositiveNumber(record.birth_weight_kg, 'Peso ao nascer');

  if (isFutureDate(record.birth_date) || isBeforeDate(record.birth_date, MINIMUM_BIRTH_DATE)) {
    throw new Error('Informe uma data de parto válida.');
  }

  const matrix = await animalsService.getById(record.animal_id);

  if (!matrix || matrix.sex !== 'female' || !['matrix', 'heifer'].includes(matrix.category)) {
    throw new Error('Selecione uma matriz válida.');
  }

  if (!(await matrixHasPregnancyEvidence(record))) {
    throw new Error('Apenas matrizes prenhas podem registrar parto.');
  }

  const latestInsemination = (await inseminationsService.list())
    .filter((insemination) => insemination.animal_id === record.animal_id && (insemination.cycle_status === 'active' || (!insemination.cycle_status && (insemination.status === 'awaiting_diagnosis' || insemination.status === 'positive'))))
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  if (latestInsemination && record.birth_date < latestInsemination.date) {
    throw new Error('O parto não pode ser anterior à inseminação.');
  }
}

const baseBirthsService = createCrudService<Birth>({
  table: db.births,
  entityName: 'births',
  idPrefix: 'birth',
  prepare: prepareBirth,
  validate: validateBirth,
});



export async function create(data: CreateBirthInput) {
  const record = await baseBirthsService.create(data);

  const activeInseminations = await db.inseminations.where('animal_id').equals(record.animal_id).toArray();
  for (const ins of activeInseminations) {
    if (!ins.deleted_at && (ins.cycle_status === 'active' || (!ins.cycle_status && (ins.status === 'awaiting_diagnosis' || ins.status === 'positive')))) {
      await inseminationsService.update(ins.id, { cycle_status: 'closed' });
    }
  }

  await updateMatrixStatus(record.animal_id);

  // Removed pregnancyDiagnoses closing as the table/module is removed

  return record;
}

export async function update(id: string, data: UpdateBirthInput) {
  const existing = await baseBirthsService.getById(id);
  if (!existing) throw new Error('Parto não encontrado.');

  const record = await baseBirthsService.update(id, data);

  const activeInseminations = await db.inseminations.where('animal_id').equals(record.animal_id).toArray();
  for (const ins of activeInseminations) {
    if (!ins.deleted_at && (ins.cycle_status === 'active' || (!ins.cycle_status && (ins.status === 'awaiting_diagnosis' || ins.status === 'positive')))) {
      await inseminationsService.update(ins.id, { cycle_status: 'closed' });
    }
  }

  await updateMatrixStatus(record.animal_id);

  if (existing.animal_id !== record.animal_id) {
    await updateMatrixStatus(existing.animal_id);
  }

  // Removed pregnancyDiagnoses closing as the table/module is removed

  return record;
}

export async function deleteBirth(id: string) {
  const existing = await baseBirthsService.getById(id);

  if (!existing) {
    throw new Error('Parto não encontrado.');
  }

  const record = await baseBirthsService.delete(id);
  
  // Bug 11 fix: Reopen the most recent insemination cycle if we deleted the birth
  const allInseminations = await db.inseminations.where('animal_id').equals(record.animal_id).toArray();
  const lastInsem = allInseminations.filter(i => !i.deleted_at).sort((a, b) => b.date.localeCompare(a.date))[0];
  
  if (lastInsem && lastInsem.cycle_status === 'closed') {
    await inseminationsService.update(lastInsem.id, { cycle_status: 'active' });
  }

  await updateMatrixStatus(record.animal_id);

  return record;
}

export const list = baseBirthsService.list;
export const getById = baseBirthsService.getById;

export async function archiveBirth(id: string) {
  return await update(id, { is_archived: true } as any);
}

export const birthsService = {
  create,
  update,
  delete: deleteBirth,
  archive: archiveBirth,
  list,
  getById,
};
