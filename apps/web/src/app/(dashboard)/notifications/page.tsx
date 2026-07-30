'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SecondaryButton } from '@/components/form';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['notifications', 'all'],
    queryFn: () => api.getNotifications({ includeRead: true, limit: 50 }),
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
          <p className="mt-1 text-brand-grey">
            Operational alerts for payments, service, rule breaches, and
            end-of-term contracts.
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

      {query.isLoading ? (
        <p className="text-brand-grey">Loading alerts…</p>
      ) : null}
      {query.isError ? (
        <p className="text-danger">Could not load notifications.</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <ul>
          {items.map((item) => (
            <li
              key={item.id}
              className={`border-b border-slate-100 last:border-0 ${
                item.isRead ? 'bg-white' : 'bg-mist/60'
              }`}
            >
              <div className="flex items-start justify-between gap-4 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy">{item.title}</p>
                  <p className="mt-1 text-sm text-brand-grey">{item.detail}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-brand-grey">
                    {item.kind.replaceAll('_', ' ')} · {item.severity}
                    {item.amount ? ` · R ${Number(item.amount).toLocaleString()}` : ''}
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
                      className="text-xs text-brand-grey hover:text-navy"
                      onClick={() => markRead.mutate(item.id)}
                    >
                      Mark read
                    </button>
                  ) : (
                    <span className="text-xs text-brand-grey">Read</span>
                  )}
                </div>
              </div>
            </li>
          ))}
          {!query.isLoading && items.length === 0 ? (
            <li className="px-4 py-10 text-center text-brand-grey">
              No active notifications.
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
