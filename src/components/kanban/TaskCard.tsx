import React, { useState } from 'react';
import type { Task } from '../../types';
import { MoreVertical, Trash2 } from 'lucide-react';
import { tasksService } from '../../services/tasksService';
import { TaskModal } from './TaskModal';

interface TaskCardProps {
  membersMap: Record<string, string>;
  task: Task;
  onTasksChange: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  Baixa: 'bg-green-500',
  Média: 'bg-yellow-500',
  Alta: 'bg-red-500',
};

export function TaskCard({ task, onTasksChange, membersMap }: TaskCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm('Deseja excluir esta tarefa?')) {
      await tasksService.delete(task.id);
      onTasksChange();
    }
  }

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="bg-white p-3 rounded-md shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow relative"
      >
        <div className="flex justify-between items-start gap-2">
          <h4 className="font-medium text-slate-800 line-clamp-2">{task.title}</h4>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="text-slate-400 hover:text-slate-600"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {isMenuOpen && (
          <div className="absolute right-2 top-8 bg-white border border-slate-200 shadow-lg rounded-md z-10">
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-slate-50 w-full text-left text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        )}

        
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${PRIORITY_COLORS[task.priority] || 'bg-slate-500'}`}
              title={`Prioridade: ${task.priority}`}
            />
            <span className="text-xs text-slate-500 font-medium">{task.priority}</span>
          </div>
          {task.assigned_to && membersMap[task.assigned_to] && (
            <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded">
              {membersMap[task.assigned_to]}
            </span>
          )}
        </div>

      </div>

      {isModalOpen && (
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={onTasksChange}
          existingTask={task}
        />
      )}
    </>
  );
}
