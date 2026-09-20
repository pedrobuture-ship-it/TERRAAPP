import {
  Activity,
  BarChart3,
  Beef,
  CalendarCheck,
  ClipboardList,
  Cog,
  DatabaseBackup,
  Gauge,
  HeartPulse,
  Map,
  Milk,
  Syringe,
  GitFork,
} from 'lucide-react';
import type { AppRouteDefinition } from '../types';
import { AnimalsPage } from '../pages/AnimalsPage';
import { BackupPage } from '../pages/BackupPage';
import { BirthsPage } from '../pages/BirthsPage';
import { BullsSemenPage } from '../pages/BullsSemenPage';
import { DashboardPage } from '../pages/DashboardPage';
import { HealthManagementPage } from '../pages/HealthManagementPage';
import { InseminationsPage } from '../pages/InseminationsPage';
import { LotsPaddocksPage } from '../pages/LotsPaddocksPage';
import { MatricesPage } from '../pages/MatricesPage';
import { ReportsPage } from '../pages/ReportsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { GenealogyPage } from '../pages/GenealogyPage';

import { TasksKanbanPage } from '../pages/TasksKanbanPage';
import { KanbanSquare } from 'lucide-react';


export const appRoutes: AppRouteDefinition[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Dashboard',
    shortLabel: 'Início',
    icon: Gauge,
    Component: DashboardPage,
  },
  {
    id: 'tarefas',
    path: '/tarefas',
    label: 'Kanban',
    shortLabel: 'Kanban',
    icon: KanbanSquare,
    Component: TasksKanbanPage,
  },
  {
    id: 'genealogia',
    path: '/genealogy',
    label: 'Genealogia & Acasalamento',
    shortLabel: 'Gen.',
    icon: GitFork,
    Component: GenealogyPage,
  },
  {
    id: 'animais',
    path: '/animais',
    label: 'Animais',
    shortLabel: 'Animais',
    icon: Beef,
    Component: AnimalsPage,
  },
  {
    id: 'matrizes',
    path: '/matrizes',
    label: 'Matrizes',
    shortLabel: 'Matrizes',
    icon: Milk,
    Component: MatricesPage,
  },
  {
    id: 'inseminacoes',
    path: '/inseminacoes',
    label: 'Inseminações',
    shortLabel: 'IA',
    icon: Syringe,
    Component: InseminationsPage,
  },
  {
    id: 'partos',
    path: '/partos',
    label: 'Partos',
    shortLabel: 'Partos',
    icon: ClipboardList,
    Component: BirthsPage,
  },
  {
    id: 'touros-semen',
    path: '/touros-semen',
    label: 'Touros/Sêmen',
    shortLabel: 'Sêmen',
    icon: Activity,
    Component: BullsSemenPage,
  },
  {
    id: 'manejo-sanitario',
    path: '/manejo-sanitario',
    label: 'Manejo Sanitário',
    shortLabel: 'Sanitário',
    icon: HeartPulse,
    Component: HealthManagementPage,
  },
  {
    id: 'lotes-piquetes',
    path: '/lotes-piquetes',
    label: 'Lotes/Piquetes',
    shortLabel: 'Lotes',
    icon: Map,
    Component: LotsPaddocksPage,
  },
  {
    id: 'relatorios',
    path: '/relatorios',
    label: 'Relatórios',
    shortLabel: 'Relatórios',
    icon: BarChart3,
    Component: ReportsPage,
  },
  {
    id: 'configuracoes',
    path: '/configuracoes',
    label: 'Configurações',
    shortLabel: 'Config.',
    icon: Cog,
    Component: SettingsPage,
  },
  {
    id: 'backup',
    path: '/backup',
    label: 'Backup',
    shortLabel: 'Backup',
    icon: DatabaseBackup,
    Component: BackupPage,
  },

];
