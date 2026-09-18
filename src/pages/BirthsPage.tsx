import { Baby, Edit, Plus, Save, Trash2, X, AlertTriangle, Archive } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { getBirthTypeLabel, getCalfStatusLabel, birthTypeOptions, calfStatusOptions } from '../constants/reproductionOptions';
import { getAnimalCategoryLabel } from '../constants/animalOptions';
import { PageShell } from '../components/layout/PageShell';
import * as animalsService from '../services/animalsService';
import * as birthsService from '../services/birthsService';
import * as inseminationsService from '../services/inseminationsService';
import type { Animal, Birth, BirthType, CalfStatus, AnimalSex, BirthOutcome } from '../types';
import { formatDatePtBr, formatWeightKg } from '../utils/format';
import { todayDateString, isFutureDate, daysBetweenDateStrings } from '../utils/date';

function cleanText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseDecimal(value: string) {
  const normalized = value.trim().replace(',', '.');
  return normalized ? Number(normalized) : undefined;
}

function parseInteger(value: string) {
  const normalized = value.trim();
  return normalized ? parseInt(normalized, 10) : undefined;
}

function matrixLabel(animals: Animal[], animalId: string) {
  const animal = animals.find((item) => item.id === animalId);
  return animal ? `${animal.identification} ${animal.name ? `- ${animal.name}` : ''}` : 'Matriz n�o encontrada';
}

interface CalfInput {
  identification: string;
  sex: AnimalSex;
  status: CalfStatus;
  weight_kg: string;
}

interface BirthFormState {
  animal_id: string;
  birth_date: string;
  birth_type: BirthType;
  calf_count: string;
  calves: CalfInput[];
  notes: string;
}

const emptyForm: BirthFormState = {
  animal_id: '',
  birth_date: todayDateString(),
  birth_type: 'normal',
  calf_count: '1',
  calves: [{ identification: '', sex: 'male', status: 'alive', weight_kg: '' }],
  notes: '',
};

function birthToForm(birth?: Birth | null): BirthFormState {
  if (!birth) return emptyForm;
  
  const count = birth.calf_count ? Math.max(1, birth.calf_count) : 1;
  const idents = (birth.calf_identification || '').split(',').map(s => s.trim());
  const calves: CalfInput[] = [];
  
  for (let i = 0; i < count; i++) {
    calves.push({
      identification: idents[i] || '',
      sex: birth.calf_sex ?? 'male',
      status: birth.calf_status ?? 'alive',
      weight_kg: birth.birth_weight_kg ? String(birth.birth_weight_kg / count) : '',
    });
  }

  return {
    animal_id: birth.animal_id,
    birth_date: birth.birth_date,
    birth_type: birth.birth_type ?? 'normal',
    calf_count: String(count),
    calves,
    notes: birth.notes ?? '',
  };
}

export function BirthsPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [inseminations, setInseminations] = useState<any[]>([]);
  const [births, setBirths] = useState<Birth[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBirth, setEditingBirth] = useState<Birth | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Birth | null>(null);
  const [form, setForm] = useState<BirthFormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const [animalRecords, birthRecords, inseminationRecords] = await Promise.all([
        animalsService.list(),
        birthsService.list(),
        inseminationsService.list(),
      ]);
      setAnimals(animalRecords);
      setBirths(birthRecords);
      setInseminations(inseminationRecords);
    } catch (err) {
      console.error('Error loading births data:', err);
      setError('Não foi possível carregar os dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const pregnantMatrices = useMemo(() => {
    return animals.filter((animal) => {
      const activePositiveInsemination = inseminations
        .find((i) => i.animal_id === animal.id && i.status === 'positive' && (i.cycle_status === 'active' || !i.cycle_status));
      return !!activePositiveInsemination;
    });
  }, [animals, inseminations]);

  const matrixOptions = useMemo(
    () =>
      animals
        .filter((animal) => {
          if (editingBirth && animal.id === editingBirth.animal_id) return true;
          if (
            animal.sex !== 'female' ||
            (animal.category !== 'matrix' && animal.category !== 'heifer') ||
            (animal.status !== 'active' && animal.status !== 'inactive') ||
            animal.reproductive_status === 'calved' ||
            animal.reproductive_status === 'discarded' ||
            animal.deleted_at
          ) {
            return false;
          }

          const activePositiveInsemination = inseminations
            .find(
              (i) => i.animal_id === animal.id && i.status === 'positive' && (i.cycle_status === 'active' || !i.cycle_status),
            );

          return !!activePositiveInsemination;
        })
        .sort((a, b) => a.identification.localeCompare(b.identification, 'pt-BR')),
    [animals, inseminations, editingBirth],
  );

  const [showHistory, setShowHistory] = useState(false);

  const sortedBirths = useMemo(() => {
    return [...births]
      .filter((b) => (showHistory ? true : !b.is_archived))
      .sort((a, b) => b.birth_date.localeCompare(a.birth_date));
  }, [births, showHistory]);

  function updateForm<K extends keyof BirthFormState>(field: K, value: BirthFormState[K]) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'calf_count') {
        const count = parseInt(value as string) || 1;
        const newCalves = [...current.calves];
        while (newCalves.length < count) {
          newCalves.push({ identification: '', sex: 'male', status: 'alive', weight_kg: '' });
        }
        if (newCalves.length > count) {
          newCalves.splice(count);
        }
        next.calves = newCalves;
      }
      return next;
    });
  }

  function updateCalf(index: number, field: keyof CalfInput, value: string) {
    setForm((current) => {
      const newCalves = [...current.calves];
      newCalves[index] = { ...newCalves[index], [field]: value };
      return { ...current, calves: newCalves };
    });
  }

  function openCreateForm() {
    setEditingBirth(null);
    setPendingDelete(null);
    setForm({
      ...emptyForm,
      animal_id: pregnantMatrices[0]?.id ?? '',
    });
    setError(null);
    setMessage(null);
    setFormOpen(true);
  }

  function openEditForm(birth: Birth) {
    setEditingBirth(birth);
    setPendingDelete(null);
    setForm(birthToForm(birth));
    setError(null);
    setMessage(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingBirth(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const calfCount = parseInteger(form.calf_count) ?? 1;

    if (!form.animal_id) {
      setError('Selecione uma matriz prenha.');
      setSaving(false);
      return;
    }

    if (!form.birth_date || isFutureDate(form.birth_date)) {
      setError('Informe uma data de parto válida.');
      setSaving(false);
      return;
    }

    if (calfCount < 1) {
      setError('Informe a quantidade de bezerros.');
      setSaving(false);
      return;
    }
    
    let totalWeight = 0;
    let hasAlive = false;
    let firstSex: AnimalSex = 'male';

    for (let i = 0; i < form.calves.length; i++) {
      const calf = form.calves[i];
      const w = parseDecimal(calf.weight_kg);
      if (w !== undefined && (Number.isNaN(w) || w < 0)) {
        setError(`Informe um peso válido para o bezerro ${i + 1}.`);
        setSaving(false);
        return;
      }
      if (w) totalWeight += w;
      if (calf.status === 'alive') hasAlive = true;
      if (i === 0) firstSex = calf.sex;
      
      if (calf.status === 'alive' && !calf.identification.trim()) {
        setError(`A identificação do bezerro ${i + 1} é obrigatória para bezerros vivos.`);
        setSaving(false);
        return;
      }
    }

    const allIdents = form.calves.map(c => c.identification.trim()).filter(Boolean);
    const uniqueIdents = new Set(allIdents.map(id => id.toLocaleLowerCase('pt-BR')));
    if (uniqueIdents.size < allIdents.length) {
      setError('Existem identificações de bezerros duplicadas neste formulário.');
      setSaving(false);
      return;
    }

    if (!editingBirth) {
      const existingDuplicateCalf = animals.some((animal) =>
        uniqueIdents.has(animal.identification.trim().toLocaleLowerCase('pt-BR')),
      );

      if (existingDuplicateCalf) {
        setError('Já existe um animal cadastrado com a identificação informada para um dos bezerros.');
        setSaving(false);
        return;
      }
    }

    const outcome: BirthOutcome = hasAlive ? 'alive' : 'stillborn';
    const sumWeight = totalWeight > 0 ? totalWeight : undefined;
    const finalIdentification = allIdents.join(', ') || undefined;

    try {
      const payload = {
        animal_id: form.animal_id,
        birth_date: form.birth_date,
        birth_type: form.birth_type,
        calf_count: calfCount,
        calf_sex: firstSex,
        calf_status: hasAlive ? 'alive' : 'dead',
        calf_identification: finalIdentification,
        birth_weight_kg: sumWeight,
        calf_id: editingBirth?.calf_id,
        outcome,
        notes: cleanText(form.notes),
      } satisfies birthsService.CreateBirthInput;

      if (editingBirth) {
        await birthsService.update(editingBirth.id, {
          ...payload,
          calf_id: editingBirth.calf_id,
        });

        setMessage('Parto atualizado com sucesso.');
      } else {
        let createdCalves: Animal[] = [];
        let anyCreated = false;

        try {
          const matrix = animals.find((a) => a.id === form.animal_id);
          
          // Bug 10 fix: Attempt to find the active insemination to assign the father
          const allInseminations = await inseminationsService.list();
          const activeInsemination = allInseminations.find(
            (ins) => ins.animal_id === form.animal_id && ins.cycle_status === 'active'
          );
          const fatherId = activeInsemination?.bull_id || undefined;

          const calvesToCreate = form.calves.filter(c => c.status === 'alive' && c.identification.trim());
          
          for (const calfInput of calvesToCreate) {
            const newCalf = await animalsService.create({
              identification: calfInput.identification.trim(),
              sex: calfInput.sex,
              category: 'calf',
              status: 'active',
              birth_date: form.birth_date,
              weight_kg: parseDecimal(calfInput.weight_kg),
              mother_id: matrix?.id,
              father_id: fatherId,
              lot_id: matrix?.lot_id,
            });
              createdCalves.push(newCalf);
              anyCreated = true;
            }

          await birthsService.create({
            ...payload,
            calf_id: createdCalves.length > 0 ? createdCalves[0].id : payload.calf_id,
          });
        } catch (birthError) {
          if (createdCalves.length > 0) {
            for (const c of createdCalves) {
              await animalsService.deleteAnimal(c.id).catch(() => undefined);
            }
          }
          throw birthError;
        }

        setMessage(
          anyCreated
            ? 'Parto registrado e bezerros cadastrados com sucesso.'
            : 'Parto registrado com sucesso.',
        );
      }

      closeForm();
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    try {
      await birthsService.deleteBirth(pendingDelete.id);
      setPendingDelete(null);
      setMessage('Parto excluído com sucesso.');
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir.');
    }
  }

  async function handleArchive(birth: Birth) {
    if (window.confirm('Tem certeza que deseja arquivar este parto? Ele não aparecerá na lista principal, mas continuará no histórico do animal.')) {
      try {
        await birthsService.archiveBirth(birth.id);
        setMessage('Parto arquivado com sucesso.');
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao arquivar parto.');
      }
    }
  }
  const shortIntervalWarning = useMemo(() => {
    if (!formOpen || !form.animal_id || !form.birth_date) return null;

    const previousBirths = births.filter(
      (b) => b.animal_id === form.animal_id && (!editingBirth || b.id !== editingBirth.id)
    );

    if (previousBirths.length === 0) return null;

    for (const b of previousBirths) {
      const diff = Math.abs(daysBetweenDateStrings(b.birth_date, form.birth_date));
      if (diff < 300) {
        return diff;
      }
    }
    return null;
  }, [formOpen, form.animal_id, form.birth_date, births, editingBirth]);

  return (
    <PageShell
      title="Partos"
    >
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Partos:</span>
          <span className="text-sm font-semibold text-slate-950">{births.length}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Matrizes prenhas:</span>
          <span className="text-sm font-semibold text-field-700">{pregnantMatrices.length}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Bezerros vivos:</span>
          <span className="text-sm font-semibold text-slate-950">{births.filter((birth) => birth.calf_status === 'alive' || birth.outcome === 'alive').length}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={showHistory}
            onChange={(e) => setShowHistory(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-field-600 focus:ring-field-600"
          />
          Mostrar histórico (partos antigos)
        </label>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-field-600 px-4 text-sm font-semibold text-white transition hover:bg-field-700 focus:outline-none focus:ring-2 focus:ring-field-600 focus:ring-offset-2"
        >
          <Plus size={18} aria-hidden="true" />
          Novo parto
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
              Excluir parto de {matrixLabel(animals, pendingDelete.animal_id)} em{' '}
              {formatDatePtBr(pendingDelete.birth_date)}?
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
                {editingBirth ? 'Editar parto' : 'Registrar parto'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Como opção principal, aparecem matrizes marcadas como prenhas.
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
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
              >
                <option value="">Selecione</option>
                {pregnantMatrices.map((animal) => (
                  <option key={animal.id} value={animal.id}>
                    {animal.identification} {animal.name ? `- ${animal.name}` : ''}
                  </option>
                ))}
                {editingBirth && !pregnantMatrices.some((animal) => animal.id === editingBirth.animal_id) ? (
                  <option value={editingBirth.animal_id}>{matrixLabel(animals, editingBirth.animal_id)}</option>
                ) : null}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Data do parto *</span>
              <input
                type="date"
                max={todayDateString()}
                value={form.birth_date}
                onChange={(event) => updateForm('birth_date', event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Tipo de parto</span>
              <select
                value={form.birth_type}
                onChange={(event) => updateForm('birth_type', event.target.value as BirthType)}
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
              >
                {birthTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Quantidade de bezerros</span>
              <input
                value={form.calf_count}
                onChange={(event) => updateForm('calf_count', event.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
              />
            </label>

{form.calves.map((calf, index) => (
              <div key={index} className="sm:col-span-2 rounded-lg border border-slate-200 p-4 bg-slate-50 space-y-4">
                <h4 className="font-semibold text-slate-700">Bezerro {index + 1}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Sexo</span>
                    <select
                      value={calf.sex}
                      onChange={(event) => updateCalf(index, 'sex', event.target.value as AnimalSex)}
                      className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
                    >
                      <option value="female">Fêmea</option>
                      <option value="male">Macho</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Status</span>
                    <select
                      value={calf.status}
                      onChange={(event) => updateCalf(index, 'status', event.target.value as CalfStatus)}
                      className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
                    >
                      {calfStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Peso (kg)</span>
                    <input
                      type="text"
                      value={calf.weight_kg}
                      onChange={(event) => updateCalf(index, 'weight_kg', event.target.value.replace(/[^0-9,]/g, ''))}
                      placeholder="Ex.: 35,5"
                      inputMode="decimal"
                      className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
                    />
                  </label>

                  {calf.status === 'alive' ? (
                    <label className="block sm:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Identificação do bezerro {index + 1} *</span>
                      <input
                        value={calf.identification}
                        onChange={(event) => updateCalf(index, 'identification', event.target.value)}
                        placeholder={`Ex.: BZ-00${index + 1}`}
                        maxLength={50}
                        className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
                      />
                    </label>
                  ) : null}
                </div>
              </div>
            ))}

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Observações</span>
              <textarea
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-field-600 focus:ring-2 focus:ring-field-100"
              />
            </label>
          </div>
            {shortIntervalWarning !== null && (
              <div className="mt-4 sm:col-span-2 flex gap-3 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 border border-yellow-200">
                <AlertTriangle size={20} className="shrink-0 mt-0.5 text-yellow-600" aria-hidden="true" />
                <p>
                  <strong>Atenção:</strong> O intervalo entre este evento e outro parto da mesma matriz é de apenas <strong>{shortIntervalWarning} dias</strong> (menor que 10 meses).<br/>
                  Biologicamente, isso é improvável para um parto a termo. Verifique se há erro de digitação ou certifique-se de preencher o status como "Aborto".
                </p>
              </div>
            )}

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
          <div className="p-6 text-sm text-slate-500">Carregando partos locais...</div>
        ) : sortedBirths.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">Nenhum parto registrado ainda.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedBirths.map((birth) => (
              <article key={birth.id} className="p-4">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-field-700">
                      {formatDatePtBr(birth.birth_date)}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-950">
                      {matrixLabel(animals, birth.animal_id)}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {birth.calf_identification || birth.calf_id ? 'Bezerro identificado' : 'Sem bezerro vinculado'}
                    </p>
                  </div>

                  <dl className="grid gap-2 text-sm">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Tipo</dt>
                      <dd className="font-semibold text-slate-900">{getBirthTypeLabel(birth.birth_type)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Quantidade</dt>
                      <dd className="font-semibold text-slate-900">{birth.calf_count ?? 1}</dd>
                    </div>
                  </dl>

                  <dl className="grid gap-2 text-sm">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Status bezerro</dt>
                      <dd className="font-semibold text-slate-900">{getCalfStatusLabel(birth.calf_status)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Peso</dt>
                      <dd className="font-semibold text-slate-900">
                        {formatWeightKg(birth.birth_weight_kg)}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(birth)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                      aria-label={`Editar parto de ${matrixLabel(animals, birth.animal_id)}`}
                      title="Editar"
                    >
                      <Edit size={17} aria-hidden="true" />
                    </button>
                    {!birth.is_archived && (
                      <button
                        type="button"
                        onClick={() => handleArchive(birth)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                        aria-label={`Arquivar parto de ${matrixLabel(animals, birth.animal_id)}`}
                        title="Arquivar"
                      >
                        <Archive size={17} aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPendingDelete(birth)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
                      aria-label={`Excluir parto de ${matrixLabel(animals, birth.animal_id)}`}
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

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        <Baby size={18} className="mb-2 text-field-700" aria-hidden="true" />
        Todo bezerro nascido vivo é cadastrado automaticamente no inventário de Animais para manter o rebanho sincronizado.
      </div>
    </PageShell>
  );
}


