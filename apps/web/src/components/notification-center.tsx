'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { api, type AppNotification } from '@/lib/api';

function severityClass(severity: string) {
  if (severity === 'HIGH') return 'text-danger';
  if (severity === 'MEDIUM') return 'text-warning';
  return 'text-brand-grey';
}

function NotificationItem({
  item,
  onOpen,
}: {
  item: AppNotification;
  onOpen: (item: AppNotification) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className={`flex w-full items-start justify-between gap-3 border-b border-slate-100 px-3 py-3 text-left transition last:border-0 hover:bg-mist ${
          item.isRead ? 'opacity-70' : ''
        }`}
      >
        <div className="min-w-0">
          <p className="truncate text-sm text-navy">{item.title}</p>
          <p className="mt-0.5 text-xs text-brand-grey">{item.detail}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-xs font-medium ${severityClass(item.severity)}`}>
            {item.kind.replaceAll('_', ' ')}
          </p>
          {!item.isRead ? (
            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-brand-red" />
          ) : null}
        </div>
      </button>
    </li>
  );
}

export function NotificationCenter() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications({ includeRead: true, limit: 20 }),
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const unread = query.data?.unreadCount ?? 0;
  const items = query.data?.items ?? [];

  async function openItem(item: AppNotification) {
    if (!item.isRead) {
      await markRead.mutateAsync(item.id);
    }
    setOpen(false);
    if (item.href) {
      router.push(item.href);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-navy hover:bg-mist"
        aria-label="Notifications"
      >
        Alerts
        {unread > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <p className="text-sm font-medium text-navy">Notification center</p>
            <button
              type="button"
              disabled={unread === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
              className="text-xs text-brand disabled:text-brand-grey"
            >
              Mark all read
            </button>
          </div>
          {query.isLoading ? (
            <p className="px-3 py-4 text-sm text-brand-grey">Loading…</p>
          ) : null}
          {query.isError ? (
            <p className="px-3 py-4 text-sm text-danger">
              Could not load alerts
            </p>
          ) : null}
          {!query.isLoading && items.length === 0 ? (
            <p className="px-3 py-4 text-sm text-brand-grey">
              No active alerts right now.
            </p>
          ) : null}
          <ul className="max-h-80 overflow-auto">
            {items.map((item) => (
              <NotificationItem key={item.id} item={item} onOpen={openItem} />
            ))}
          </ul>
          <div className="border-t border-slate-100 px-3 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-brand hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
