import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompetitorManager } from './CompetitorManager';

const setup = (
  competitors: string[],
  onAdd = vi.fn<(symbol: string) => Promise<string | null>>(async () => null),
  onRemove = vi.fn(),
) => {
  render(<CompetitorManager primary="IBM" competitors={competitors} onAdd={onAdd} onRemove={onRemove} />);
  return { onAdd, onRemove };
};

describe('CompetitorManager', () => {
  it('lists IBM without a remove control and each competitor with one', () => {
    setup(['MSFT', 'SAP']);
    expect(screen.getByText('IBM')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove IBM' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove MSFT' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove SAP' })).toBeInTheDocument();
    expect(screen.getByText('Comparing 3 of 5 companies')).toBeInTheDocument();
  });

  it('reports the symbol to remove', async () => {
    const { onRemove } = setup(['MSFT', 'SAP']);
    await userEvent.click(screen.getByRole('button', { name: 'Remove SAP' }));
    expect(onRemove).toHaveBeenCalledExactlyOnceWith('SAP');
  });

  it('reports a normalized symbol to add', async () => {
    const { onAdd } = setup(['MSFT']);
    await userEvent.type(screen.getByLabelText('Competitor ticker'), 'nvda');
    await userEvent.click(screen.getByRole('button', { name: 'Add competitor' }));
    expect(onAdd).toHaveBeenCalledExactlyOnceWith('NVDA');
  });

  it('disables adding and explains why when the limit is reached', () => {
    setup(['MSFT', 'ORCL', 'SAP', 'CRM']);
    expect(screen.getByText('Comparing 5 of 5 companies')).toBeInTheDocument();
    expect(screen.getByText(/Limit reached/)).toBeInTheDocument();
    expect(screen.getByLabelText('Competitor ticker')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add competitor' })).toBeDisabled();
  });

  it('allows adding one below the limit', () => {
    setup(['MSFT', 'ORCL', 'SAP']);
    expect(screen.queryByText(/Limit reached/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add competitor' })).toBeEnabled();
  });

  it('shows the message returned by onAdd', async () => {
    setup(['MSFT'], vi.fn(async () => 'No market data found for ZZZZ.' as string | null));
    await userEvent.type(screen.getByLabelText('Competitor ticker'), 'zzzz{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('No market data found for ZZZZ.');
  });
});
