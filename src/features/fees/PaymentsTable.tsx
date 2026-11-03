'use client';

import { useTranslations } from 'next-intl';
import { AppLink } from '@/components/AppLink';
import { type Column, DataTable } from '@/components/DataTable';
import { ExportButton } from '@/components/ExportButton';
import { formatMoney } from '@/lib/money';
import type { CounterMethod, PaymentRow } from '@/server/modules/fees/schemas';

const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

type Data = { rows: PaymentRow[]; page: number; nextCursor: string | null; prevCursor: string | null };

export function PaymentsTable({ data }: { data: Data | null }) {
  const t = useTranslations('fees.payments');
  const tExport = useTranslations('export');
  const tMethod = useTranslations('fees.counter.methods');

  const columns: Column<PaymentRow>[] = [
    {
      id: 'receiptNo',
      header: t('columns.receiptNo'),
      cell: (payment) => <AppLink href={`/fees/payments/${payment.id}`}>{payment.receiptNo}</AppLink>,
      isRowHeader: true,
    },
    { id: 'date', header: t('columns.date'), cell: (payment) => dateTime.format(new Date(payment.collectedAt)) },
    { id: 'student', header: t('columns.student'), cell: (payment) => payment.studentName },
    { id: 'admissionNo', header: t('columns.admissionNo'), cell: (payment) => payment.admissionNo },
    {
      id: 'method',
      header: t('columns.method'),
      cell: (payment) => (tMethod.has(payment.method) ? tMethod(payment.method as CounterMethod) : payment.method),
    },
    { id: 'amount', header: t('columns.amount'), cell: (payment) => formatMoney(payment.amountMinor) },
  ];

  return (
    <DataTable
      id="fees-payments"
      title={t('title')}
      actions={<ExportButton href="/api/v1/export/payments" label={tExport('label.payments')} />}
      items={data?.rows ?? null}
      columns={columns}
      server={{ page: data?.page ?? 1, nextCursor: data?.nextCursor ?? null, prevCursor: data?.prevCursor ?? null }}
      searchPlaceholder={t('searchPlaceholder')}
      empty={{ icon: 'receipt', heading: t('empty.heading'), body: t('empty.body') }}
    />
  );
}
