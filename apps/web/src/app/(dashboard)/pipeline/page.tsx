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

function money(value: string | null) {
  if (value == null) return null;
  return `R ${Number(value).toLocaleString('en-ZA', {
    maximumFractionDigits: 0,
  })}`;
}

function KanbanCard({
  card,
  onMove,
  busy,
}: {
  card: EndOfTermCard;
  onMove: (stage: EndOfTermStage) => void;
  busy: boolean;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={card.href}
            className="text-sm font-medium text-navy hover:text-brand"
          >
            {card.client.firstName} {card.client.lastName}
          </Link>
          <p className="mt-0.5 text-xs text-brand-grey">
            {card.vehicle.registration} · {card.planType.replace('_', ' ')}
          </p>
        </div>
        <span className="text-xs text-brand-grey">
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
        <p className="mt-1 truncate font-mono text-[10px] text-brand-grey">
          GHL {card.ghlOpportunityId}
        </p>
      ) : null}
      <label className="mt-3 block text-[10px] uppercase tracking-wide text-brand-grey">
        Move to
        <select
          className="mt-1 w-full rounded-md border border-slate-200 bg-mist px-2 py-1.5 text-xs text-navy"
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
    refetchInterval: 60_000,
  });

  const move = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: EndOfTermStage }) =>
      api.updateEndOfTermStage(id, stage),
    onSuccess: async () => {
      setMessage('Stage updated');
      await queryClient.invalidateQueries({ queryKey: ['end-of-term-board'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Move failed');
    },
    onSettled: () => setMovingId(null),
  });

  return (
    <section className="space-y-6">
      <div>
        <h1
          className="text-3xl tracking-tight text-navy"
          style={{ fontFamily: 'var(--font-display), sans-serif' }}
        >
          End-of-term pipeline
        </h1>
        <p className="mt-1 max-w-2xl text-brand-grey">
          Kanban for contracts in the final 90 days — ownership transfer,
          balloon collection, or vehicle return. Cards deep-link to the
          contract ledger.
        </p>
      </div>

      {message ? <p className="text-sm text-brand">{message}</p> : null}
      {board.isLoading ? (
        <p className="text-brand-grey">Loading pipeline…</p>
      ) : null}
      {board.isError ? (
        <p className="text-danger">Could not load end-of-term board.</p>
      ) : null}

      {board.data ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {board.data.columns.map((column) => (
            <div
              key={column.stage}
              className="w-72 shrink-0 rounded-xl border border-slate-200 bg-mist/70 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-navy">{column.label}</h2>
                <span className="rounded-md bg-white px-2 py-0.5 text-xs text-brand-grey">
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
                  />
                ))}
                {column.cards.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-brand-grey">
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
