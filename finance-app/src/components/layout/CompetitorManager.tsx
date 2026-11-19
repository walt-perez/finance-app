import { MAX_COMPANIES } from '../../../shared/types';
import { SymbolPicker } from './SymbolPicker';

interface Props {
  /** Always shown and never removable. */
  primary: string;
  competitors: string[];
  /** Resolves to null on success, or a message to show. */
  onAdd: (symbol: string) => Promise<string | null>;
  onRemove: (symbol: string) => void;
}

/** Lists the compared companies and lets the user add or remove competitors up to the limit. */
export function CompetitorManager({ primary, competitors, onAdd, onRemove }: Props) {
  const full = competitors.length + 1 >= MAX_COMPANIES;
  return (
    <section className="card" aria-label="Manage competitors">
      <header className="card-header">
        <h2>Competitors</h2>
        <p className="muted">
          Comparing {competitors.length + 1} of {MAX_COMPANIES} companies
        </p>
      </header>
      <ul className="company-list">
        <li className="company-chip">{primary}</li>
        {competitors.map((symbol) => (
          <li key={symbol} className="company-chip">
            {symbol}
            <button type="button" aria-label={`Remove ${symbol}`} onClick={() => onRemove(symbol)}>
              ×
            </button>
          </li>
        ))}
      </ul>
      {full && <p className="muted">Limit reached. Remove a competitor to add another.</p>}
      <SymbolPicker
        id="competitor-input"
        label="Competitor ticker"
        submitLabel="Add competitor"
        disabled={full}
        clearOnSuccess
        onSelect={onAdd}
      />
    </section>
  );
}
