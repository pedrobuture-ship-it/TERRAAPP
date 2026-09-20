import React, { useEffect, useState } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { tasksService } from '../services/tasksService';
import type { Task } from '../types';
import { RefreshCw, Plus, CloudUpload, CloudDownload } from 'lucide-react';
import { runSync, getSelectedFarmId, type SyncMode } from '../services/syncService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

import { TaskModal } from '../components/kanban/TaskModal';

export function TasksKanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { session } = useAuth();
  const [membersMap, setMembersMap] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const farmId = getSelectedFarmId();
      if (!farmId) return;
      const { data, error } = await supabase!.rpc('get_farm_members_with_email', {
        target_farm_id: farmId
      });
      if (!error && data) {
        const map: Record<string, string> = {};
        let adminFound = false;
        data.forEach((m: any) => {
          map[m.user_id] = m.email.split('@')[0];
          if (m.user_id === session?.user?.id && (m.role === 'admin' || m.role === 'owner')) {
            adminFound = true;
          }
        });
        setMembersMap(map);
        setIsAdmin(adminFound);
      }
    } catch (err) {
      console.error(err);
    }
  }


  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    const allTasks = await tasksService.list({ includeDeleted: false });
    setTasks(allTasks);
  }

  async function handleSync(mode: SyncMode) {
    const farmId = getSelectedFarmId();
    if (!session?.user?.id || !farmId) {
      alert('Selecione uma fazenda primeiro.');
      return;
    }

    setIsSyncing(true);
    try {
      await runSync({ farmId, mode, userId: session.user.id });
      await loadTasks();
    } catch (err) {
      console.error('Sync failed', err);
      alert('Falha ao sincronizar. Verifique sua conexão.');
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <PageShell title="Tarefas">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-field-600 text-white font-medium rounded-md hover:bg-field-700 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Nova Tarefa
        </button>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSync('two_way')}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-field-600 text-white text-sm font-semibold rounded-md hover:bg-field-700 disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar agora
          </button>
          <button
            onClick={() => handleSync('push')}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-md hover:bg-slate-100 disabled:opacity-60 whitespace-nowrap"
          >
            <CloudUpload className="w-4 h-4" />
            Enviar dados locais para nuvem
          </button>
          <button
            onClick={() => handleSync('pull')}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-md hover:bg-slate-100 disabled:opacity-60 whitespace-nowrap"
          >
            <CloudDownload className="w-4 h-4" />
            Baixar dados da nuvem
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <KanbanBoard tasks={tasks} onTasksChange={loadTasks} membersMap={membersMap} isAdmin={isAdmin} />
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={loadTasks}
      />
    </PageShell>
  );
}
