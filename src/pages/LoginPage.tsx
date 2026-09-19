import { ArrowLeft, Loader2, LogIn, WifiOff } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, isOnline, isSupabaseConfigured, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canUseOnlineAuth = isSupabaseConfigured && isOnline;

  const statusMessage = useMemo(() => {
    if (!isSupabaseConfigured) {
      return 'Supabase ainda não está configurado neste ambiente. O app local continua funcionando normalmente.';
    }

    if (!isOnline) {
      return 'Sem internet agora. Login online fica pausado, mas o uso offline local continua liberado.';
    }

    if (user) {
      return `Sessão ativa: ${user.email ?? 'usuário logado'}.`;
    }

    return 'Use sua conta online para sincronização e backup em nuvem.';
  }, [isOnline, isSupabaseConfigured, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setError(null);

    if (!email.trim()) {
      setError('Informe seu e-mail.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
      setNotice('Login realizado com sucesso.');
      navigate('/dashboard');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível concluir a operação.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <Link
          to="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-field-700 hover:text-field-900"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar para o app local
        </Link>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
          <div className="mb-6 flex items-center gap-3">
            <img src="/icons/icon.svg" alt="" className="h-12 w-12 rounded-2xl" />
            <div>
              <h1 className="text-xl font-semibold text-slate-950">TERRA</h1>
              <p className="text-sm text-slate-500">Login</p>
            </div>
          </div>

          <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <div className="flex gap-2">
              {!isOnline ? <WifiOff size={18} className="mt-0.5 text-slate-500" aria-hidden="true" /> : null}
              <p>{statusMessage}</p>
            </div>
          </div>

          {notice ? (
            <div className="mb-4 rounded-lg border border-field-100 bg-field-50 px-3 py-2 text-sm font-medium text-field-700">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="usuario@fazenda.com.br"
                autoComplete="email"
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Senha</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo de 6 caracteres"
                autoComplete="current-password"
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-field-600 focus:ring-2 focus:ring-field-100"
              />
            </label>

            <button
              type="submit"
              disabled={loading || submitting || !canUseOnlineAuth}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-field-600 px-4 text-sm font-semibold text-white transition hover:bg-field-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-field-600 focus:ring-offset-2"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <LogIn size={18} aria-hidden="true" />
              )}
              Entrar
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            Apenas membros autorizados possuem acesso. O uso offline local continua liberado.
          </p>
        </section>
      </div>
    </main>
  );
}