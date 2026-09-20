import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import type { Lot } from '../../types';

interface BatchMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (lotId: string) => Promise<void>;
  lots: Lot[];
  selectedCount: number;
}

export function BatchMoveModal({ isOpen, onClose, onConfirm, lots, selectedCount }: BatchMoveModalProps) {
  const [selectedLot, setSelectedLot] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  async function handleConfirm() {
    if (!selectedLot) {
      alert('Selecione um lote de destino.');
      return;
    }

    setIsSaving(true);
    try {
      await onConfirm(selectedLot);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao mover animais.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Mover Animais</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Você está prestes a mover <strong>{selectedCount}</strong> animais para um novo lote.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lote de Destino</label>
            <select
              value={selectedLot}
              onChange={(e) => setSelectedLot(e.target.value)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-field-500 focus:ring-field-500 sm:text-sm p-2 border"
            >
              <option value="">-- Selecione o Lote --</option>
              {lots.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
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
            onClick={handleConfirm}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-field-600 hover:bg-field-700 rounded-md disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Movendo...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
