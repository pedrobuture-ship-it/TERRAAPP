const fs = require('fs');
let content = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

// 1. Inject the update function
const updateMemberFunc = `  async function handleUpdateMemberRole(member: RemoteFarmMember, newRole: string) {
    if (!activeRemoteFarm) return;
    setLoadingOnline(true);
    setNotice(null);
    setError(null);
    try {
      // @ts-ignore
      await updateRemoteFarmMember(member.id, newRole);
      setMembers(await listRemoteFarmMembers(activeRemoteFarm.id));
      setNotice('Papel do membro atualizado com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar o membro.');
    } finally {
      setLoadingOnline(false);
    }
  }
`;

content = content.replace('  async function handleRemoveMember(member: RemoteFarmMember) {', updateMemberFunc + '\n  async function handleRemoveMember(member: RemoteFarmMember) {');

// 2. Add import for updateRemoteFarmMember
content = content.replace('removeRemoteFarmMember,', 'removeRemoteFarmMember,\n  updateRemoteFarmMember,');

// 3. Update the member row UI
const oldMemberRow = `                            <div key={member.id} className="flex items-center justify-between p-3 text-sm">
                              <div>
                                <p className="font-semibold text-slate-950">
                                  {isSelf ? user?.email ?? 'Você' : member.email || member.user_id}
                                </p>
                                <p className="mt-1 text-slate-500">
                                  {roleLabel(member.role)} • desde {formatDatePtBr(member.created_at)}
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
                            </div>`;

const newMemberRow = `                            <div key={member.id} className="flex items-center justify-between p-3 text-sm">
                              <div>
                                <p className="font-semibold text-slate-950">
                                  {isSelf ? user?.email ?? 'Você' : member.email || member.user_id}
                                </p>
                                <div className="mt-1 flex items-center gap-2 text-slate-500">
                                  {isOwner && !isLeader && !isSelf ? (
                                    <select
                                      value={member.role}
                                      onChange={(e) => handleUpdateMemberRole(member, e.target.value)}
                                      disabled={loadingOnline}
                                      className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs outline-none focus:border-field-600"
                                    >
                                      <option value="member">Membro</option>
                                      <option value="admin">Administrador</option>
                                    </select>
                                  ) : (
                                    <span>{roleLabel(member.role)}</span>
                                  )}
                                  <span>• desde {formatDatePtBr(member.created_at)}</span>
                                </div>
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
                            </div>`;

// Use regex or string replace. The utf8 characters like 'Você' might mismatch.
// So I will just use regex to target the whole block safely.
const regex = /<div key=\{member\.id\} className="flex items-center justify-between p-3 text-sm">([\s\S]*?)<\/div>/;
content = content.replace(regex, newMemberRow);

fs.writeFileSync('src/pages/SettingsPage.tsx', content, 'utf8');
console.log('Done.');
