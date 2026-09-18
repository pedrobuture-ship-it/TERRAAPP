import type { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-5 md:px-6 md:py-8">
      {children ?? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          Em preparação.
        </div>
      )}
    </section>
  );
}
