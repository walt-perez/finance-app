import type { Quote } from '../../../shared/types';

interface Props {
  quote: Quote;
}

export function QuoteCard({ quote }: Props) {
  const up = quote.change >= 0;
  return (
    <article className="quote-card" aria-label={`${quote.symbol} quote`}>
      <h3>{quote.symbol}</h3>
      <p className="muted">{quote.name}</p>
      <p className="price">
        {quote.price.toFixed(2)} <small>{quote.currency}</small>
      </p>
      <p className={up ? 'up' : 'down'}>
        {up ? '▲' : '▼'} {Math.abs(quote.change).toFixed(2)} ({quote.changePercent.toFixed(2)}%)
      </p>
    </article>
  );
}
