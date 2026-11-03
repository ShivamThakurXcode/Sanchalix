'use client';

import Button from '@cloudscape-design/components/button';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import { useTranslations } from 'next-intl';
import { AppLink } from '@/components/AppLink';
import { type Column, DataTable, useSetParams } from '@/components/DataTable';
import { ExportButton } from '@/components/ExportButton';
import { svg } from '@/components/icons';
import { useRouter } from '@/i18n/navigation';
import { formatPhone } from '@/lib/phone';
import type { StudentRow, StudentStatus } from '@/server/modules/sis/schemas';
import { STATUS_TYPE } from './studentStatus';

const STATUSES = Object.keys(STATUS_TYPE) as StudentStatus[];
const COUNT_CAP = 10_000;
const NONE = '—';

type Data = {
  rows: StudentRow[];
  total: number;
  page: number;
  nextCursor: string | null;
  prevCursor: string | null;
};

export function StudentsTable({
  status,
  canCreate,
  data,
}: {
  canCreate: boolean;
  status: StudentStatus;
  data: Data | null;
}) {
  const t = useTranslations('sis.students');
  const tExport = useTranslations('export');
  const router = useRouter();
  const setParams = useSetParams();
  const numbers = new Intl.NumberFormat('en-IN');
  const link = (href: string) => ({
    href,
    onFollow: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      router.push(href);
    },
  });

  const columns: Column<StudentRow>[] = [
    { id: 'name', header: t('columns.name'), cell: (s) => <AppLink href={`/students/${s.id}`}>{s.name}</AppLink>, isRowHeader: true },
    { id: 'admissionNo', header: t('columns.admissionNo'), cell: (s) => s.admissionNo },
    { id: 'classSection', header: t('columns.classSection'), cell: (s) => s.classSection ?? NONE },
    { id: 'rollNo', header: t('columns.rollNo'), cell: (s) => s.rollNo ?? NONE },
    { id: 'guardian', header: t('columns.guardian'), cell: (s) => s.guardianName ?? NONE },
    { id: 'phone', header: t('columns.phone'), cell: (s) => (s.guardianPhone ? formatPhone(s.guardianPhone) : NONE) },
    {
      id: 'status',
      header: t('columns.status'),
      cell: (s) => <StatusIndicator type={STATUS_TYPE[s.status]}>{t(`status.${s.status}`)}</StatusIndicator>,
    },
  ];

  return (
    <DataTable
      id="students"
      title={t('title')}
      counter={data ? `(${data.total > COUNT_CAP ? `${numbers.format(COUNT_CAP)}+` : numbers.format(data.total)})` : ''}
      actions={
        canCreate && (
          <SpaceBetween direction="horizontal" size="xs">
            <ExportButton href="/api/v1/export/students" label={tExport('label.students')} />
            <Button iconSvg={svg('import')} {...link('/students/import')}>
              {t('import')}
            </Button>
            <Button variant="primary" {...link('/students/new')}>
              {t('add')}
            </Button>
          </SpaceBetween>
        )
      }
      items={data?.rows ?? null}
      columns={columns}
      server={{ page: data?.page ?? 1, nextCursor: data?.nextCursor ?? null, prevCursor: data?.prevCursor ?? null }}
      searchPlaceholder={t('searchPlaceholder')}
      filters={
        <Select
          ariaLabel={t('filter.status')}
          selectedOption={{ value: status, label: t(`status.${status}`) }}
          options={STATUSES.map((value) => ({ value, label: t(`status.${value}`) }))}
          onChange={({ detail }) => setParams({ status: detail.selectedOption.value ?? null, cursor: null })}
        />
      }
      filtered={status !== 'active'}
      clearParams={['status']}
      empty={{ icon: 'students', heading: t('empty.heading'), body: t('empty.body') }}
    />
  );
}
