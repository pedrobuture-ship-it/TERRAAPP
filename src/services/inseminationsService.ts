import { db } from '../db';
import {
  CATTLE_GESTATION_DAYS,
  PREGNANCY_DIAGNOSIS_DAYS,
} from '../constants/reproductionOptions';
import type { Animal, Insemination, Semen } from '../types';
import { addDaysToDateString, isBeforeDate, isFutureDate } from '../utils/date';
import {
  assertRequiredDate,
  assertPastOrTodayDate,
  assertRequiredText,
  normalizeOptionalText,
} from '../utils/validation';
import * as animalsService from './animalsService';
import { updateMatrixStatus } from './reproductionCycleService';
import { createCrudService, type EntityCreateInput, type EntityUpdateInput } from './localCrud';
import * as semenService from './semenService';

export type CreateInseminationInput = EntityCreateInput<Insemination>;
export type UpdateInseminationInput = EntityUpdateInput<Insemination>;

const MINIMUM_INSEMINATION_DATE = '1990-01-01';

function isEligibleMatrix(animal: Animal) {
  return (
    animal.sex === 'female' &&
    (animal.category === 'matrix' || animal.category === 'heifer') &&
    animal.status === 'active' &&
    !animal.deleted_at
  );
}

function calculateInseminationDates(date: string) {
  return {
    diagnosis_due_date: addDaysToDateString(date, PREGNANCY_DIAGNOSIS_DAYS),
    birth_due_date: addDaysToDateString(date, CATTLE_GESTATION_DAYS),
  };
}

function prepareInsemination(record: Insemination): Insemination {
  const calculatedDates = calculateInseminationDates(record.date);

  return {
    ...record,
    animal_id: record.animal_id.trim(),
    semen_id: normalizeOptionalText(record.semen_id),
    bull_id: normalizeOptionalText(record.bull_id),
    protocol: normalizeOptionalText(record.protocol),
    technician: normalizeOptionalText(record.technician),
    cycle_status: record.cycle_status ?? 'active',
    type: record.type ?? 'iatf',
    status: record.status ?? 'awaiting_diagnosis',
    diagnosis_due_date: calculatedDates.diagnosis_due_date,
    birth_due_date: calculatedDates.birth_due_date,
    notes: normalizeOptionalText(record.notes),
  };
}

async function validateInsemination(record: Insemination) {
  assertRequiredText(record.animal_id, 'Matriz');
  if (!record.semen_id && !record.bull_id) {
    throw new Error('Touro ou sêmen é obrigatório.');
  }
  assertPastOrTodayDate(record.date, 'Data da inseminação');
  assertRequiredText(record.type, 'Tipo de inseminação');
  assertRequiredText(record.status, 'Status');

  if (isFutureDate(record.date) || isBeforeDate(record.date, MINIMUM_INSEMINATION_DATE)) {
    throw new Error('Informe uma data de inseminação válida.');
  }

  const matrix = await animalsService.getById(record.animal_id);

  if (!matrix || !isEligibleMatrix(matrix)) {
    throw new Error('Apenas fêmeas ativas nas categorias matriz ou novilha podem ser inseminadas.');
  }

  if (record.cycle_status === 'active') {
    const activeInseminations = (await db.inseminations.where('animal_id').equals(record.animal_id).toArray())
      .filter((i) => !i.deleted_at && (i.cycle_status === 'active' || (!i.cycle_status && (i.status === 'awaiting_diagnosis' || i.status === 'positive'))) && i.id !== record.id);
      
    if (activeInseminations.length > 0) {
      throw new Error('Esta matriz já possui um ciclo reprodutivo em andamento.');
    }
  }
}

const baseInseminationsService = createCrudService<Insemination>({
  table: db.inseminations,
  entityName: 'inseminations',
  idPrefix: 'insemination',
  prepare: prepareInsemination,
  validate: validateInsemination,
});

async function getSemenWithStock(semenId: string) {
  const semen = await semenService.getById(semenId);

  if (!semen) {
    throw new Error('Sêmen selecionado não foi encontrado.');
  }

  return semen;
}

async function adjustSemenStock(semenId: string, delta: number) {
  const semen = await getSemenWithStock(semenId);
  const currentDoses = semen.doses_available ?? semen.quantity ?? 0;
  const nextDoses = currentDoses + delta;

  if (nextDoses < 0) {
    throw new Error('Não é possível usar sêmen com estoque zerado.');
  }

  const nextStatus: Semen['status'] =
    nextDoses === 0 ? 'sold_out' : semen.status === 'sold_out' ? 'active' : semen.status;

  await semenService.update(semenId, {
    doses_available: nextDoses,
    quantity: nextDoses,
    status: nextStatus,
  });
}

async function assertSemenCanBeUsed(semenId?: string) {
  if (!semenId) {
    return;
  }

  const semen = await getSemenWithStock(semenId);
  const doses = semen.doses_available ?? semen.quantity ?? 0;

  if (doses <= 0 || semen.status === 'sold_out') {
    throw new Error('Não é possível usar sêmen com estoque zerado.');
  }
}



export async function create(data: CreateInseminationInput) {
  await assertSemenCanBeUsed(data.semen_id);
  const record = await baseInseminationsService.create(data);

  if (record.semen_id) {
    await adjustSemenStock(record.semen_id, -1);
  }

  await updateMatrixStatus(record.animal_id);

  return record;
}

export async function update(id: string, data: UpdateInseminationInput) {
  const existing = await baseInseminationsService.getById(id);

  if (!existing) {
    throw new Error('Inseminação não encontrada.');
  }

  // Prevent modifying an insemination that was successfully concluded with a birth
  if (existing.status === 'positive' && existing.cycle_status === 'closed') {
    if (data.cycle_status === 'active') {
      // Allow reopening
    } else {
      throw new Error('Esta inseminação gerou um parto e foi arquivada. Exclua o parto primeiro se quiser modificá-la.');
    }
  }

  const nextSemenId = data.semen_id ?? existing.semen_id;

  if (nextSemenId && nextSemenId !== existing.semen_id) {
    await assertSemenCanBeUsed(nextSemenId);
  }

  const nextStatus = data.status ?? existing.status;
  if (nextStatus === 'negative' || nextStatus === 'aborted') {
    data.cycle_status = 'closed';
  } else if (nextStatus === 'positive' || nextStatus === 'awaiting_diagnosis') {
    if (data.cycle_status !== 'closed') {
      data.cycle_status = 'active'; 
    }
  }

  const record = await baseInseminationsService.update(id, data);

  if (existing.semen_id && existing.semen_id !== record.semen_id) {
    await adjustSemenStock(existing.semen_id, 1);
  }

  if (record.semen_id && record.semen_id !== existing.semen_id) {
    await adjustSemenStock(record.semen_id, -1);
  }

  await updateMatrixStatus(record.animal_id);

  if (existing.animal_id !== record.animal_id) {
    await updateMatrixStatus(existing.animal_id);
  }

  return record;
}

export async function deleteInsemination(id: string) {
  const existing = await baseInseminationsService.getById(id);

  if (!existing) {
    throw new Error('Inseminação não encontrada.');
  }

  // Prevent modifying an insemination that was successfully concluded with a birth
  if (existing.status === 'positive' && existing.cycle_status === 'closed') {
    throw new Error('Esta inseminação gerou um parto e foi arquivada. Exclua o parto primeiro se quiser excluí-la.');
  }

  const record = await baseInseminationsService.delete(id);

  if (record.semen_id) {
    await adjustSemenStock(record.semen_id, 1);
  }

  await updateMatrixStatus(record.animal_id);

  return record;
}

export const list = baseInseminationsService.list;
export const getById = baseInseminationsService.getById;

export const inseminationsService = {
  create,
  update,
  delete: deleteInsemination,
  list,
  getById,
};
