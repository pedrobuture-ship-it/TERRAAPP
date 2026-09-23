import { LOW_SEMEN_DOSES_LIMIT } from '../constants/semenOptions';
import {
  getEffectiveSanitaryStatus,
  isSanitaryOverdue,
  isSanitaryUpcoming,
} from '../constants/sanitaryOptions';
import type {
  Animal,
  Birth,
  Insemination,
  Lot,
  MatrixReproductiveStatus,
  SanitaryManagement,
  Semen,
} from '../types';
import {
  addDaysToDateString,
  daysBetweenDateStrings,
  monthKeyFromDateString,
  todayDateString,
} from '../utils/date';
import * as animalsService from './animalsService';
import * as birthsService from './birthsService';
import * as inseminationsService from './inseminationsService';
import * as lotsService from './lotsService';
import * as sanitaryManagementService from './sanitaryManagementService';
import * as semenService from './semenService';

export type DashboardAlertSeverity = 'danger' | 'warning' | 'info';

export interface DashboardMetrics {
  totalAnimals: number;
  totalMatrices: number;
  totalBulls: number;
  totalCalves: number;
  pregnantCows: number;
  emptyCows: number;
  inseminatedCows: number;
  monthInseminations: number;
  expectedBirths: number;
  pendingSanitaryManagement: number;
  lowSemenStock: number;
}

export interface DashboardAlert {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  severity: DashboardAlertSeverity;
  route: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  alerts: DashboardAlert[];
  generatedAt: string;
}

const UPCOMING_DIAGNOSIS_DAYS = 7;
const UPCOMING_BIRTH_DAYS = 45;
const MATRIX_WITHOUT_INSEMINATION_DAYS = 180;
const ANIMAL_STALE_DAYS = 180;

function isMatrixCandidate(animal: Animal) {
  return (
    animal.sex === 'female' &&
    (animal.category === 'matrix' || animal.category === 'heifer') &&
    animal.status === 'active'
  );
}

function getAnimalLabel(animal?: Animal) {
  if (!animal) {
    return 'Animal não encontrado';
  }

  return `${animal.identification}${animal.name ? ` - ${animal.name}` : ''}`;
}

function getLotLabel(lots: Lot[], lotId?: string) {
  if (!lotId) {
    return 'não informado';
  }

  const lot = lots.find((item) => item.id === lotId || item.name === lotId);
  return lot?.name ?? lotId;
}

function getLatestInsemination(animalId: string, inseminations: Insemination[]) {
  const animalInsems = inseminations.filter((insemination) => insemination.animal_id === animalId);
  const activeInsem = animalInsems.filter(i => i.cycle_status !== 'closed').sort((a, b) => b.date.localeCompare(a.date))[0];
  return activeInsem || animalInsems.sort((a, b) => b.date.localeCompare(a.date))[0];
}

function getLatestBirth(animalId: string, births: Birth[]) {
  return births
    .filter((birth) => birth.animal_id === animalId)
    .sort((a, b) => b.birth_date.localeCompare(a.birth_date))[0];
}

function getDerivedMatrixStatus(
  animal: Animal,
  inseminations: Insemination[],
  births: Birth[],
): MatrixReproductiveStatus {
  if (animal.status === 'discarded' || animal.status === 'dead' || animal.category === 'discard') {
    return 'discarded';
  }

  const latestInsemination = getLatestInsemination(animal.id, inseminations);
  const latestBirth = getLatestBirth(animal.id, births);

  if (latestBirth && (!latestInsemination || latestBirth.birth_date >= latestInsemination.date)) {
    return 'calved';
  }

  if (latestInsemination) {
    if (latestInsemination.status === 'positive') return 'pregnant';
    if (latestInsemination.status === 'negative' || latestInsemination.status === 'aborted') return 'empty';
    return 'inseminated';
  }

  return 'empty';
}

function isDateWithinNextDays(date: string | undefined, days: number, today: string) {
  if (!date || date < today) {
    return false;
  }
  return date <= addDaysToDateString(today, days);
}

function isDateOverdueOrWithinNextDays(date: string | undefined, days: number, today: string) {
  if (!date) {
    return false;
  }
  return date <= addDaysToDateString(today, days);
}

function isDatePastDue(date: string | undefined, today: string) {
  return !!date && date < today;
}

function buildMetrics(
  animals: Animal[],
  inseminations: Insemination[],
  births: Birth[],
  sanitaryRecords: SanitaryManagement[],
  semenRecords: Semen[],
  today: string,
): DashboardMetrics {
  const matrixAnimals = animals.filter(isMatrixCandidate);
  const matrixStatuses = matrixAnimals.map((animal) =>
    getDerivedMatrixStatus(animal, inseminations, births),
  );
  const currentMonth = monthKeyFromDateString(today);
  const expectedBirthMatrixIds = new Set<string>();

  for (const insemination of inseminations) {
    if (
      insemination.birth_due_date &&
      insemination.birth_due_date >= today &&
      insemination.status === 'positive'
    ) {
      expectedBirthMatrixIds.add(insemination.animal_id);
    }
  }

  return {
    totalAnimals: animals.length,
    totalMatrices: animals.filter((animal) => animal.category === 'matrix').length,
    totalBulls: animals.filter((animal) => animal.category === 'bull').length,
    totalCalves: animals.filter((animal) => animal.category === 'calf').length,
    pregnantCows: matrixStatuses.filter((status) => status === 'pregnant').length,
    emptyCows: matrixStatuses.filter((status) => status === 'empty').length,
    inseminatedCows: matrixStatuses.filter((status) => status === 'inseminated').length,
    monthInseminations: inseminations.filter((insemination) =>
      monthKeyFromDateString(insemination.date) === currentMonth,
    ).length,
    expectedBirths: expectedBirthMatrixIds.size,
    pendingSanitaryManagement: sanitaryRecords.filter(
      (record) => getEffectiveSanitaryStatus(record.status ?? 'done', record.next_application_date) !== 'done',
    ).length,
    lowSemenStock: semenRecords.filter((semen) => (semen.doses_available ?? semen.quantity ?? 0) <= LOW_SEMEN_DOSES_LIMIT).length,
  };
}

function buildAlerts(
  animals: Animal[],
  inseminations: Insemination[],
  births: Birth[],
  sanitaryRecords: SanitaryManagement[],
  semenRecords: Semen[],
  lots: Lot[],
  today: string,
) {
  const alerts: DashboardAlert[] = [];

  for (const animal of animals.filter(isMatrixCandidate)) {
    const latestInsemination = getLatestInsemination(animal.id, inseminations);
    
    // Check if cow is pending diagnosis or pending birth
    if (latestInsemination) {
      const latestBirth = getLatestBirth(animal.id, births);
      const insemination = latestInsemination;
      // If no birth has happened SINCE the insemination, or the cycle is still active, check alerts
      if (insemination.cycle_status !== 'closed' || !latestBirth || latestBirth.birth_date < latestInsemination.date) {
        if ((insemination.status ?? 'awaiting_diagnosis') === 'awaiting_diagnosis' && insemination.diagnosis_due_date) {
          if (insemination.diagnosis_due_date < today) {
            alerts.push({
              id: `diagnosis-overdue-${insemination.id}`,
              title: 'Diagnóstico atrasado',
              description: `${getAnimalLabel(animal)} já deveria ter sido avaliada.`,
              dueDate: insemination.diagnosis_due_date,
              severity: 'danger',
              route: '/inseminacoes',
            });
          } else if (isDateWithinNextDays(insemination.diagnosis_due_date, UPCOMING_DIAGNOSIS_DAYS, today)) {
            alerts.push({
              id: `diagnosis-${insemination.id}`,
              title: 'Diagnóstico de gestação próximo',
              description: `${getAnimalLabel(animal)} deve ser avaliada.`,
              dueDate: insemination.diagnosis_due_date,
              severity: 'info',
              route: '/inseminacoes',
            });
          }
        }

        if ((insemination.status === 'positive' || animal?.reproductive_status === 'pregnant') && insemination.birth_due_date) {
          if (insemination.birth_due_date < today) {
            alerts.push({
              id: `birth-overdue-${insemination.id}`,
              title: 'Parto atrasado',
              description: `${getAnimalLabel(animal)} já passou da data prevista de parto.`,
              dueDate: insemination.birth_due_date,
              severity: 'danger',
              route: '/partos',
            });
          } else if (isDateWithinNextDays(insemination.birth_due_date, UPCOMING_BIRTH_DAYS, today)) {
            alerts.push({
              id: `birth-${insemination.id}`,
              title: 'Parto previsto',
              description: `${getAnimalLabel(animal)} tem parto previsto.`,
              dueDate: insemination.birth_due_date,
              severity: 'warning',
              route: '/partos',
            });
          }
        }
      }
    }

    const matrixStatus = getDerivedMatrixStatus(animal, inseminations, births);

    if (matrixStatus === 'empty' || matrixStatus === 'calved') {
      const latestBirth = getLatestBirth(animal.id, births);
      
      let referenceDate = animal.updated_at.slice(0, 10);
      if (latestBirth && (!latestInsemination || latestBirth.birth_date >= latestInsemination.date)) {
        referenceDate = latestBirth.birth_date;
      } else if (latestInsemination) {
        referenceDate = latestInsemination.date;
      }

      const daysWithoutInsemination = daysBetweenDateStrings(referenceDate, today);

      if (daysWithoutInsemination >= MATRIX_WITHOUT_INSEMINATION_DAYS) {
        alerts.push({
          id: `matrix-without-insemination-${animal.id}`,
          title: 'Matriz muito tempo sem inseminação',
          description: `${getAnimalLabel(animal)} está há ${daysWithoutInsemination} dias sem inseminação registrada.`,
          dueDate: latestInsemination?.date,
          severity: 'warning',
          route: '/matrizes',
        });
      }
    }
  }

  for (const record of sanitaryRecords) {
    if (record.procedure_type !== 'vaccine' && record.procedure_type !== 'deworming') {
      continue;
    }

    const nextDate = record.next_application_date;
    if (!nextDate) continue;

    const status = getEffectiveSanitaryStatus(record.status ?? 'done', nextDate);

    if (status === 'overdue') {
      alerts.push({
        id: `sanitary-overdue-${record.id}`,
        title: record.procedure_type === 'vaccine' ? 'Vacina atrasada' : 'Vermífugo atrasado',
        description: `${record.product || 'Manejo sanitário'} já deveria ter sido reaplicado.`,
        dueDate: nextDate,
        severity: 'danger',
        route: '/manejo-sanitario',
      });
    } else if (isDateWithinNextDays(nextDate, 15, today)) {
      alerts.push({
        id: `sanitary-upcoming-${record.id}`,
        title: record.procedure_type === 'vaccine' ? 'Vacina próxima' : 'Vermífugo próximo',
        description: `${record.product || 'Manejo sanitário'} deve ser reaplicado nos próximos 15 dias.`,
        dueDate: nextDate,
        severity: 'info',
        route: '/manejo-sanitario',
      });
    }
  }

  for (const semen of semenRecords) {
    const doses = semen.doses_available ?? semen.quantity ?? 0;

    if (semen.status === 'active' && doses <= LOW_SEMEN_DOSES_LIMIT) {
      alerts.push({
        id: `semen-low-${semen.id}`,
        title: 'Estoque baixo de sêmen',
        description: `Touro ${semen.bull_name} está com ${doses} dose(s) disponível(is).`,
        severity: 'warning',
        route: '/touros-semen',
      });
    }
  }

  return alerts;
}

export async function getDashboardData(): Promise<DashboardData> {
  const [animals, inseminations, births, sanitaryRecords, semenRecords, lots] =
    await Promise.all([
      animalsService.list(),
      inseminationsService.list(),
      birthsService.list(),
      sanitaryManagementService.list(),
      semenService.list(),
      lotsService.list(),
    ]);
  const today = todayDateString();

  return {
    metrics: buildMetrics(
      animals,
      inseminations,
      births,
      sanitaryRecords,
      semenRecords,
      today,
    ),
    alerts: buildAlerts(
      animals,
      inseminations,
      births,
      sanitaryRecords,
      semenRecords,
      lots,
      today,
    ),
    generatedAt: new Date().toISOString(),
  };
}
