import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SymbolPicker } from './SymbolPicker';

describe('SymbolPicker', () => {
  it('reports a normalized symbol on submit', async () => {
    const onSelect = vi.fn();
    render(<SymbolPicker onSelect={onSelect} />);

    await userEvent.type(screen.getByLabelText('Ticker symbol'), '  nvda ');
    await userEvent.click(screen.getByRole('button', { name: 'Show graph' }));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('NVDA');
    expect(screen.getByLabelText('Ticker symbol')).toHaveValue('NVDA');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('submits with the Enter key', async () => {
    const onSelect = vi.fn();
    render(<SymbolPicker onSelect={onSelect} />);
    await userEvent.type(screen.getByLabelText('Ticker symbol'), 'brk-b{Enter}');
    expect(onSelect).toHaveBeenCalledWith('BRK-B');
  });

  it('asks for a symbol when the input is empty', async () => {
    const onSelect = vi.fn();
    render(<SymbolPicker onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: 'Show graph' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a ticker symbol');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it.each(['123', 'TOO-LONG-SYMBOL', 'A B', '<script>'])('rejects %j with a clear message', async (input) => {
    const onSelect = vi.fn();
    render(<SymbolPicker onSelect={onSelect} />);
    await userEvent.type(screen.getByLabelText('Ticker symbol'), input);
    await userEvent.click(screen.getByRole('button', { name: 'Show graph' }));

    expect(screen.getByRole('alert')).toHaveTextContent('is not a valid ticker symbol');
    expect(screen.getByLabelText('Ticker symbol')).toHaveAttribute('aria-invalid', 'true');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('clears the error after a valid submission', async () => {
    render(<SymbolPicker onSelect={vi.fn()} />);
    const input = screen.getByLabelText('Ticker symbol');

    await userEvent.type(input, '!!');
    await userEvent.click(screen.getByRole('button', { name: 'Show graph' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await userEvent.clear(input);
    await userEvent.type(input, 'AMD');
    await userEvent.click(screen.getByRole('button', { name: 'Show graph' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });
});
