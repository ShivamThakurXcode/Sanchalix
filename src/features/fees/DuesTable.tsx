'use client';

import Box from '@cloudscape-design/components/box';
import SegmentedControl from '@cloudscape-design/components/segmented-control';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { useTranslations } from 'next-intl';
import { AppLink } from '@/components/AppLink';
import { type Column, DataTable, useSetParams } from '@/components/DataTable';
import { ExportButton } from '@/components/ExportButton';
import { formatMoney } from '@/lib/money';
import type { Ageing, DueRow } from '@/server/modules/fees/schemas';
import { DuesReminders } from './DuesReminders';

const AGEING: Ageing[] = ['all', '1-15', '16-30', '31-60', '60+'];
const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' });

type Data = {
  rows: DueRow[];
  page: number;
  nextCursor: string | null;
  prevCursor: string | null;
  outstandingMinor: number;
  count: number;
};

export function DuesTable({
  ageing,
  canCollect,
  data,
}: {
  ageing: Ageing;
  canCollect: boolean;
  data: Data | null;
}) {
  const t = useTranslations('fees.dues');
  const tExport = useTranslations('export');
  const setParams = useSetParams();

  const studentCell = (due: DueRow) =>
    canCollect ? <AppLink href={`/fees/counter?student=${due.studentId}`}>{due.studentName}</AppLink> : due.studentName;

  const columns: Column<DueRow>[] = [
    { id: 'student', header: t('columns.student'), cell: studentCell, isRowHeader: true },
    { id: 'admissionNo', header: t('columns.admissionNo'), cell: (due) => due.admissionNo },
    { id: 'invoiceNo', header: t('columns.invoiceNo'), cell: (due) => due.invoiceNo },
    { id: 'installment', header: t('columns.installment'), cell: (due) => due.installment },
    { id: 'dueDate', header: t('columns.dueDate'), cell: (due) => dateFormat.format(new Date(`${due.dueDate}T00:00:00Z`)) },
    { id: 'overdue', header: t('columns.overdue'), cell: (due) => t('days', { count: due.daysOverdue }) },
    { id: 'balance', header: t('columns.balance'), cell: (due) => formatMoney(due.balanceMinor) },
  ];

  return (
    <DataTable
      id="fees-dues"
      title={t('title')}
      counter={data ? `(${data.count})` : ''}
      description={canCollect && t('hint')}
      actions={
        <SpaceBetween direction="horizontal" size="xs">
          {canCollect && <DuesReminders />}
          <ExportButton href="/api/v1/export/dues" label={tExport('label.dues')} />
        </SpaceBetween>
      }
      above={
        data && (
          <Box variant="awsui-key-label">
            {t('outstanding')}
            <Box variant="awsui-value-large">{formatMoney(data.outstandingMinor)}</Box>
          </Box>
        )
      }
      items={data?.rows ?? null}
      columns={columns}
      server={{ page: data?.page ?? 1, nextCursor: data?.nextCursor ?? null, prevCursor: data?.prevCursor ?? null }}
      searchPlaceholder={t('searchPlaceholder')}
      filters={
        <SegmentedControl
          label={t('ageing')}
          selectedId={ageing}
          options={AGEING.map((id) => ({ id, text: t(`bands.${id}`) }))}
          onChange={({ detail }) => setParams({ ageing: detail.selectedId === 'all' ? null : detail.selectedId, cursor: null })}
        />
      }
      filtered={ageing !== 'all'}
      clearParams={['ageing']}
      empty={{ icon: 'success', heading: t('empty.heading'), body: t('empty.body') }}
    />
  );
}
