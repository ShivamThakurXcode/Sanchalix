'use client';

import Select from '@cloudscape-design/components/select';
import StatusIndicator, { type StatusIndicatorProps } from '@cloudscape-design/components/status-indicator';
import { useTranslations } from 'next-intl';
import { type Column, DataTable, useSetParams } from '@/components/DataTable';
import { formatMoney } from '@/lib/money';
import type { InvoiceRow, InvoiceStatus } from '@/server/modules/fees/schemas';

const STATUS_TYPE: Record<InvoiceStatus, StatusIndicatorProps.Type> = {
  draft: 'pending',
  issued: 'info',
  partially_paid: 'warning',
  paid: 'success',
  overdue: 'error',
  void: 'stopped',
};
const STATUSES = Object.keys(STATUS_TYPE) as InvoiceStatus[];
const ALL = 'all';
const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' });

type Data = { rows: InvoiceRow[]; page: number; nextCursor: string | null; prevCursor: string | null };

export function InvoicesTable({ status, data }: { status: InvoiceStatus | null; data: Data | null }) {
  const t = useTranslations('fees.invoices');
  const setParams = useSetParams();
  const statusOptions = [{ value: ALL, label: t('filter.all') }, ...STATUSES.map((value) => ({ value, label: t(`status.${value}`) }))];

  const columns: Column<InvoiceRow>[] = [
    { id: 'invoiceNo', header: t('columns.invoiceNo'), cell: (invoice) => invoice.invoiceNo, isRowHeader: true },
    { id: 'student', header: t('columns.student'), cell: (invoice) => invoice.studentName },
    { id: 'admissionNo', header: t('columns.admissionNo'), cell: (invoice) => invoice.admissionNo },
    { id: 'installment', header: t('columns.installment'), cell: (invoice) => invoice.installment },
    { id: 'dueDate', header: t('columns.dueDate'), cell: (invoice) => dateFormat.format(new Date(`${invoice.dueDate}T00:00:00Z`)) },
    { id: 'total', header: t('columns.total'), cell: (invoice) => formatMoney(invoice.totalMinor) },
    { id: 'balance', header: t('columns.balance'), cell: (invoice) => formatMoney(invoice.balanceMinor) },
    {
      id: 'status',
      header: t('columns.status'),
      cell: (invoice) => <StatusIndicator type={STATUS_TYPE[invoice.status]}>{t(`status.${invoice.status}`)}</StatusIndicator>,
    },
  ];

  return (
    <DataTable
      id="fees-invoices"
      title={t('title')}
      items={data?.rows ?? null}
      columns={columns}
      server={{ page: data?.page ?? 1, nextCursor: data?.nextCursor ?? null, prevCursor: data?.prevCursor ?? null }}
      searchPlaceholder={t('searchPlaceholder')}
      filters={
        <Select
          ariaLabel={t('filter.status')}
          selectedOption={statusOptions.find((option) => option.value === (status ?? ALL)) ?? null}
          options={statusOptions}
          onChange={({ detail }) => {
            const value = detail.selectedOption.value;
            setParams({ status: !value || value === ALL ? null : value, cursor: null });
          }}
        />
      }
      filtered={Boolean(status)}
      clearParams={['status']}
      empty={{ icon: 'invoice', heading: t('empty.heading'), body: t('empty.body') }}
    />
  );
}
