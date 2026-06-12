type Props = { message?: string | null };

export function ErrorAlert({ message }: Props) {
  if (!message) return null;

  return (
    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-center font-mono text-sm text-rose-700">
      {message}
    </div>
  );
}
