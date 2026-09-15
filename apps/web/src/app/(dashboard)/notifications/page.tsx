'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  api,
  notificationCategory,
  notificationCategoryLabel,
  type AppNotification,
  type NotificationCategory,
} from '@/lib/api';
import { formatMoney } from '@/lib/format-money';
import { SecondaryButton } from '@/components/form';

type NotifTab = 'all' | NotificationCategory;

const TABS: Array<{ id: NotifTab; label: string; hint: string }> = [
  { id: 'all', label: 'All', hint: 'Everything in the queue' },
  {
    id: 'payments',
    label: 'Payments',
    hint: 'Missed rent, arrears, late pay, fines',
  },
  { id: 'service', label: 'Service', hint: 'Vehicles due for service' },
  {
    id: 'driver',
    label: 'Driver',
    hint: 'Telematics / behaviour rule breaches',
  },
  {
    id: 'end_of_term',
    label: 'End of term',
    hint: 'Ownership and return outreach',
  },
  { id: 'leads', label: 'Leads', hint: 'New assignments and sales follow-up' },
];

function severityClass(severity: string) {
  if (severity === 'HIGH') return 'text-danger';
  if (severity === 'MEDIUM') return 'text-warning';
  return 'text-slate-600 dark:text-slate-300';
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<NotifTab>('all');

  const query = useQuery({
    queryKey: ['notifications', 'all'],
    queryFn: () => api.getNotifications({ includeRead: true, limit: 100 }),
    refetchInterval: 60_000,
  });

  const markAll = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const items = query.data?.items ?? [];
  const unread = query.data?.unreadCount ?? 0;

  const counts = useMemo(() => {
    const next: Record<NotifTab, number> = {
      all: items.length,
      payments: 0,
      service: 0,
      driver: 0,
      end_of_term: 0,
      leads: 0,
      other: 0,
    };
    for (const item of items) {
      next[notificationCategory(item.kind)] += 1;
    }
    return next;
  }, [items]);

  const filtered = useMemo(() => {
    if (tab === 'all') return items;
    return items.filter((item) => notificationCategory(item.kind) === tab);
  }, [items, tab]);

  const grouped = useMemo(() => {
    if (tab !== 'all') return null;
    const order: NotificationCategory[] = [
      'payments',
      'driver',
      'end_of_term',
      'service',
      'leads',
      'other',
    ];
    return order
      .map((category) => ({
        category,
        items: items.filter(
          (item) => notificationCategory(item.kind) === category,
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [items, tab]);

  function renderItem(item: AppNotification) {
    const category = notificationCategory(item.kind);
    return (
      <li
        key={item.id}
        className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40 ${
          item.isRead ? 'bg-surface' : 'bg-slate-50 dark:bg-slate-900/50'
        }`}
      >
        <div className="flex items-start justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-navy">{item.title}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {item.detail}
            </p>
            <p className="mt-2 text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
              <span>{notificationCategoryLabel(category)}</span>
              <span className="mx-1.5 text-slate-400">·</span>
              <span>{item.kind.replaceAll('_', ' ')}</span>
              <span className="mx-1.5 text-slate-400">·</span>
              <span className={severityClass(item.severity)}>
                {item.severity}
              </span>
              {item.amount ? (
                <>
                  <span className="mx-1.5 text-slate-400">·</span>
                  <span className="tabular-nums">
                    {formatMoney(item.amount)}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {item.href ? (
              <Link
                href={item.href}
                onClick={() => {
                  if (!item.isRead) markRead.mutate(item.id);
                }}
                className="text-sm text-brand hover:underline"
              >
                Open
              </Link>
            ) : null}
            {!item.isRead ? (
              <button
                type="button"
                className="text-xs text-slate-600 hover:text-navy dark:text-slate-300"
                onClick={() => markRead.mutate(item.id)}
              >
                Mark read
              </button>
            ) : (
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Read
              </span>
            )}
          </div>
        </div>
      </li>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-3xl tracking-tight text-navy"
            style={{ fontFamily: 'var(--font-display), sans-serif' }}
          >
            Notification center
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Separated by payments, service, driver behaviour, and end-of-term —
            so speeding alerts are not mixed with arrears.
          </p>
        </div>
        <SecondaryButton
          type="button"
          disabled={unread === 0 || markAll.isPending}
          onClick={() => markAll.mutate()}
        >
          Mark all read
        </SecondaryButton>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.hint}
            onClick={() => setTab(item.id)}
            className={`border-b-2 px-3 py-2 text-sm transition ${
              tab === item.id
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-600 hover:text-navy dark:text-slate-300'
            }`}
          >
            {item.label}
            <span className="ml-1.5 tabular-nums text-xs text-slate-500 dark:text-slate-400">
              {counts[item.id]}
            </span>
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <p className="text-slate-600 dark:text-slate-300">Loading alerts…</p>
      ) : null}
      {query.isError ? (
        <p className="text-danger">Could not load notifications.</p>
      ) : null}

      {tab === 'all' && grouped ? (
        <div className="space-y-4">
          {grouped.map((section) => (
            <div
              key={section.category}
              className="overflow-hidden rounded-xl border border-slate-200 bg-surface dark:border-slate-700"
            >
              <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                  {notificationCategoryLabel(section.category)}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {section.items.length} alert
                  {section.items.length === 1 ? '' : 's'}
                </p>
              </div>
              <ul>{section.items.map(renderItem)}</ul>
            </div>
          ))}
          {!query.isLoading && grouped.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-surface px-4 py-10 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
              No active notifications.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-surface dark:border-slate-700">
          <ul>
            {filtered.map(renderItem)}
            {!query.isLoading && filtered.length === 0 ? (
              <li className="px-4 py-10 text-center text-slate-600 dark:text-slate-300">
                Nothing in this category right now.
              </li>
            ) : null}
          </ul>
        </div>
      )}
    </section>
  );
}
