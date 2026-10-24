'use client';

import Box from '@cloudscape-design/components/box';
import CollectionPreferences from '@cloudscape-design/components/collection-preferences';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import Pagination from '@cloudscape-design/components/pagination';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { EmptyState } from '@/components/EmptyState';
import type { OutboxRow } from '@/server/messaging/send';

const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
const PAGE_SIZES = [10, 25, 50, 100];

export function OutboxTable({ messages }: { messages: OutboxRow[] }) {
  const t = useTranslations('outbox');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredMessages = messages.filter(
    (message) =>
      message.to.toLowerCase().includes(searchText.toLowerCase()) ||
      (message.body && message.body.toLowerCase().includes(searchText.toLowerCase()))
  );

  const paginatedMessages = filteredMessages.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredMessages.length / pageSize);

  return (
    <Table
      variant="container"
      stickyHeader
      wrapLines
      trackBy="id"
      items={paginatedMessages}
      header={
        <Header variant="h2" counter={`(${filteredMessages.length})`} description={t('description')}>
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
          <EmptyState icon="sms" heading={t('empty.heading')} body={t('empty.body')} />
        )
      }
      columnDefinitions={[
        { id: 'sentAt', header: t('sentAt'), cell: (message) => dateTime.format(new Date(message.sentAt)), width: 190 },
        { id: 'channel', header: t('channel'), cell: (message) => t(`channels.${message.channel}`), width: 110 },
        { id: 'to', header: t('to'), cell: (message) => message.to, isRowHeader: true, width: 220 },
        { id: 'template', header: t('kind'), cell: (message) => t(`kinds.${message.template}`), width: 170 },
        {
          id: 'body',
          header: t('message'),
          cell: (message) => message.body ?? <Box color="text-status-inactive">{t('notKept')}</Box>,
        },
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
      ]}
    />
  );
}
