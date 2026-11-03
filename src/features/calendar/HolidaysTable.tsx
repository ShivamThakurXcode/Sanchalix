'use client';

import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Modal from '@cloudscape-design/components/modal';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { type Column, DataTable } from '@/components/DataTable';
import { svg } from '@/components/icons';
import { usePathname, useRouter } from '@/i18n/navigation';
import { deleteHoliday } from '@/server/modules/calendar/actions';
import type { HolidayRow } from '@/server/modules/calendar/schemas';

const NEW = '/calendar/holidays/new';
const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeZone: 'UTC' });

type Feedback = { type: 'success' | 'warning' | 'error'; text: string };

export function HolidaysTable({
  holidays,
  canEdit,
  created,
  affected,
}: {
  holidays: HolidayRow[];
  canEdit: boolean;
  created: string | null;
  affected: number;
}) {
  const t = useTranslations('calendar.holidays');
  const router = useRouter();
  const pathname = usePathname();
  const [pendingDelete, setPendingDelete] = useState<HolidayRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState<Feedback | null>(null);

  const feedback: Feedback | null =
    deleted ??
    (created
      ? affected > 0
        ? { type: 'warning', text: t('createdWithAttendance', { name: created, count: affected }) }
        : { type: 'success', text: t('created', { name: created }) }
      : null);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    const result = await deleteHoliday(pendingDelete.id);
    setBusy(false);
    setPendingDelete(null);
    setDeleted(
      result.ok
        ? { type: 'success', text: t('deleted', { name: result.data.name }) }
        : { type: 'error', text: result.error.message },
    );
    router.replace(pathname);
    router.refresh();
  }

  const addButton = (primary: boolean) => (
    <Button
      {...(primary && { variant: 'primary' as const })}
      href={NEW}
      onFollow={(event) => {
        event.preventDefault();
        router.push(NEW);
      }}
    >
      {t('add')}
    </Button>
  );

  const columns: Column<HolidayRow>[] = [
    {
      id: 'date',
      header: t('columns.date'),
      isRowHeader: true,
      cell: (holiday) => dateFormat.format(new Date(`${holiday.date}T00:00:00Z`)),
      sortBy: (holiday) => holiday.date,
    },
    { id: 'name', header: t('columns.name'), cell: (holiday) => holiday.name, sortBy: (holiday) => holiday.name },
    ...(canEdit
      ? [
          {
            id: 'actions',
            header: t('columns.actions'),
            cell: (holiday: HolidayRow) => (
              <Button
                variant="icon"
                iconSvg={svg('delete')}
                ariaLabel={t('deleteLabel', { name: holiday.name })}
                onClick={() => setPendingDelete(holiday)}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        id="calendar-holidays"
        title={t('title')}
        actions={canEdit && addButton(true)}
        above={
          feedback && (
            <Alert
              type={feedback.type}
              dismissible
              dismissAriaLabel={t('dismiss')}
              onDismiss={() => {
                setDeleted(null);
                router.replace(pathname);
              }}
            >
              {feedback.text}
            </Alert>
          )
        }
        items={holidays}
        columns={columns}
        search={(holiday) => `${holiday.name} ${holiday.date}`}
        searchPlaceholder={t('searchPlaceholder')}
        empty={{ icon: 'holiday', heading: t('empty.heading'), body: t('empty.body'), action: canEdit && addButton(false) }}
      />
      <Modal
        visible={Boolean(pendingDelete)}
        header={t('deleteTitle', { name: pendingDelete?.name ?? '' })}
        closeAriaLabel={t('cancel')}
        onDismiss={() => setPendingDelete(null)}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setPendingDelete(null)}>{t('cancel')}</Button>
              <Button variant="primary" loading={busy} onClick={() => void confirmDelete()}>
                {t('deleteConfirm')}
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        {t('deleteBody')}
      </Modal>
    </>
  );
}
