const fs = require("fs");

const content = `import { Building2, CheckCircle2, Link as LinkIcon, RefreshCw, Save, Trash2, Users, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageShell } from "../components/layout/PageShell";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../db";
import { isSupabaseConfigured } from "../lib/supabase";
import {
  farmSettingsService,
  getCurrent,
  type CreateFarmSettingsInput,
  type UpdateFarmSettingsInput,
} from "../services/farmSettingsService";
import {
  getActiveFarmContext,
  setActiveFarmName,
} from "../services/farmContextService";
import {
  createRemoteFarm,
  deleteRemoteFarm,
  getSelectedFarmId,
  inviteRemoteFarmMember,
  listRemoteFarmMembers,
  listRemoteFarms,
  removeRemoteFarmMember,
  setSelectedFarmId,
  type RemoteFarm,
  type RemoteFarmMember,
} from "../services/syncService";
import type { FarmSettings } from "../types";
import { formatDatePtBr } from "../utils/date";
import { formatNumberPtBr } from "../utils/number";
import { optionalNumber } from "../utils/validation";

type FarmSettingsFormState = {
  farm_name: string;
  owner_name: string;
  area_total_hectares: string;
  city: string;
  state: string;
  notes: string;
  compact_mode: boolean;
  low_semen_doses_alert: string;
  sanitary_alert_days: string;
};

const defaultForm: FarmSettingsFormState = {
  farm_name: "",
  owner_name: "",
  area_total_hectares: "",
  city: "",
  state: "",
  notes: "",
  compact_mode: false,
  low_semen_doses_alert: "5",
  sanitary_alert_days: "30",
};

function toForm(settings?: FarmSettings): FarmSettingsFormState {
  return {
    farm_name: settings?.farm_name ?? "",
    owner_name: settings?.owner_name ?? "",
    area_total_hectares: settings?.area_total_hectares ? String(settings.area_total_hectares) : "",
    city: settings?.city ?? "",
    state: settings?.state ?? "",
    notes: settings?.notes ?? "",
    compact_mode: Boolean(settings?.app_preferences?.compact_mode),
    low_semen_doses_alert: String(settings?.app_preferences?.low_semen_doses_alert ?? 5),
    sanitary_alert_days: String(settings?.app_preferences?.sanitary_alert_days ?? 30),
  };
}

function buildPayload(form: FarmSettingsFormState, selectedRemoteFarmId?: string) {
  return {
    farm_name: form.farm_name,
    owner_name: form.owner_name,
    area_total_hectares: optionalNumber(form.area_total_hectares),
    city: form.city,
    state: form.state,
    notes: form.notes,
    remote_farm_id: selectedRemoteFarmId,
    app_preferences: {
      compact_mode: form.compact_mode,
      low_semen_doses_alert: optionalNumber(form.low_semen_doses_alert),
      sanitary_alert_days: optionalNumber(form.sanitary_alert_days),
    },
  };
}

async function update(id: string, payload: UpdateFarmSettingsInput) {
  await farmSettingsService.update(id, payload);
  return getCurrent();
}

async function create(payload: CreateFarmSettingsInput) {
  await db.farmSettings.clear();
  await farmSettingsService.create(payload);
  return getCurrent();
}

function roleLabel(role: string) {
  switch (role) {
    case "owner":
      return "Líder / Criador";
    case "admin":
      return "Administrador";
    default:
      return "Membro";
  }
}

export function SettingsPage() {
  const { user, isOnline } = useAuth();

  const [settings, setSettings] = useState<FarmSettings | undefined>();
  const [form, setForm] = useState<FarmSettingsFormState>(defaultForm);
  const [remoteFarms, setRemoteFarms] = useState<RemoteFarm[]>([]);
  const [selectedRemoteFarmId, setSelectedRemoteFarmId] = useState(getSelectedFarmId() ?? "");
  const [newFarmName, setNewFarmName] = useState("");
  const [members, setMembers] = useState<RemoteFarmMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");

  const activeRemoteFarm = useMemo(
    () => remoteFarms.find((farm) => farm.id === selectedRemoteFarmId),
    [remoteFarms, selectedRemoteFarmId],
  );

  const canUseOnlineFarm = Boolean(isSupabaseConfigured && isOnline && user);

  async function loadLocalSettings() {
    setLoading(true);

    try {
      const currentSettings = await getCurrent();
      setSettings(currentSettings);
      setForm(toForm(currentSettings));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar configurações.");
    } finally {
      setLoading(false);
    }
  }

  async function loadOnlineFarms() {
    if (!canUseOnlineFarm) {
      setRemoteFarms([]);
      setMembers([]);
      return;
    }

    setLoadingOnline(true);
    setError(null);

    try {
      const farms = await listRemoteFarms();
      const storedFarmId = getSelectedFarmId();
      const nextFarmId =
        storedFarmId && farms.some((farm) => farm.id === storedFarmId)
          ? storedFarmId
          : farms[0]?.id ?? "";
      const nextFarm = farms.find((farm) => farm.id === nextFarmId);

      setRemoteFarms(farms);
      setSelectedRemoteFarmId(nextFarmId);

      if (nextFarmId) {
        setSelectedFarmId(nextFarmId, nextFarm?.name);
        setMembers(await listRemoteFarmMembers(nextFarmId));
      } else {
        setMembers([]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar fazendas online.");
    } finally {
      setLoadingOnline(false);
    }
  }

  useEffect(() => {
    void loadLocalSettings();
  }, []);

  useEffect(() => {
    void loadOnlineFarms();
  }, [canUseOnlineFarm, user?.id]);

  function updateForm<K extends keyof FarmSettingsFormState>(key: K, value: FarmSettingsFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    setError(null);

    try {
      const payload = buildPayload(form, selectedRemoteFarmId || getSelectedFarmId() || undefined);

      if (!payload.farm_name.trim()) {
        throw new Error("Nome da fazenda é obrigatório.");
      }

      if (
        Number.isNaN(payload.area_total_hectares) ||
        Number.isNaN(payload.app_preferences.low_semen_doses_alert) ||
        Number.isNaN(payload.app_preferences.sanitary_alert_days)
      ) {
        throw new Error("Informe números válidos nas configurações.");
      }

      const savedSettings = settings
        ? await update(settings.id, payload as UpdateFarmSettingsInput)
        : await create(payload as CreateFarmSettingsInput);

      setSettings(savedSettings);
      setForm(toForm(savedSettings));
      setActiveFarmName(savedSettings.farm_name);
      
      if (savedSettings.app_preferences?.compact_mode) {
        document.body.classList.add("compact-mode");
      } else {
        document.body.classList.remove("compact-mode");
      }

      setNotice("Configurações da fazenda salvas no banco local.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível salvar configurações.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateRemoteFarm() {
    if (!user) {
      setError("Entre com sua conta para criar uma fazenda online.");
      return;
    }

    setLoadingOnline(true);
    setNotice(null);
    setError(null);

    try {
      const farm = await createRemoteFarm(newFarmName || form.farm_name, user.id);
      setRemoteFarms((current) => [...current, farm].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setSelectedRemoteFarmId(farm.id);
      setNewFarmName("");
      setNotice("Fazenda online criada e selecionada.");
      setMembers(await listRemoteFarmMembers(farm.id));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Não foi possível criar fazenda online.");
    } finally {
      setLoadingOnline(false);
    }
  }

  async function handleDeleteRemoteFarm() {
    if (!user || !activeRemoteFarm) return;

    if (!window.confirm(\`Tem certeza que deseja EXCLUIR a fazenda online "\${activeRemoteFarm.name}"? Esta ação não pode ser desfeita.\`)) {
      return;
    }

    setLoadingOnline(true);
    setNotice(null);
    setError(null);

    try {
      await deleteRemoteFarm(activeRemoteFarm.id, user.id);
      setNotice("Fazenda online excluída com sucesso.");
      await loadOnlineFarms();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Não foi possível excluir a fazenda online.");
    } finally {
      setLoadingOnline(false);
    }
  }

  async function handleInviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeRemoteFarm || !inviteEmail.trim()) return;

    setLoadingOnline(true);
    setNotice(null);
    setError(null);

    try {
      await inviteRemoteFarmMember(activeRemoteFarm.id, inviteEmail.trim(), inviteRole);
      setNotice("Membro adicionado com sucesso.");
      setInviteEmail("");
      setMembers(await listRemoteFarmMembers(activeRemoteFarm.id));
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Não foi possível adicionar o membro.");
    } finally {
      setLoadingOnline(false);
    }
  }

  async function handleRemoveMember(member: RemoteFarmMember) {
    if (!window.confirm(\`Remover o membro \${member.email || member.user_id}?\`)) {
      return;
    }

    setLoadingOnline(true);
    setNotice(null);
    setError(null);

    try {
      await removeRemoteFarmMember(member.id);
      setNotice("Membro removido com sucesso.");
      setMembers(await listRemoteFarmMembers(member.farm_id));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Não foi possível remover o membro.");
    } finally {
      setLoadingOnline(false);
    }
  }

  async function handleSelectRemoteFarm(farmId: string) {
    const farm = remoteFarms.find((item) => item.id === farmId);

    setSelectedRemoteFarmId(farmId);
    setSelectedFarmId(farmId, farm?.name);
    setNotice(null);
    setError(null);

    if (farmId) {
      setLoadingOnline(true);
      try {
        setMembers(await listRemoteFarmMembers(farmId));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar membros.");
      } finally {
        setLoadingOnline(false);
      }
    } else {
      setMembers([]);
    }
  }

  const ownedFarms = useMemo(() => remoteFarms.filter(f => f.owner_id === user?.id), [remoteFarms, user?.id]);
  const participatingFarms = useMemo(() => remoteFarms.filter(f => f.owner_id !== user?.id), [remoteFarms, user?.id]);
  const currentUserRole = useMemo(() => members.find(m => m.user_id === user?.id)?.role, [members, user?.id]);
  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin";

  return (
    <PageShell title="Configurações">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_350px]">
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-lg bg-field-50 p-2 text-field-700">
                  <Building2 size={20} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Dados da fazenda</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Essas informações ficam disponíveis offline e entram na fila de sincronização.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Nome da fazenda</span>
                  <input
                    value={form.farm_name}
                    onChange={(event) => updateForm("farm_name", event.target.value)}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100"
                    placeholder="Fazenda Boa Vista"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Proprietário</span>
                  <input
                    value={form.owner_name}
                    onChange={(event) => updateForm("owner_name", event.target.value)}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100"
                    placeholder="Nome do proprietário"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Área total</span>
                  <input
                    value={form.area_total_hectares}
                    onChange={(event) => updateForm("area_total_hectares", event.target.value)}
                    inputMode="decimal"
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100"
                    placeholder="hectares"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Cidade</span>
                  <input
                    value={form.city}
                    onChange={(event) => updateForm("city", event.target.value)}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100"
                    placeholder="Cidade"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Estado</span>
                  <input
                    value={form.state}
                    onChange={(event) => updateForm("state", event.target.value.toUpperCase().slice(0, 2))}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm uppercase outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100"
                    placeholder="UF"
                    maxLength={2}
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Observações</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100"
                    placeholder="Informações gerais da propriedade"
                  />
                </label>
              </div>

              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-950">Preferências do app</h4>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.compact_mode}
                      onChange={(event) => updateForm("compact_mode", event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-field-600 focus:ring-field-600"
                    />
                    Modo compacto
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Alerta sêmen baixo</span>
                    <input
                      value={form.low_semen_doses_alert}
                      onChange={(event) => updateForm("low_semen_doses_alert", event.target.value)}
                      inputMode="numeric"
                      className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Alerta sanitário dias</span>
                    <input
                      value={form.sanitary_alert_days}
                      onChange={(event) => updateForm("sanitary_alert_days", event.target.value)}
                      inputMode="numeric"
                      className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  {settings ? \`Atualizado em \${formatDatePtBr(settings.updated_at)}\` : "Ainda sem configuração salva."}
                </p>
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-field-600 px-4 text-sm font-semibold text-white transition hover:bg-field-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={18} aria-hidden="true" />
                  Salvar configurações
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                  <RefreshCw size={20} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Sincronização Online</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Conecte o aplicativo a um banco de dados online para acessar de outros dispositivos ou ter backup automático em tempo real.
                  </p>
                </div>
              </div>

              {!isSupabaseConfigured ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="font-semibold">Supabase não configurado.</p>
                  <p className="mt-1">
                    Preencha <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no ambiente para ativar a sincronização online.
                  </p>
                </div>
              ) : !isOnline ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Sem internet agora. A seleção online fica disponível quando a conexão voltar.
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Selecionar fazenda ativa</span>
                    <select
                      value={selectedRemoteFarmId}
                      onChange={(event) => void handleSelectRemoteFarm(event.target.value)}
                      disabled={loadingOnline || remoteFarms.length === 0}
                      className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {remoteFarms.length === 0 ? (
                        <option value="">Nenhuma fazenda online</option>
                      ) : (
                        <>
                          {ownedFarms.length > 0 && (
                            <optgroup label="Suas fazendas">
                              {ownedFarms.map((farm) => (
                                <option key={farm.id} value={farm.id}>{farm.name}</option>
                              ))}
                            </optgroup>
                          )}
                          {participatingFarms.length > 0 && (
                            <optgroup label="Fazendas que você é participante">
                              {participatingFarms.map((farm) => (
                                <option key={farm.id} value={farm.id}>{farm.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </>
                      )}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Criar fazenda online</span>
                    <div className="mt-1 flex gap-2">
                      <input
                        value={newFarmName}
                        onChange={(event) => setNewFarmName(event.target.value)}
                        placeholder={form.farm_name || "Nome da fazenda"}
                        className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100"
                      />
                      <button
                        type="button"
                        onClick={handleCreateRemoteFarm}
                        disabled={loadingOnline || !(newFarmName.trim() || form.farm_name.trim())}
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Criar
                      </button>
                    </div>
                  </label>

                  {activeRemoteFarm ? (
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-field-100 bg-field-50 p-3 text-sm text-field-800">
                      <div>
                        <div className="flex items-center gap-2 font-semibold">
                          <CheckCircle2 size={18} aria-hidden="true" />
                          {activeRemoteFarm.name}
                        </div>
                        <p className="mt-1">
                          Esta é a fazenda ativa para os próximos envios e baixas do Supabase.
                        </p>
                      </div>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={handleDeleteRemoteFarm}
                          disabled={loadingOnline}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Excluir fazenda online"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                  <Users size={20} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Membros da fazenda</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Adicione novos membros pelo e-mail (eles já devem ter criado conta no aplicativo).
                  </p>
                </div>
              </div>

              {selectedRemoteFarmId ? (
                <div className="space-y-4">
                  {(isOwner || isAdmin) && (
                    <form onSubmit={handleInviteMember} className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="E-mail do membro"
                        className="h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100"
                      />
                      <select
                        value={inviteRole}
                        onChange={(event) => setInviteRole(event.target.value as "admin" | "member")}
                        className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100"
                      >
                        <option value="member">Membro</option>
                        <option value="admin">Administrador</option>
                      </select>
                      <button
                        type="submit"
                        disabled={loadingOnline || !inviteEmail.trim()}
                        className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
                      >
                        Adicionar
                      </button>
                    </form>
                  )}

                  {members.length > 0 ? (
                    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {members.map((member) => {
                        const isSelf = member.user_id === user?.id;
                        const isLeader = member.role === "owner";
                        const canRemove = isSelf ? !isLeader : ((isOwner || isAdmin) && !isLeader);

                        return (
                          <div key={member.id} className="flex items-center justify-between p-3 text-sm">
                            <div>
                              <p className="font-semibold text-slate-950">
                                {isSelf ? user?.email ?? "Você" : member.email || member.user_id}
                              </p>
                              <p className="mt-1 text-slate-500">
                                {roleLabel(member.role)} · desde {formatDatePtBr(member.created_at)}
                              </p>
                            </div>
                            {canRemove && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member)}
                                disabled={loadingOnline}
                                className="inline-flex h-8 w-8 items-center justify-center rounded text-red-600 hover:bg-red-50 disabled:opacity-50"
                                title={isSelf ? "Sair da fazenda" : "Remover membro"}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                      Nenhum membro carregado.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Selecione uma fazenda online acima para gerenciar membros.
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Resumo local</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {form.farm_name || "Fazenda sem nome"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {form.area_total_hectares
                  ? \`\${formatNumberPtBr(optionalNumber(form.area_total_hectares), 2)} ha\`
                  : "Área não informada"}
              </p>
            </section>
          </div>
        </div>
      </div>

      {notice ? (
        <div className="rounded-lg border border-field-100 bg-field-50 px-4 py-3 text-sm font-medium text-field-700">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Carregando configurações locais...
        </div>
      ) : null}
    </PageShell>
  );
}
\`;

fs.writeFileSync("src/pages/SettingsPage.tsx", content, "utf8");
