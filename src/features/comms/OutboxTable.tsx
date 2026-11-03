'use client';

import Box from '@cloudscape-design/components/box';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import { useTranslations } from 'next-intl';
import { type Column, DataTable } from '@/components/DataTable';
import type { OutboxRow } from '@/server/messaging/send';

const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

export function OutboxTable({ messages }: { messages: OutboxRow[] }) {
  const t = useTranslations('outbox');

  const columns: Column<OutboxRow>[] = [
    { id: 'sentAt', header: t('sentAt'), cell: (message) => dateTime.format(new Date(message.sentAt)), width: 190, sortBy: (message) => message.sentAt },
    { id: 'channel', header: t('channel'), cell: (message) => t(`channels.${message.channel}`), width: 110 },
    { id: 'to', header: t('to'), cell: (message) => message.to, isRowHeader: true, width: 220 },
    { id: 'template', header: t('kind'), cell: (message) => t(`kinds.${message.template}`), width: 170 },
    { id: 'body', header: t('message'), cell: (message) => message.body ?? <Box color="text-status-inactive">{t('notKept')}</Box> },
    {
      id: 'status',
      header: t('status'),
      width: 150,
      cell: (message) => (
        <StatusIndicator type={message.status === 'sent' ? 'success' : message.status === 'failed' ? 'error' : 'stopped'}>
          {t(`statuses.${message.status}`)}
        </StatusIndicator>
      ),
    },
  ];

  return (
    <DataTable
      id="outbox"
      title={t('title')}
      description={t('description')}
      items={messages}
      columns={columns}
      search={(message) => `${message.to} ${message.body ?? ''}`}
      searchPlaceholder={t('searchPlaceholder')}
      empty={{ icon: 'sms', heading: t('empty.heading'), body: t('empty.body') }}
    />
  );
}
