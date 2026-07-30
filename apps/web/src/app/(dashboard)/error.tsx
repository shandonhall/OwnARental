'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-red-400/30 bg-red-500/10 p-6 text-navy">
      <h2 className="text-lg font-semibold text-red-200">Something went wrong</h2>
      <p className="mt-2 text-sm text-slate-600">
        {error.message || 'The dashboard failed to render.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </div>
  );
}
