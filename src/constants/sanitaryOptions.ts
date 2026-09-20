import type { SanitaryManagementStatus, SanitaryManagementType } from '../types';
import { addDaysToDateString, todayDateString } from '../utils/date';

export const UPCOMING_SANITARY_DAYS = 30;

export const sanitaryTypeOptions: Array<{ value: SanitaryManagementType; label: string }> = [
  { value: 'vaccine', label: 'Vacina' },
  { value: 'deworming', label: 'Vermífugo' },
  { value: 'medication', label: 'Medicamento' },
  { value: 'veterinary_procedure', label: 'Procedimento veterinário' },
  { value: 'other', label: 'Outro' },
];

export const sanitaryStatusOptions: Array<{ value: SanitaryManagementStatus; label: string }> = [
  { value: 'done', label: 'Realizado' },
  { value: 'pending', label: 'Pendente' },
  { value: 'overdue', label: 'Vencido' },
];

const sanitaryTypeLabels: Record<SanitaryManagementType, string> = {
  vaccine: 'Vacina',
  deworming: 'Vermífugo',
  medication: 'Medicamento',
  veterinary_procedure: 'Procedimento veterinário',
  exam: 'Exame',
  other: 'Outro',
};

const sanitaryStatusLabels: Record<SanitaryManagementStatus, string> = {
  done: 'Realizado',
  pending: 'Pendente',
  overdue: 'Vencido',
};

export function getSanitaryTypeLabel(type: SanitaryManagementType) {
  return sanitaryTypeLabels[type] ?? type;
}

export function getSanitaryStatusLabel(status: SanitaryManagementStatus) {
  return sanitaryStatusLabels[status] ?? status;
}

export function isSanitaryOverdue(date: string, nextApplicationDate?: string, status?: SanitaryManagementStatus) {
  if (status === 'overdue') {
    return true;
  }

  if (status === 'pending' && date < todayDateString()) {
    return true;
  }

  return Boolean(nextApplicationDate && nextApplicationDate < todayDateString() && status !== 'done');
}

export function isSanitaryUpcoming(date: string, nextApplicationDate?: string, status?: SanitaryManagementStatus) {
  if (isSanitaryOverdue(date, nextApplicationDate, status)) {
    return false;
  }

  if (status === 'pending' && date <= addDaysToDateString(todayDateString(), UPCOMING_SANITARY_DAYS)) {
    return true;
  }

  return Boolean(nextApplicationDate && nextApplicationDate <= addDaysToDateString(todayDateString(), UPCOMING_SANITARY_DAYS) && status !== 'done');
}

export function getEffectiveSanitaryStatus(
  date: string,
  status: SanitaryManagementStatus,
  nextApplicationDate?: string,
) {
  return isSanitaryOverdue(date, nextApplicationDate, status) ? 'overdue' : status;
}