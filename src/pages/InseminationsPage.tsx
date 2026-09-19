import { Edit, Plus, Save, Trash2, X } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CATTLE_GESTATION_DAYS,
  PREGNANCY_DIAGNOSIS_DAYS,
  getInseminationStatusLabel,
  getInseminationTypeLabel,
  inseminationStatusOptions,
  inseminationTypeOptions,
} from '../constants/reproductionOptions';
import { PageShell } from '../components/layout/PageShell';
import * as animalsService from '../services/animalsService';
import * as inseminationsService from '../services/inseminationsService';
import * as lotsService from '../services/lotsService';
import * as semenService from '../services/semenService';
import type { Animal, Insemination, InseminationStatus, InseminationType, Lot, Semen } from '../types';
import { addDaysToDateString, isFutureDate, todayDateString } from '../utils/date';
import { formatDatePtBr } from '../utils/format';

interface InseminationFormState {
  animal_id: string;
  date: string;
  semen_id: string;
  technician: string;
  protocol: string;
  type: InseminationType;
  status: InseminationStatus;
  notes: string;
}

const emptyForm: InseminationFormState = {
  animal_id: '',
  date: todayDateString(),
  semen_id: '',
  technician: '',
  protocol: '',
  type: 'iatf',
  status: 'awaiting_diagnosis',
  notes: '',
};

function cleanText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isEligibleMatrix(animal: Animal) {
  return (
    animal.sex === 'female' &&
    (animal.category === 'matrix' || animal.category === 'heifer') &&
    (animal.status === 'active' || animal.status === 'inactive') &&
    !animal.deleted_at
  );
}

function inseminationToForm(insemination?: Insemination | null): InseminationFormState {
  if (!insemination) {
    return emptyForm;
  }

  return {
    animal_id: insemination.animal_id,
    date: insemination.date,
    semen_id: insemination.semen_id ?? '',
    technician: insemination.technician ?? '',
    protocol: insemination.protocol ?? '',
    type: insemination.type ?? 'iatf',
    status: insemination.status ?? 'awaiting_diagnosis',
    notes: insemination.notes ?? '',
  };
}

function getMatrixLabel(animals: Animal[], animalId: string) {
  const animal = animals.find((item) => item.id === animalId);

  if (!animal) {
    return 'Matriz não encontrada';
  }

  return `${animal.identification}${animal.name ? ` - ${animal.name}` : ''}`;
}

function getSemenLabel(semenRecords: Semen[], semenId?: string) {
  if (!semenId) {
    return 'Não informado';
  }

  const semen = semenRecords.find((item) => item.id === semenId);

  if (!semen) {
    return 'Sêmen não encontrado';
  }

  return `${semen.bull_name}${semen.breed ? ` · ${semen.breed}` : ''}`;
}

function getLotLabel(lots: Lot[], lotId?: string) {
  if (!lotId) {
    return '';
  }

  const lot = lots.find((item) => item.id === lotId || item.name === lotId);
  return lot?.name ?? lotId;
}

export function InseminationsPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [semenRecords, setSemenRecords] = useState<Semen[]>([]);
  const [inseminations, setInseminations] = useState<Insemination[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingInsemination, setEditingInsemination] = useState<Insemination | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Insemination | null>(null);
  const [form, setForm] = useState<InseminationFormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);

    try {
      const [animalRecords, lotRecords, semenList, inseminationRecords] = await Promise.all([
        animalsService.list(),
        lotsService.list(),
        semenService.list(),
        inseminationsService.list(),
      ]);

      setAnimals(animalRecords);
      setLots(lotRecords);
      setSemenRecords(semenList);
      setInseminations(inseminationRecords);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar inseminações.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const matrixOptions = useMemo(() => {
    const activeMatrixIds = new Set(
      inseminations.filter((i) => i.cycle_status === 'active' || (!i.cycle_status && (i.status === 'awaiting_diagnosis' || i.status === 'positive'))).map((i) => i.animal_id)
    );

    return animals
      .filter((a) => {
        if (editingInsemination && a.id === editingInsemination.animal_id) return true;
        if (!isEligibleMatrix(a)) return false;
        if (activeMatrixIds.has(a.id)) return false;
        return true;
      })
      .sort((a, b) => a.identification.localeCompare(b.identification, 'pt-BR'));
  }, [animals, inseminations, editingInsemination]);

  const sortedInseminations = useMemo(
    () => inseminations.filter(i => i.cycle_status === 'active' || (!i.cycle_status && (i.status === 'awaiting_diagnosis' || i.status === 'positive'))).sort((a, b) => b.date.localeCompare(a.date)),
    [inseminations],
  );

  const previewDates = useMemo(() => {
    if (!form.date) {
      return { diagnosis: undefined, birth: undefined };
    }

    return {
      diagnosis: addDaysToDateString(form.date, PREGNANCY_DIAGNOSIS_DAYS),
      birth: addDaysToDateString(form.date, CATTLE_GESTATION_DAYS),
    };
  }, [form.date]);

  function updateForm<K extends keyof InseminationFormState>(
    field: K,
    value: InseminationFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateForm() {
    setEditingInsemination(null);
    setPendingDelete(null);
    setForm({
      ...emptyForm,
      animal_id: matrixOptions[0]?.id ?? '',
    });
    setError(null);
    setMessage(null);
    setFormOpen(true);
  }

  function openEditForm(insemination: Insemination) {
    if (insemination.status === 'positive' && insemination.cycle_status === 'closed') {
      window.alert('Esta inseminação gerou um parto e foi arquivada. Exclua o parto correspondente se precisar editá-la.');
      return;
    }

    setEditingInsemination(insemination);
    setPendingDelete(null);
    setForm(inseminationToForm(insemination));
    setError(null);
    setMessage(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingInsemination(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    if (!form.animal_id) {
      setError('Selecione uma matriz ou novilha.');
      setSaving(false);
      return;
    }

    if (!form.date || isFutureDate(form.date)) {
      setError('Informe uma data de inseminação válida.');
      setSaving(false);
      return;
    }

    if (!form.semen_id) {
      setError('Selecione um touro ou sêmen.');
      setSaving(false);
      return;
    }

    const hasActive = inseminations.some((ins) => 
        ins.animal_id === form.animal_id &&
        (ins.cycle_status === 'active' || (!ins.cycle_status && (ins.status === 'awaiting_diagnosis' || ins.status === 'positive'))) &&
        (!editingInsemination || ins.id !== editingInsemination.id)
      );

    if (hasActive) {
      setError('Esta matriz já possui uma inseminação ativa (aguardando diagnóstico ou positiva).');
      setSaving(false);
      return;
    }

    const payload = {
      animal_id: form.animal_id,
      date: form.date,
      semen_id: form.semen_id,
      technician: cleanText(form.technician),
      protocol: cleanText(form.protocol),
      type: form.type,
      status: form.status,
      notes: cleanText(form.notes),
    } satisfies inseminationsService.CreateInseminationInput;

    try {
      if (editingInsemination) {
        await inseminationsService.update(editingInsemination.id, payload);
        setMessage('Inseminação atualizada com sucesso.');
      } else {
        await inseminationsService.create(payload);
        setMessage('Inseminação registrada com sucesso.');
      }

      closeForm();
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteClick(insemination: Insemination) {
    if (insemination.status === 'positive' && insemination.cycle_status === 'closed') {
      window.alert('Esta inseminação gerou um parto e foi arquivada. Exclua o parto correspondente se precisar excluí-la.');
      return;
    }
    setPendingDelete(insemination);
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }



    try {
      await inseminationsService.deleteInsemination(pendingDelete.id);
      setPendingDelete(null);
      setMessage('Inseminação excluída com sucesso.');
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir.');
    }
  }

  return (
    <PageShell
      title="Inseminações"
    >
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Aguardando diagnóstico:</span>
          <span className="text-sm font-semibold text-field-700">{inseminations.filter((item) => (item.status ?? 'awaiting_diagnosis') === 'awaiting_diagnosis').length}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Matrizes aptas:</span>
          <span className="text-sm font-semibold text-slate-950">{matrixOptions.length}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-field-600 px-4 text-sm font-semibold text-white transition hover:bg-field-700 focus:outline-none focus:ring-2 focus:ring-field-600 focus:ring-offset-2"
        >
          <Plus size={18} aria-hidden="true" />
          Nova inseminação
        </button>
      </div>

      {message ? (
        <div className="rounded-lg border border-field-100 bg-field-50 px-4 py-3 text-sm font-medium text-field-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {pendingDelete ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-red-800">
              Excluir inseminação de {getMatrixLabel(animals, pendingDelete.animal_id)} em{' '}
              {formatDatePtBr(pendingDelete.date)}?
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="h-10 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white"
              >
                Excluir
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {formOpen ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                {editingInsemination ? 'Editar inseminação' : 'Registrar inseminação'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Somente fêmeas ativas nas categorias matriz ou novilha aparecem aqui.
              </p>
              </div>
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
              aria-label="Fechar formulário"
              title="Fechar"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Matriz *</span>
              <select
                value={form.animal_id}
                onChange={(event) => updateForm('animal_id', event.target.value)}

                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">Selecione</option>
                {matrixOptions.map((animal) => (
                  <option key={animal.id} value={animal.id}>
                    {animal.identification} {animal.name ? `- ${animal.name}` : ''}{' '}
                    {animal.lot_id ? `(${getLotLabel(lots, animal.lot_id)})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Data da inseminação *</span>
              <input
                type="date"
                max={todayDateString()}
                value={form.date}
                onChange={(event) => updateForm('date', event.target.value)}

                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Touro/sêmen utilizado</span>
              <select
                value={form.semen_id}
                onChange={(event) => updateForm('semen_id', event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
              >
                <option value="">Selecione</option>
                {semenRecords.map((semen) => {
                  const doses = semen.doses_available ?? semen.quantity ?? 0;
                  const isCurrent = editingInsemination?.semen_id === semen.id;
                  const disabled = doses <= 0 && !isCurrent;

                  return (
                    <option key={semen.id} value={semen.id} disabled={disabled}>
                      {semen.bull_name} · {doses} dose(s){disabled ? ' - estoque zerado' : ''}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Inseminador responsável</span>
              <input
                value={form.technician}
                onChange={(event) => updateForm('technician', event.target.value)}
                placeholder="Nome do responsável"
                maxLength={100}
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Protocolo utilizado</span>
              <input
                value={form.protocol}
                onChange={(event) => updateForm('protocol', event.target.value)}
                placeholder="Ex.: Protocolo 7 dias"
                maxLength={100}
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Tipo</span>
              <select
                value={form.type}
                onChange={(event) => updateForm('type', event.target.value as InseminationType)}
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
              >
                {inseminationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                value={form.status}
                onChange={(event) => updateForm('status', event.target.value as InseminationStatus)}

                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100 disabled:bg-slate-50 disabled:text-slate-500"
              >
                {inseminationStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-lg border border-field-100 bg-field-50 p-3 text-sm text-field-700 sm:col-span-2">
              <p>
                Previsão de diagnóstico: <strong>{formatDatePtBr(previewDates.diagnosis)}</strong>
              </p>
              <p className="mt-1">
                Previsão de parto: <strong>{formatDatePtBr(previewDates.birth)}</strong>
              </p>
            </div>

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Observações</span>
              <textarea
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
                rows={3}
                maxLength={500}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeForm}
              className="h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-field-600 px-4 text-sm font-semibold text-white disabled:opacity-70"
            >
              <Save size={18} aria-hidden="true" />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Carregando inseminações locais...</div>
        ) : sortedInseminations.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            Nenhuma inseminação registrada ainda.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedInseminations.map((insemination) => (
              <article key={insemination.id} className="p-4">
                <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:items-center">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-field-700">
                      {formatDatePtBr(insemination.date)}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-950">
                      {getMatrixLabel(animals, insemination.animal_id)}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {getSemenLabel(semenRecords, insemination.semen_id)}
                    </p>
                  </div>

                  <dl className="grid gap-2 text-sm">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Tipo</dt>
                      <dd className="font-semibold text-slate-900">
                        {getInseminationTypeLabel(insemination.type)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Status</dt>
                      <dd className="font-semibold text-slate-900">
                        {getInseminationStatusLabel(insemination.status)}
                      </dd>
                    </div>
                  </dl>

                  <dl className="grid gap-2 text-sm">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Prev. diagnóstico</dt>
                      <dd className="font-semibold text-slate-900">
                        {formatDatePtBr(insemination.diagnosis_due_date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Prev. parto</dt>
                      <dd className="font-semibold text-slate-900">
                        {formatDatePtBr(insemination.birth_due_date)}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(insemination)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                      aria-label={`Editar inseminação de ${getMatrixLabel(animals, insemination.animal_id)}`}
                      title="Editar"
                    >
                      <Edit size={17} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeleteClick(insemination)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
                      aria-label={`Excluir inseminação de ${getMatrixLabel(animals, insemination.animal_id)}`}
                      title="Excluir"
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
