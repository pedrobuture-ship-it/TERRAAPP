import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { appRoutes } from '../../routes/appRoutes';
import { cn } from '../../utils/cn';

const SIDEBAR_COLLAPSED_KEY = 'terra:sidebar-collapsed';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
    } catch {
      // ignore
    }
  }, [isCollapsed]);

  return (
    <aside
      className={cn(
        'hidden min-h-screen shrink-0 border-r border-slate-200 bg-white px-4 py-5 lg:flex lg:flex-col transition-all duration-300',
        isCollapsed ? 'w-20 items-center px-2' : 'w-72'
      )}
    >
      <div className={cn('mb-6 flex items-center', isCollapsed ? 'flex-col gap-4' : 'gap-3 px-2 justify-between')}>
        <div className={cn('flex items-center gap-3', isCollapsed && 'flex-col')}>
          <img src="/icons/icon.svg" alt="" className={cn('rounded-2xl', isCollapsed ? 'h-8 w-8' : 'h-11 w-11')} />
          {!isCollapsed && (
            <div>
              <p className="text-base font-semibold text-slate-950">TERRA</p>
            </div>
          )}
        </div>
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          title="Alternar menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <nav aria-label="Navegação principal" className="space-y-1 w-full">
        {appRoutes.map((route) => {
          const Icon = route.icon;

          return (
            <NavLink
              key={route.path}
              to={route.path}
              title={isCollapsed ? route.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center rounded-lg py-2.5 text-sm font-medium transition',
                  isCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
                  isActive
                    ? 'bg-field-600 text-white shadow-soft'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                )
              }
            >
              <Icon size={18} aria-hidden="true" className="shrink-0" />
              {!isCollapsed && <span className="truncate">{route.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
