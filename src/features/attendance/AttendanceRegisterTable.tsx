'use client';

import Box, { type BoxProps } from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import DatePicker from '@cloudscape-design/components/date-picker';
import FormField from '@cloudscape-design/components/form-field';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { useTranslations } from 'next-intl';
import { type Column, DataTable } from '@/components/DataTable';
import { ExportButton } from '@/components/ExportButton';
import { svg } from '@/components/icons';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { AttendanceRegister, MarkableStatus } from '@/server/modules/attendance/schemas';

type Student = AttendanceRegister['students'][number];

// A letter with a status colour, never colour alone; the legend above the table spells each letter out.
const MARKS: Record<MarkableStatus, { letter: string; color: BoxProps.Color }> = {
  present: { letter: 'P', color: 'text-status-success' },
  absent: { letter: 'A', color: 'text-status-error' },
  late: { letter: 'L', color: 'text-status-warning' },
  half_day: { letter: '½', color: 'text-status-warning' },
  leave: { letter: 'Lv', color: 'text-status-info' },
};
const NONE = '—';

export function AttendanceRegisterTable({
  sections,
  register,
}: {
  sections: { id: string; name: string }[];
  register: AttendanceRegister;
}) {
  const t = useTranslations('attendance.register');
  const tStatus = useTranslations('attendance.take.status');
  const router = useRouter();
  const pathname = usePathname();
  const open = (section: string, month: string, period: number | null = register.period) =>
    router.replace(`${pathname}?section=${section}&month=${month}${period ? `&period=${period}` : ''}`);
  const periodOptions = [
    { value: '', label: t('wholeDay') },
    ...register.periods.map((number) => ({ value: String(number), label: t('periodNo', { number }) })),
  ];
  const percent = (student: Student) => (student.percent === null ? NONE : `${student.percent}%`);
  const takeHref = `/attendance/take?section=${register.section.id}`;
  const query = `section=${register.section.id}&month=${register.month}${register.period ? `&period=${register.period}` : ''}`;

  const columns: Column<Student>[] = [
    { id: 'rollNo', header: t('columns.rollNo'), cell: (student) => student.rollNo, width: 90, card: false, sortBy: (student) => student.rollNo },
    { id: 'name', header: t('columns.name'), cell: (student) => student.name, isRowHeader: true, width: 180, sortBy: (student) => student.name },
    ...register.days.map(({ date, day, kind }) => ({
      id: date,
      header: String(day),
      width: 48,
      card: false,
      cell: (student: Student) => {
        const mark = student.marks[date];
        if (mark) {
          return (
            <Box color={MARKS[mark].color} fontWeight="bold">
              <span title={tStatus(mark)}>{MARKS[mark].letter}</span>
            </Box>
          );
        }
        return kind === 'holiday' ? <span title={t('holiday')}>H</span> : kind === 'nonWorking' ? NONE : '';
      },
    })),
    { id: 'present', header: t('columns.present'), cell: (student) => student.present, width: 100, sortBy: (student) => student.present },
    { id: 'absent', header: t('columns.absent'), cell: (student) => student.absent, width: 100, sortBy: (student) => student.absent },
    { id: 'percent', header: t('columns.percent'), cell: percent, width: 110, sortBy: (student) => student.percent ?? -1 },
  ];

  return (
    <DataTable
      id="attendance-register"
      title={t('title')}
      defaultPageSize={100}
      actions={
        <SpaceBetween direction="horizontal" size="xs">
          <ExportButton href={`/api/v1/attendance/register?${query}`} label={t('exportLabel')} />
          <Button
            iconSvg={svg('attendance')}
            href={takeHref}
            onFollow={(event) => {
              event.preventDefault();
              router.push(takeHref);
            }}
          >
            {t('take')}
          </Button>
        </SpaceBetween>
      }
      above={
        <>
          <SpaceBetween direction="horizontal" size="l">
            <FormField label={t('section')}>
              <Select
                selectedOption={{ value: register.section.id, label: register.section.name }}
                options={sections.map(({ id, name }) => ({ value: id, label: name }))}
                onChange={({ detail }) => open(detail.selectedOption.value ?? register.section.id, register.month, null)}
              />
            </FormField>
            {register.periods.length > 0 && (
              <FormField label={t('period')}>
                <Select
                  selectedOption={periodOptions.find((option) => option.value === String(register.period ?? '')) ?? null}
                  options={periodOptions}
                  onChange={({ detail }) => open(register.section.id, register.month, Number(detail.selectedOption.value) || null)}
                />
              </FormField>
            )}
            <FormField label={t('month')} constraintText={t('monthConstraint')}>
              <DatePicker
                granularity="month"
                value={register.month}
                placeholder="YYYY/MM"
                isDateEnabled={(date) => date <= new Date()}
                onChange={({ detail }) => {
                  if (/^\d{4}-\d{2}$/.test(detail.value)) open(register.section.id, detail.value);
                }}
              />
            </FormField>
          </SpaceBetween>
          <Box color="text-body-secondary">{t('legend')}</Box>
        </>
      }
      items={register.students}
      columns={columns}
      cardTitle={(student) => `${student.rollNo}. ${student.name}`}
      search={(student) => `${student.rollNo} ${student.name}`}
      searchPlaceholder={t('searchPlaceholder')}
      empty={{ icon: 'attendance', heading: t('empty.heading', { section: register.section.name }), body: t('empty.body') }}
      tableProps={{ stickyColumns: { first: 2 } }}
    />
  );
}
