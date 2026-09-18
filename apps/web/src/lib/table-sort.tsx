'use client';

import { useMemo, useState, type ReactNode } from 'react';

export type SortDir = 'asc' | 'desc';

type SortValue = string | number | boolean | null | undefined | Date;

function compareValues(av: SortValue, bv: SortValue, dir: SortDir) {
  const sign = dir === 'asc' ? 1 : -1;
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;

  if (av instanceof Date || bv instanceof Date) {
    const aTime = av instanceof Date ? av.getTime() : new Date(String(av)).getTime();
    const bTime = bv instanceof Date ? bv.getTime() : new Date(String(bv)).getTime();
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
      return (aTime - bTime) * sign;
    }
  }

  if (typeof av === 'boolean' && typeof bv === 'boolean') {
    return (Number(av) - Number(bv)) * sign;
  }

  if (typeof av === 'number' && typeof bv === 'number') {
    return (av - bv) * sign;
  }

  const aNum = typeof av === 'string' && av.trim() !== '' && !Number.isNaN(Number(av)) ? Number(av) : null;
  const bNum = typeof bv === 'string' && bv.trim() !== '' && !Number.isNaN(Number(bv)) ? Number(bv) : null;
  if (aNum != null && bNum != null) {
    return (aNum - bNum) * sign;
  }

  return (
    String(av).localeCompare(String(bv), undefined, {
      numeric: true,
      sensitivity: 'base',
    }) * sign
  );
}

export function useTableSort<T, K extends string>(
  rows: T[],
  accessors: Record<K, (row: T) => SortValue>,
  defaultKey: NoInfer<K>,
  defaultDir: SortDir = 'asc',
) {
  const [sortKey, setSortKey] = useState<K>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const sorted = useMemo(() => {
    const list = [...rows];
    const get = accessors[sortKey];
    list.sort((a, b) => compareValues(get(a), get(b), sortDir));
    return list;
  }, [rows, sortKey, sortDir, accessors]);

  function toggleSort(key: K) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  }

  function SortTh({
    column,
    children,
    className = 'px-4 py-3 font-medium',
    align = 'left',
  }: {
    column: K;
    children: ReactNode;
    className?: string;
    align?: 'left' | 'right';
  }) {
    const active = sortKey === column;
    return (
      <th className={`${className} ${align === 'right' ? 'text-right' : 'text-left'}`}>
        <button
          type="button"
          onClick={() => toggleSort(column)}
          className={`inline-flex items-center gap-1 text-inherit hover:text-navy ${
            align === 'right' ? 'flex-row-reverse text-right' : 'text-left'
          }`}
        >
          <span>{children}</span>
          <span className="tabular-nums text-slate-500 dark:text-slate-400" aria-hidden>
            {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
          </span>
        </button>
      </th>
    );
  }

  return { sorted, sortKey, sortDir, toggleSort, SortTh };
}
