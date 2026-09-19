import React, { useEffect, useState } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { tasksService } from '../services/tasksService';
import type { Task } from '../types';
import { RefreshCw, Plus } from 'lucide-react';
import { runSync } from '../services/syncService';
import { useAuth } from '../contexts/AuthContext';
import { TaskModal } from '../components/kanban/TaskModal';

export function TasksKanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { session } = useAuth();
  const farmId = session?.user.id; // Just a dummy check, we rely on local filters mostly

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    const allTasks = await tasksService.list({ includeDeleted: false });
    setTasks(allTasks);
  }

  async function handleSync() {
    setIsSyncing(true);
    try {
      if (!session?.user?.id) return;
      await runSync({ farmId: session.user.id, mode: 'two_way', userId: session.user.id });
      await loadTasks();
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <PageShell title="Tarefas">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-field-600 text-white rounded-md hover:bg-field-700"
        >
          <Plus className="w-5 h-5" />
          Nova Tarefa
        </button>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200"
        >
          <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          Sincronizar
        </button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <KanbanBoard tasks={tasks} onTasksChange={loadTasks} />
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={loadTasks}
      />
    </PageShell>
  );
}
