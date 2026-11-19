interface Props {
  message: string;
}

export function LoadingState({ message = 'Loading…' }: Partial<Props>) {
  return (
    <p role="status" className="state state-loading">
      {message}
    </p>
  );
}

export function ErrorState({ message }: Props) {
  return (
    <p role="alert" className="state state-error">
      {message}
    </p>
  );
}

export function EmptyState({ message }: Props) {
  return <p className="state state-empty">{message}</p>;
}
