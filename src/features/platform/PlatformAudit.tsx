'use client';

import { useTranslations } from 'next-intl';
import { type Column, DataTable } from '@/components/DataTable';
import type { AuditRow } from '@/server/modules/platform/service';

const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
const NONE = '—';

type Data = { rows: AuditRow[]; page: number; nextCursor: string | null; prevCursor: string | null };

export function PlatformAuditTable({ data }: { data: Data | null }) {
  const t = useTranslations('platform.audit');

  const columns: Column<AuditRow>[] = [
    { id: 'at', header: t('columns.when'), cell: (row) => dateTime.format(new Date(row.at)), isRowHeader: true },
    { id: 'actor', header: t('columns.who'), cell: (row) => row.actor || NONE },
    { id: 'action', header: t('columns.what'), cell: (row) => (t.has(`actions.${row.action}`) ? t(`actions.${row.action}`) : row.action) },
    { id: 'school', header: t('columns.school'), cell: (row) => row.school ?? NONE },
    { id: 'reason', header: t('columns.reason'), cell: (row) => row.reason ?? NONE },
  ];

  return (
    <DataTable
      id="platform-audit"
      title={t('title')}
      description={t('description')}
      items={data?.rows ?? null}
      columns={columns}
      server={{ page: data?.page ?? 1, nextCursor: data?.nextCursor ?? null, prevCursor: data?.prevCursor ?? null }}
      searchPlaceholder={t('searchPlaceholder')}
      empty={{ icon: 'auditLog', heading: t('empty.heading'), body: t('empty.body') }}
    />
  );
}
