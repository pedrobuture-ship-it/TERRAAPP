import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { Task } from '../../types';
import { tasksService } from '../../services/tasksService';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  existingTask?: Task;
}

export function TaskModal({ isOpen, onClose, onSave, existingTask }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Média');
  const [status, setStatus] = useState('todo');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingTask) {
      setTitle(existingTask.title);
      setDescription(existingTask.description || '');
      setPriority(existingTask.priority);
      setStatus(existingTask.status);
    } else {
      setTitle('');
      setDescription('');
      setPriority('Baixa');
      setStatus('todo');
    }
  }, [existingTask, isOpen]);

  if (!isOpen) return null;

  async function handleSave() {
    if (!title.trim()) {
      alert('O título é obrigatório.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title,
        description,
        priority,
        status,
      };

      if (existingTask) {
        await tasksService.update(existingTask.id, payload);
      } else {
        await tasksService.create(payload);
      }

      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar tarefa');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">
            {existingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-field-500 focus:ring-field-500 sm:text-sm p-2 border"
              placeholder="Ex: Comprar sal mineral"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-field-500 focus:ring-field-500 sm:text-sm p-2 border"
              >
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Coluna Atual</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-field-500 focus:ring-field-500 sm:text-sm p-2 border"
              >
                <option value="todo">A fazer</option>
                <option value="doing">Em andamento</option>
                <option value="done">Finalizado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-field-500 focus:ring-field-500 sm:text-sm p-2 border"
              placeholder="Detalhes adicionais..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-md"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-field-600 hover:bg-field-700 rounded-md disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
