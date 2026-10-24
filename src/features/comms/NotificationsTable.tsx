'use client';

import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import CollectionPreferences from '@cloudscape-design/components/collection-preferences';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import Pagination from '@cloudscape-design/components/pagination';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AppLink } from '@/components/AppLink';
import { EmptyState } from '@/components/EmptyState';
import { useRouter } from '@/i18n/navigation';
import { markNotificationsRead } from '@/server/modules/comms/actions';
import type { NotificationRow } from '@/server/modules/comms/schemas';

const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
const PAGE_SIZES = [10, 25, 50, 100];

export function NotificationsTable({ notifications }: { notifications: NotificationRow[] }) {
  const t = useTranslations('comms.notifications');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const unread = notifications.filter((notification) => !notification.read).length;

  const filteredNotifications = notifications.filter(
    (notification) =>
      notification.title.toLowerCase().includes(searchText.toLowerCase()) ||
      (notification.body && notification.body.toLowerCase().includes(searchText.toLowerCase()))
  );

  const paginatedNotifications = filteredNotifications.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredNotifications.length / pageSize);

  async function mark(ids: 'all' | string[]) {
    setBusy(true);
    await markNotificationsRead(ids);
    setBusy(false);
    router.refresh();
  }

  return (
    <Table
      variant="container"
      stickyHeader
      enableKeyboardNavigation
      wrapLines
      trackBy="id"
      items={paginatedNotifications}
      header={
        <Header
          variant="h1"
          counter={`(${filteredNotifications.length})`}
          actions={
            <Button loading={busy} disabled={unread === 0} onClick={() => void mark('all')}>
              {t('markAll')}
            </Button>
          }
        >
          {t('title')}
        </Header>
      }
      filter={
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchText}
          onChange={({ detail }) => {
            setSearchText(detail.value);
            setCurrentPage(1);
          }}
        />
      }
      pagination={
        <Pagination
          currentPageIndex={currentPage}
          pagesCount={totalPages}
          onChange={({ detail }) => setCurrentPage(detail.currentPageIndex)}
        />
      }
      preferences={
        <CollectionPreferences
          preferences={{ pageSize }}
          pageSizePreference={{
            options: PAGE_SIZES.map((value) => ({ value, label: t('pageSize', { count: value }) })),
          }}
          onConfirm={({ detail }) => {
            setPageSize(detail.pageSize ?? pageSize);
            setCurrentPage(1);
          }}
        />
      }
      empty={
        searchText ? (
          <EmptyState icon="search" heading={t('noMatches.heading')} body={t('noMatches.body')} />
        ) : (
          <EmptyState icon="notifications" heading={t('empty.heading')} body={t('empty.body')} />
        )
      }
      columnDefinitions={[
        {
          id: 'status',
          header: t('columns.status'),
          width: 130,
          cell: (row) =>
            row.read ? (
              <StatusIndicator type="stopped">{t('read')}</StatusIndicator>
            ) : (
              <StatusIndicator type="info">{t('unread')}</StatusIndicator>
            ),
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
        { id: 'received', header: t('columns.received'), width: 220, cell: (row) => dateTime.format(new Date(row.createdAt)) },
      ]}
    />
  );
}
