'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api, apiUnreachableMessage, type Lead, type LeadStage } from '@/lib/api';

const NEXT_STAGE: Partial<Record<LeadStage, LeadStage>> = {
  NEW: 'CONTACTED',
  CONTACTED: 'QUALIFYING',
  QUALIFYING: 'DOCUMENTS_REQUESTED',
  DOCUMENTS_REQUESTED: 'APPLICATION_SUBMITTED',
  APPLICATION_SUBMITTED: 'APPROVED',
  APPROVED: 'VEHICLE_SELECTED',
  VEHICLE_SELECTED: 'CLOSED_WON',
};

function sourceLabel(source: string) {
  return source.replaceAll('_', ' ');
}

function isDemoLead(card: Pick<Lead, 'sourceDetail' | 'notes'>) {
  const detail = card.sourceDetail?.trim().toUpperCase() ?? '';
  const notes = card.notes?.trim().toUpperCase() ?? '';
  return detail === 'DEMO' || notes.startsWith('[DEMO]');
}

function LeadCard({
  card,
  busy,
  onMove,
  onAdvance,
}: {
  card: Lead;
  busy: boolean;
  onMove: (stage: LeadStage) => void;
  onAdvance: () => void;
}) {
  const next = NEXT_STAGE[card.stage];
  const demo = isDemoLead(card);

  return (
    <article className="rounded-lg border border-slate-200 bg-surface p-3 shadow-sm dark:border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={card.href}
            className="text-sm font-medium text-navy hover:text-brand"
          >
            {card.fullName}
          </Link>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
            {card.cellphone}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {demo ? (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
              Demo
            </span>
          ) : null}
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {sourceLabel(card.source)}
          </span>
        </div>
      </div>
      {card.area ? (
        <p className="mt-2 text-xs text-navy">{card.area}</p>
      ) : null}
      {card.assignedUser ? (
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          {card.assignedUser.fullName}
        </p>
      ) : (
        <p className="mt-1 text-xs text-warning">Unassigned</p>
      )}
      <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
        {card.qualificationStatus.replaceAll('_', ' ')}
      </p>

      {next && card.stage !== 'CLOSED_LOST' ? (
        <button
          type="button"
          disabled={busy}
          onClick={onAdvance}
          className="mt-3 w-full rounded-md bg-brand/15 px-2 py-1.5 text-xs font-medium text-brand hover:bg-brand/25 disabled:opacity-50"
        >
          Advance → {next.replaceAll('_', ' ')}
        </button>
      ) : null}

      <label className="mt-3 block text-[10px] font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
        Move to
        <select
          className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-navy dark:border-slate-600 dark:bg-slate-900"
          value={card.stage}
          disabled={busy}
          onChange={(event) => onMove(event.target.value as LeadStage)}
        >
          {(
            [
              'NEW',
              'CONTACTED',
              'QUALIFYING',
              'DOCUMENTS_REQUESTED',
              'APPLICATION_SUBMITTED',
              'APPROVED',
              'VEHICLE_SELECTED',
              'CLOSED_WON',
              'CLOSED_LOST',
            ] as LeadStage[]
          ).map((stage) => (
            <option key={stage} value={stage}>
              {stage.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}

export default function LeadsBoardPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const board = useQuery({
    queryKey: ['leads-board', search],
    queryFn: () => api.getLeadsBoard({ search: search.trim() || undefined }),
    refetchInterval: 60_000,
  });

  const move = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: LeadStage }) =>
      api.updateLeadStage(id, {
        stage,
        ...(stage === 'CLOSED_LOST' ? { lossReason: 'OTHER' } : {}),
      }),
    onSuccess: async () => {
      setMessage('Lead updated');
      await queryClient.invalidateQueries({ queryKey: ['leads-board'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Move failed');
    },
    onSettled: () => setMovingId(null),
  });

  const total = board.data?.total ?? 0;
  const newCount = useMemo(
    () =>
      board.data?.columns.find((column) => column.stage === 'NEW')?.cards
        .length ?? 0,
    [board.data],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-3xl tracking-tight text-navy"
            style={{ fontFamily: 'var(--font-display), sans-serif' }}
          >
            Leads
          </h1>
          <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-300">
            Work Meta, website, and phone-in enquiries through to a won deal.
            {total ? ` ${total} open in the pipeline` : ''}
            {newCount ? ` · ${newCount} new` : ''}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, phone, area…"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-navy outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={() => void board.refetch()}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-navy hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Refresh
          </button>
          <Link
            href="/leads/new"
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#13729a]"
          >
            Add lead
          </Link>
        </div>
      </div>

      {message ? <p className="text-sm text-brand">{message}</p> : null}
      {board.isLoading ? (
        <p className="text-slate-600 dark:text-slate-300">Loading leads…</p>
      ) : null}
      {board.isError ? (
        <p className="text-danger">{apiUnreachableMessage('the leads board')}</p>
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
                  <LeadCard
                    key={card.id}
                    card={card}
                    busy={movingId === card.id}
                    onMove={(stage) => {
                      if (stage === card.stage) return;
                      setMovingId(card.id);
                      move.mutate({ id: card.id, stage });
                    }}
                    onAdvance={() => {
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
