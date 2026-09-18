import { db } from '../db';
import type { MatrixReproductiveStatus } from '../types';
import * as animalsService from './animalsService';

export async function computeMatrixStatus(animalId: string): Promise<MatrixReproductiveStatus> {

  const activeInseminations = (await db.inseminations.where('animal_id').equals(animalId).toArray())
    .filter((i) => !i.deleted_at && i.cycle_status === 'active')
    .sort((a, b) => b.date.localeCompare(a.date));
  
  const latestInsemination = activeInseminations[0];

  if (latestInsemination) {
    if (latestInsemination.status === 'positive') return 'pregnant';
    if (latestInsemination.status === 'negative' || latestInsemination.status === 'aborted') return 'empty';
    return 'inseminated';
  }

  return 'empty';
}

export async function updateMatrixStatus(animalId: string) {
  const status = await computeMatrixStatus(animalId);
  await animalsService.update(animalId, { reproductive_status: status });
  return status;
}