import { Bell, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getDashboardData, type DashboardAlert } from '../../services/dashboardService';
import { subscribeActiveFarmChange } from '../../services/farmContextService';
import { cn } from '../../utils/cn';

export function NotificationsBell() {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  async function loadAlerts() {
    setLoading(true);
    try {
      const data = await getDashboardData();
      setAlerts(data.alerts);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
    return subscribeActiveFarmChange(() => {
      loadAlerts();
    });
  }, []);

  // Reload alerts whenever route changes to catch resolved issues
  useEffect(() => {
    loadAlerts();
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleOpen = () => {
    if (!isOpen) loadAlerts(); // refresh right before opening
    setIsOpen(!isOpen);
  };

  const dangerCount = alerts.filter(a => a.severity === 'danger').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const totalCount = alerts.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        className="relative inline-flex items-center justify-center p-2.5 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-field-600 focus:ring-offset-2"
        aria-label="Notificações"
      >
        <Bell size={18} aria-hidden="true" />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border border-slate-200 bg-white shadow-xl focus:outline-none z-50 overflow-hidden flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-900">Notificações</h3>
            
          </div>
          
          <div className="overflow-y-auto p-2">
            {loading && alerts.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-500">Carregando...</p>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-slate-900">Tudo em dia!</p>
                <p className="text-xs text-slate-500 mt-1">Nenhuma pendência na fazenda.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {alerts.map(alert => {
                  const Icon = alert.severity === 'info' ? Info : AlertTriangle;
                  return (
                    <Link
                      key={alert.id}
                      to={alert.route}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex gap-3 rounded-lg p-3 text-left transition hover:bg-slate-50 border border-transparent",
                        alert.severity === 'danger' && "bg-red-50/50 hover:bg-red-50 border-red-100/50",
                        alert.severity === 'warning' && "bg-amber-50/30 hover:bg-amber-50/60 border-amber-100/30",
                      )}
                    >
                      <div className={cn(
                        "mt-0.5 shrink-0",
                        alert.severity === 'danger' ? "text-red-600" :
                        alert.severity === 'warning' ? "text-amber-500" : "text-sky-500"
                      )}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className={cn(
                          "text-sm font-semibold",
                          alert.severity === 'danger' ? "text-red-900" : "text-slate-900"
                        )}>{alert.title}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{alert.description}</p>
                        <p className="mt-1 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          IR PARA {alert.route.replace('/', '')}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
