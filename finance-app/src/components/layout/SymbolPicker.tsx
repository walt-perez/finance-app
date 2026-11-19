import { useState, type FormEvent } from 'react';
import { MarketDataError, normalizeSymbol } from '../../../shared/validation';

interface Props {
  /** Called with a normalized symbol. Return (or resolve to) a string to show it as an error. */
  onSelect: (symbol: string) => void | string | null | Promise<string | null | void>;
  id?: string;
  label?: string;
  submitLabel?: string;
  disabled?: boolean;
  /** Empty the input after a successful submit. */
  clearOnSuccess?: boolean;
}

/** Ticker input that validates on submit and reports only well-formed, normalized symbols. */
export function SymbolPicker({
  onSelect,
  id = 'symbol-input',
  label = 'Ticker symbol',
  submitLabel = 'Show graph',
  disabled = false,
  clearOnSuccess = false,
}: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (value.trim() === '') {
      setError('Enter a ticker symbol, for example NVDA.');
      return;
    }
    let symbol: string;
    try {
      symbol = normalizeSymbol(value);
    } catch (err) {
      setError(err instanceof MarketDataError ? err.message : 'Enter a valid ticker symbol.');
      return;
    }
    setValue(symbol);
    setBusy(true);
    const problem = await onSelect(symbol);
    setBusy(false);
    if (typeof problem === 'string') {
      setError(problem);
    } else {
      setError(null);
      if (clearOnSuccess) setValue('');
    }
  }

  return (
    <form className="symbol-picker" onSubmit={handleSubmit} noValidate>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. NVDA"
        autoComplete="off"
        aria-invalid={error !== null}
        aria-describedby={error ? `${id}-error` : undefined}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || busy}>
        {submitLabel}
      </button>
      {error && (
        <p id={`${id}-error`} role="alert" className="state state-error">
          {error}
        </p>
      )}
    </form>
  );
}
