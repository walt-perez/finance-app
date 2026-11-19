import { useState, type FormEvent } from 'react';
import { MarketDataError, normalizeSymbol } from '../../../shared/validation';

interface Props {
  onSelect: (symbol: string) => void;
}

/** Ticker input that validates on submit and reports only well-formed, normalized symbols. */
export function SymbolPicker({ onSelect }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (value.trim() === '') {
      setError('Enter a ticker symbol, for example NVDA.');
      return;
    }
    try {
      const symbol = normalizeSymbol(value);
      setError(null);
      setValue(symbol);
      onSelect(symbol);
    } catch (err) {
      setError(err instanceof MarketDataError ? err.message : 'Enter a valid ticker symbol.');
    }
  }

  return (
    <form className="symbol-picker" onSubmit={handleSubmit} noValidate>
      <label htmlFor="symbol-input">Ticker symbol</label>
      <input
        id="symbol-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. NVDA"
        autoComplete="off"
        aria-invalid={error !== null}
        aria-describedby={error ? 'symbol-error' : undefined}
      />
      <button type="submit">Show graph</button>
      {error && (
        <p id="symbol-error" role="alert" className="state state-error">
          {error}
        </p>
      )}
    </form>
  );
}
