'use client';

import Alert from '@cloudscape-design/components/alert';
import Button from '@cloudscape-design/components/button';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { useTranslations } from 'next-intl';
import { type Column, DataTable } from '@/components/DataTable';
import { usePathname, useRouter } from '@/i18n/navigation';
import { assignClassTeacher } from '@/server/modules/academics/actions';
import type { SectionRow } from '@/server/modules/academics/schemas';

const NONE = '—';

export function SectionsTable({
  sections,
  teachers,
  canCreate,
  created,
}: {
  sections: SectionRow[];
  teachers: { id: string; name: string }[];
  canCreate: boolean;
  created: string | null;
}) {
  const t = useTranslations('academics.classes');
  const router = useRouter();
  const pathname = usePathname();

  const link = (href: string, label: string, primary = false) => (
    <Button
      {...(primary && { variant: 'primary' as const })}
      href={href}
      onFollow={(event) => {
        event.preventDefault();
        router.push(href);
      }}
    >
      {label}
    </Button>
  );

  const teacherOptions = [{ value: '', label: t('noClassTeacher') }, ...teachers.map(({ id, name }) => ({ value: id, label: name }))];
  const columns: Column<SectionRow>[] = [
    { id: 'section', header: t('columns.section'), cell: (section) => section.name, isRowHeader: true, sortBy: (section) => section.name },
    { id: 'class', header: t('columns.class'), cell: (section) => section.className, sortBy: (section) => section.className },
    {
      id: 'students',
      header: t('columns.students'),
      cell: ({ strength, capacity }) => t('strength', { strength, capacity }),
      sortBy: (section) => section.strength,
    },
    { id: 'room', header: t('columns.room'), cell: (section) => section.room ?? NONE },
    {
      id: 'classTeacher',
      header: t('columns.classTeacher'),
      cell: (section) => section.classTeacher?.name ?? t('noClassTeacher'),
      sortBy: (section) => section.classTeacher?.name ?? '',
      ...(canCreate && {
        minWidth: 220,
        editConfig: {
          ariaLabel: t('columns.classTeacher'),
          editIconAriaLabel: t('editClassTeacher'),
          errorIconAriaLabel: t('classTeacherError'),
          editingCell: (section: SectionRow, { currentValue, setValue }: { currentValue?: string; setValue: (value: string) => void }) => {
            const selected = currentValue ?? section.classTeacher?.id ?? '';
            return (
              <Select
                autoFocus
                expandToViewport
                ariaLabel={t('classTeacherFor', { section: section.name })}
                selectedOption={teacherOptions.find((option) => option.value === selected) ?? null}
                options={teacherOptions}
                onChange={({ detail }) => setValue(detail.selectedOption.value ?? '')}
              />
            );
          },
        },
      }),
    },
  ];

  return (
    <DataTable
      id="academics-sections"
      title={t('title')}
      actions={
        canCreate && (
          <SpaceBetween direction="horizontal" size="xs">
            {link('/academics/classes/new', t('addClass'))}
            {link('/academics/sections/new', t('addSection'), true)}
          </SpaceBetween>
        )
      }
      above={
        created && (
          <Alert type="success" dismissible dismissAriaLabel={t('dismiss')} onDismiss={() => router.replace(pathname)}>
            {t('created', { name: created })}
          </Alert>
        )
      }
      items={sections}
      columns={columns}
      search={(section) => `${section.name} ${section.className} ${section.classTeacher?.name ?? ''}`}
      searchPlaceholder={t('searchPlaceholder')}
      empty={{
        icon: 'classes',
        heading: t('empty.heading'),
        body: t('empty.body'),
        action: canCreate && link('/academics/classes/new', t('addClass')),
      }}
      tableProps={{
        submitEdit: async (section, _column, value) => {
          const result = await assignClassTeacher({ sectionId: section.id, staffId: (value as string) || null });
          // Cloudscape keeps the cell open and shows its error state when submitEdit rejects.
          if (!result.ok) throw new Error(result.error.message);
          router.refresh();
        },
      }}
    />
  );
}
