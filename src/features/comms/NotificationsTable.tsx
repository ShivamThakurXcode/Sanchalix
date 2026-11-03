'use client';

import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AppLink } from '@/components/AppLink';
import { type Column, DataTable } from '@/components/DataTable';
import { useRouter } from '@/i18n/navigation';
import { markNotificationsRead } from '@/server/modules/comms/actions';
import type { NotificationRow } from '@/server/modules/comms/schemas';

const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

export function NotificationsTable({ notifications }: { notifications: NotificationRow[] }) {
  const t = useTranslations('comms.notifications');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const unread = notifications.filter((notification) => !notification.read).length;

  async function mark(ids: 'all' | string[]) {
    setBusy(true);
    await markNotificationsRead(ids);
    setBusy(false);
    router.refresh();
  }

  const columns: Column<NotificationRow>[] = [
    {
      id: 'status',
      header: t('columns.status'),
      cell: (row) =>
        row.read ? (
          <StatusIndicator type="stopped">{t('read')}</StatusIndicator>
        ) : (
          <StatusIndicator type="info">{t('unread')}</StatusIndicator>
        ),
      sortBy: (row) => Number(row.read),
    },
    {
      id: 'notification',
      header: t('columns.notification'),
      isRowHeader: true,
      cell: (row) => (
        <SpaceBetween size="xxxs">
          <Box fontWeight={row.read ? 'normal' : 'bold'}>
            {row.link ? (
              <AppLink
                href={row.link}
                onFollow={() => {
                  if (!row.read) void markNotificationsRead([row.id]);
                }}
              >
                {row.title}
              </AppLink>
            ) : (
              row.title
            )}
          </Box>
          {row.body && <Box color="text-body-secondary">{row.body}</Box>}
        </SpaceBetween>
      ),
    },
    { id: 'received', header: t('columns.received'), cell: (row) => dateTime.format(new Date(row.createdAt)), sortBy: (row) => row.createdAt },
  ];

  return (
    <DataTable
      id="comms-notifications"
      title={t('title')}
      actions={
        <Button loading={busy} disabled={unread === 0} onClick={() => void mark('all')}>
          {t('markAll')}
        </Button>
      }
      items={notifications}
      columns={columns}
      search={(row) => `${row.title} ${row.body ?? ''}`}
      searchPlaceholder={t('searchPlaceholder')}
      empty={{ icon: 'notifications', heading: t('empty.heading'), body: t('empty.body') }}
    />
  );
}
