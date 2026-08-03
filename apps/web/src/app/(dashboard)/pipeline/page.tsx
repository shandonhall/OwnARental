'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  api,
  type EndOfTermCard,
  type EndOfTermStage,
} from '@/lib/api';

const STAGES: EndOfTermStage[] = [
  'FINAL_90',
  'CONTACTED',
  'BALLOON_PENDING',
  'HANDOVER',
  'RETURNED',
];

const NEXT_STAGE: Partial<Record<EndOfTermStage, EndOfTermStage>> = {
  FINAL_90: 'CONTACTED',
  CONTACTED: 'BALLOON_PENDING',
  BALLOON_PENDING: 'HANDOVER',
  HANDOVER: 'RETURNED',
};

function money(value: string | null) {
  if (value == null) return null;
  return `R ${Number(value).toLocaleString('en-ZA', {
    maximumFractionDigits: 0,
  })}`;
}

function KanbanCard({
  card,
  onMove,
  onCompleteStage,
  busy,
}: {
  card: EndOfTermCard;
  onMove: (stage: EndOfTermStage) => void;
  onCompleteStage: () => void;
  busy: boolean;
}) {
  const next = NEXT_STAGE[card.stage];

  return (
    <article className="rounded-lg border border-slate-200 bg-surface p-3 shadow-sm dark:border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={card.href}
            className="text-sm font-medium text-navy hover:text-brand"
          >
            {card.client.firstName} {card.client.lastName}
          </Link>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
            {card.vehicle.registration} · {card.planType.replace('_', ' ')}
          </p>
        </div>
        <span className="text-xs font-medium tabular-nums text-slate-700 dark:text-slate-200">
          {card.termProgress.daysRemaining}d
        </span>
      </div>
      {card.balloonAmount ? (
        <p className="mt-2 text-xs text-navy">
          Balloon {money(card.balloonAmount)}
          {card.balloonPaid ? ' · paid' : ' · due'}
        </p>
      ) : null}
      {card.ghlOpportunityId ? (
        <p className="mt-1 truncate font-mono text-[10px] text-slate-600 dark:text-slate-300">
          GHL {card.ghlOpportunityId}
        </p>
      ) : null}

      {next ? (
        <button
          type="button"
          disabled={busy}
          onClick={onCompleteStage}
          className="mt-3 w-full rounded-md bg-brand/15 px-2 py-1.5 text-xs font-medium text-brand hover:bg-brand/25 disabled:opacity-50"
        >
          Mark stage complete → {next.replaceAll('_', ' ')}
        </button>
      ) : (
        <p className="mt-3 text-center text-[10px] uppercase tracking-wide text-success">
          Pipeline complete
        </p>
      )}

      <label className="mt-3 block text-[10px] font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
        Move to
        <select
          className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-navy dark:border-slate-600 dark:bg-slate-900"
          value={card.stage}
          disabled={busy}
          onChange={(event) =>
            onMove(event.target.value as EndOfTermStage)
          }
        >
          {STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stage.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}

export default function EndOfTermPipelinePage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const board = useQuery({
    queryKey: ['end-of-term-board'],
    queryFn: () => api.getEndOfTermBoard(),
    refetchInterval: 15 * 60_000,
  });

  const move = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: EndOfTermStage }) =>
      api.updateEndOfTermStage(id, stage),
    onSuccess: async () => {
      setMessage('Stage updated');
      await queryClient.invalidateQueries({ queryKey: ['end-of-term-board'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Move failed');
    },
    onSettled: () => setMovingId(null),
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-3xl tracking-tight text-navy"
            style={{ fontFamily: 'var(--font-display), sans-serif' }}
          >
            End-of-term pipeline
          </h1>
          <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-300">
            Mark a stage complete to auto-advance the card. Completing end-of-
            term tasks on Overview also moves clients forward.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void board.refetch()}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-navy hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Refresh
        </button>
      </div>

      {message ? <p className="text-sm text-brand">{message}</p> : null}
      {board.isLoading ? (
        <p className="text-slate-600 dark:text-slate-300">Loading pipeline…</p>
      ) : null}
      {board.isError ? (
        <p className="text-danger">Could not load end-of-term board.</p>
      ) : null}

      {board.data ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {board.data.columns.map((column) => (
            <div
              key={column.stage}
              className="w-72 shrink-0 rounded-xl border border-slate-200 bg-slate-100/90 p-3 dark:border-slate-700 dark:bg-slate-900/60"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-navy">{column.label}</h2>
                <span className="rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-slate-700 dark:border dark:border-slate-600 dark:text-slate-200">
                  {column.cards.length}
                </span>
              </div>
              <div className="space-y-3">
                {column.cards.map((card) => (
                  <KanbanCard
                    key={card.id}
                    card={card}
                    busy={movingId === card.id}
                    onMove={(stage) => {
                      if (stage === card.stage) return;
                      setMovingId(card.id);
                      move.mutate({ id: card.id, stage });
                    }}
                    onCompleteStage={() => {
                      const next = NEXT_STAGE[card.stage];
                      if (!next) return;
                      setMovingId(card.id);
                      move.mutate({ id: card.id, stage: next });
                    }}
                  />
                ))}
                {column.cards.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
                    Empty
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
