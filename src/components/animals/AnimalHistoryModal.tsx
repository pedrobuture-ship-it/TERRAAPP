import { X, Calendar, Baby } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as inseminationsService from '../../services/inseminationsService';
import * as birthsService from '../../services/birthsService';
import type { Insemination, Birth } from '../../types';
import { formatDatePtBr } from '../../utils/format';
import { getInseminationStatusLabel, getInseminationTypeLabel, getBirthTypeLabel } from '../../constants/reproductionOptions';

interface AnimalHistoryModalProps {
  animalId: string;
  animalName: string;
  onClose: () => void;
}

type TimelineEvent = 
  | { type: 'insemination'; date: string; data: Insemination }
  | { type: 'birth'; date: string; data: Birth };

export function AnimalHistoryModal({ animalId, animalName, onClose }: AnimalHistoryModalProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const [inseminations, births] = await Promise.all([
          inseminationsService.list(),
          birthsService.list(),
        ]);

        const animalInseminations = inseminations.filter((i) => i.animal_id === animalId && (i.cycle_status === 'closed' || (!i.cycle_status && (i.status === 'negative' || i.status === 'aborted'))));
        const animalBirths = births.filter((b) => b.animal_id === animalId);

        const timeline: TimelineEvent[] = [
          ...animalInseminations.map((i): TimelineEvent => ({ type: 'insemination', date: i.date, data: i })),
          ...animalBirths.map((b): TimelineEvent => ({ type: 'birth', date: b.birth_date, data: b })),
        ];

        timeline.sort((a, b) => b.date.localeCompare(a.date));
        setEvents(timeline);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    }

    void loadHistory();
  }, [animalId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Histórico Reprodutivo</h3>
            <p className="text-sm text-slate-500">{animalName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-4">Carregando histórico...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Nenhum histórico encontrado para esta matriz.</p>
          ) : (
            <div className="relative border-l-2 border-slate-100 ml-4 space-y-8">
              {events.map((event, idx) => (
                <div key={idx} className="relative pl-6">
                  <div className={`absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${event.type === 'birth' ? 'bg-field-500' : 'bg-slate-300'}`} />
                  
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    {event.type === 'insemination' ? (
                      <div>
                        <div className="flex items-center gap-2 mb-2 text-slate-500 text-sm font-semibold">
                          <Calendar size={16} />
                          <span>Inseminação ({formatDatePtBr(event.date)})</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-slate-500 block text-xs">Tipo</span>{getInseminationTypeLabel(event.data.type)}</div>
                          <div><span className="text-slate-500 block text-xs">Status</span>{getInseminationStatusLabel(event.data.status)}</div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-2 text-field-600 text-sm font-semibold">
                          <Baby size={16} />
                          <span>Parto ({formatDatePtBr(event.date)})</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-slate-500 block text-xs">Tipo</span>{getBirthTypeLabel(event.data.birth_type)}</div>
                          <div><span className="text-slate-500 block text-xs">Qtd. Bezerros</span>{event.data.calf_count || 1}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}