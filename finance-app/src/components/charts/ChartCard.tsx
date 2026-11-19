import type { ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from '../feedback/States';

interface Props {
  title: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  children: ReactNode;
}

/** Reusable card shell: title plus loading / error / empty slots around any content. */
export function ChartCard({ title, subtitle, loading, error, empty, children }: Props) {
  return (
    <section className="card" aria-label={title}>
      <header className="card-header">
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
      </header>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : empty ? (
        <EmptyState message="No data available." />
      ) : (
        children
      )}
    </section>
  );
}
