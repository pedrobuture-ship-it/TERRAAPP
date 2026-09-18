import {
  AlertTriangle,
  Baby,
  BarChart3,
  Beef,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  HeartPulse,
  Milk,
  RefreshCw,
  Syringe,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import {
  getDashboardData,
  type DashboardAlert,
  type DashboardAlertSeverity,
  type DashboardData,
} from '../services/dashboardService';
import { formatDatePtBr } from '../utils/format';

interface MetricCard {
  label: string;
  value: number;
  icon: typeof Beef;
  tone: string;
  helper?: string;
}

function severityStyle(severity: DashboardAlertSeverity) {
  if (severity === 'danger') {
    return {
      border: 'border-red-200',
      background: 'bg-red-50',
      icon: 'text-red-700',
      badge: 'bg-red-100 text-red-700',
      label: 'Crítico',
    };
  }

  if (severity === 'warning') {
    return {
      border: 'border-harvest-100',
      background: 'bg-harvest-100/70',
      icon: 'text-slate-800',
      badge: 'bg-white/70 text-slate-800',
      label: 'Atenção',
    };
  }

  return {
    border: 'border-skyfield-100',
    background: 'bg-skyfield-100/70',
    icon: 'text-skyfield-700',
    badge: 'bg-white/70 text-skyfield-700',
    label: 'Aviso',
  };
}

function AlertItem({ alert }: { alert: DashboardAlert }) {
  const style = severityStyle(alert.severity);

  return (
    <Link
      to={alert.route}
      className={`block rounded-lg border ${style.border} ${style.background} p-4 transition hover:-translate-y-0.5 hover:shadow-sm`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-start gap-3">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 ${style.icon}`}>
            {alert.severity === 'danger' ? (
              <AlertTriangle size={18} aria-hidden="true" />
            ) : alert.severity === 'warning' ? (
              <Clock size={18} aria-hidden="true" />
            ) : (
              <Bell size={18} aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-950 group-hover:text-field-700 transition-colors">{alert.title}</h3>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
                {style.label}
              </span>
            </div>
            <p className="mt-1 text-sm leading-5 text-slate-700">{alert.description}</p>
            {alert.dueDate ? (
              <p className="mt-2 text-xs font-semibold text-slate-600">
                Data: {formatDatePtBr(alert.dueDate)}
              </p>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-slate-400 group-hover:text-field-600 transition-colors" title="Clique para editar">
          <ChevronRight size={20} aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      setDashboardData(await getDashboardData());
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Não foi possível carregar o dashboard.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const metrics = dashboardData?.metrics;
  const metricCards = useMemo<MetricCard[]>(() => {
    if (!metrics) {
      return [];
    }

    return [
      {
        label: 'Total de animais',
        value: metrics.totalAnimals,
        icon: Beef,
        tone: 'bg-field-50 text-field-700',
      },
      {
        label: 'Total de matrizes',
        value: metrics.totalMatrices,
        icon: Milk,
        tone: 'bg-skyfield-100 text-skyfield-700',
      },
      {
        label: 'Total de touros',
        value: metrics.totalBulls,
        icon: Beef,
        tone: 'bg-clay-100 text-clay-700',
      },
      {
        label: 'Total de bezerros',
        value: metrics.totalCalves,
        icon: Baby,
        tone: 'bg-harvest-100 text-slate-800',
      },
      {
        label: 'Vacas prenhas',
        value: metrics.pregnantCows,
        icon: CheckCircle2,
        tone: 'bg-field-50 text-field-700',
      },
      {
        label: 'Vacas vazias',
        value: metrics.emptyCows,
        icon: HeartPulse,
        tone: 'bg-slate-100 text-slate-700',
      },
      {
        label: 'Vacas inseminadas',
        value: metrics.inseminatedCows,
        icon: Syringe,
        tone: 'bg-skyfield-100 text-skyfield-700',
      },
      {
        label: 'IA no mês',
        value: metrics.monthInseminations,
        icon: CalendarDays,
        tone: 'bg-field-50 text-field-700',
      },
      {
        label: 'Partos previstos',
        value: metrics.expectedBirths,
        icon: CalendarDays,
        tone: 'bg-harvest-100 text-slate-800',
      },
      {
        label: 'Manejos pendentes',
        value: metrics.pendingSanitaryManagement,
        icon: HeartPulse,
        tone: 'bg-clay-100 text-clay-700',
      },
      {
        label: 'Estoque baixo de sêmen',
        value: metrics.lowSemenStock,
        icon: AlertTriangle,
        tone: 'bg-red-50 text-red-700',
      },
    ];
  }, [metrics]);

  const groupedAlerts = useMemo(() => {
    const alerts = dashboardData?.alerts ?? [];

    return {
      danger: alerts.filter((alert) => alert.severity === 'danger'),
      warning: alerts.filter((alert) => alert.severity === 'warning'),
      info: alerts.filter((alert) => alert.severity === 'info'),
    };
  }, [dashboardData?.alerts]);

  return (
    <PageShell
      title="Dashboard"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {dashboardData
              ? `Atualizado em ${new Date(dashboardData.generatedAt).toLocaleString('pt-BR')}`
              : 'Carregando dados locais...'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-field-600 focus:ring-offset-2"
        >
          <RefreshCw size={18} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}



      <section className="space-y-4">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-field-700" aria-hidden="true" />
                <h3 className="text-base font-semibold text-slate-950">Resumo de alertas</h3>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 min-w-[100px]">
                <p className="text-xs font-medium text-red-700">Críticos</p>
                <p className="text-lg font-semibold text-red-700 leading-tight">{groupedAlerts.danger.length}</p>
              </div>
              <div className="flex flex-col rounded-lg border border-harvest-100 bg-harvest-100/70 px-3 py-1.5 min-w-[100px]">
                <p className="text-xs font-medium text-slate-700">Atenção</p>
                <p className="text-lg font-semibold text-slate-900 leading-tight">{groupedAlerts.warning.length}</p>
              </div>
              <div className="flex flex-col rounded-lg border border-skyfield-100 bg-skyfield-100/70 px-3 py-1.5 min-w-[100px]">
                <p className="text-xs font-medium text-skyfield-700">Avisos</p>
                <p className="text-lg font-semibold text-skyfield-700 leading-tight">{groupedAlerts.info.length}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-field-700" aria-hidden="true" />
                <h3 className="text-base font-semibold text-slate-950">Alertas operacionais</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {dashboardData?.alerts.length ?? 0}
              </span>
            </div>

            {loading ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Calculando alertas locais...
              </div>
            ) : !dashboardData || dashboardData.alerts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Nenhum alerta no momento.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dashboardData.alerts.map((alert) => (
                  <AlertItem key={alert.id} alert={alert} />
                ))}
              </div>
            )}
          </div>
        </article>
      </section>
    </PageShell>
  );
}
