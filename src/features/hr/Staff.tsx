'use client';

import Alert from '@cloudscape-design/components/alert';
import AttributeEditor from '@cloudscape-design/components/attribute-editor';
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import DatePicker from '@cloudscape-design/components/date-picker';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input, { type InputProps } from '@cloudscape-design/components/input';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator, { type StatusIndicatorProps } from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { AppLink } from '@/components/AppLink';
import { useCrumb } from '@/components/Crumb';
import { type Column, DataTable } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import { svg } from '@/components/icons';
import { usePathname, useRouter } from '@/i18n/navigation';
import { formatPhone } from '@/lib/phone';
import { StudentDocuments } from '@/features/sis/StudentDocuments';
import { createStaff, updateStaff } from '@/server/modules/hr/actions';
import type { HistoryEntry } from '@/server/modules/audit/history';
import type { StaffMember, StaffProfile, StaffRow } from '@/server/modules/hr/schemas';

const LIST = '/staff';
const NEW = '/staff/new';
const IMPORT = '/staff/import';
const PAGE_SIZES = [10, 25, 50, 100];
const TYPES = ['teaching', 'non_teaching'];
const STATUSES = ['active', 'on_leave', 'resigned', 'terminated'];
const STATUS_TYPE: Record<StaffRow['status'], StatusIndicatorProps.Type> = {
  active: 'success',
  on_leave: 'info',
  resigned: 'stopped',
  terminated: 'stopped',
};

type Data = { rows: StaffRow[]; page: number; nextCursor: string | null; prevCursor: string | null };

export function StaffTable({
  canCreate,
  created,
  updated,
  data,
}: {
  canCreate: boolean;
  created: string | null;
  updated: string | null;
  data: Data | null;
}) {
  const t = useTranslations('hr');
  const router = useRouter();
  const pathname = usePathname();
  const link = (href: string) => ({
    href,
    onFollow: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      router.push(href);
    },
  });

  const columns: Column<StaffRow>[] = [
    { id: 'name', header: t('columns.name'), cell: (member) => <AppLink href={`${LIST}/${member.id}`}>{member.name}</AppLink>, isRowHeader: true },
    { id: 'employeeNo', header: t('columns.employeeNo'), cell: (member) => member.employeeNo },
    { id: 'designation', header: t('columns.designation'), cell: (member) => member.designation },
    { id: 'type', header: t('columns.type'), cell: (member) => t(`type.${member.type}`) },
    { id: 'phone', header: t('columns.phone'), cell: (member) => formatPhone(member.phone) },
    {
      id: 'status',
      header: t('columns.status'),
      cell: (member) => <StatusIndicator type={STATUS_TYPE[member.status]}>{t(`status.${member.status}`)}</StatusIndicator>,
    },
  ];

  return (
    <DataTable
      id="staff"
      title={t('title')}
      actions={
        canCreate && (
          <SpaceBetween direction="horizontal" size="xs">
            <Button iconSvg={svg('import')} {...link(IMPORT)}>
              {t('import.action')}
            </Button>
            <Button variant="primary" {...link(NEW)}>
              {t('add')}
            </Button>
          </SpaceBetween>
        )
      }
      above={
        (created ?? updated) && (
          <Alert type="success" dismissible dismissAriaLabel={t('dismiss')} onDismiss={() => router.replace(pathname)}>
            {created ? t('created', { name: created }) : t('updated', { name: updated ?? '' })}
          </Alert>
        )
      }
      items={data?.rows ?? null}
      columns={columns}
      server={{ page: data?.page ?? 1, nextCursor: data?.nextCursor ?? null, prevCursor: data?.prevCursor ?? null }}
      searchPlaceholder={t('searchPlaceholder')}
      empty={{
        icon: 'staff',
        heading: t('empty.heading'),
        body: t('empty.body'),
        action: canCreate && <Button {...link(NEW)}>{t('add')}</Button>,
      }}
    />
  );
}

const EMPTY = {
  name: '',
  designation: '',
  department: '',
  type: '',
  phone: '',
  email: '',
  joinedOn: '',
  status: 'active',
};
type Field = keyof typeof EMPTY;

export function StaffForm({ member }: { member?: StaffMember }) {
  const t = useTranslations('hr');
  useCrumb(member?.name);
  const router = useRouter();
  const [values, setValues] = useState(member ?? EMPTY);
  const [qualifications, setQualifications] = useState(member?.qualifications ?? []);
  const [error, setError] = useState<{ message: string; fieldErrors?: Record<string, string> } | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = error?.fieldErrors ?? {};
  const change = (field: Field, value: string) => setValues((current) => ({ ...current, [field]: value }));
  const typeOptions = TYPES.map((value) => ({ value, label: t(`type.${value}`) }));

  useEffect(() => {
    if (error) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [error]);

  async function submit() {
    setBusy(true);
    setError(null);
    const payload = { ...values, qualifications };
    const result = member ? await updateStaff(payload) : await createStaff(payload);
    if (result.ok) {
      return router.push(`${LIST}?${member ? 'updated' : 'created'}=${encodeURIComponent(result.data.name)}`);
    }
    setError(result.error);
    setBusy(false);
  }

  const optional = (label: string): ReactNode => (
    <>
      {label} - <i>{t('optional')}</i>
    </>
  );
  const text = (field: Field, label: ReactNode, props: Partial<InputProps> = {}, hint?: string) => (
    <FormField label={label} errorText={errors[field]} constraintText={hint}>
      <Input {...props} value={values[field]} onChange={({ detail }) => change(field, detail.value)} />
    </FormField>
  );

  return (
    <ContentLayout
      header={<Header variant="h1">{member ? t('form.editTitle', { name: member.name }) : t('form.title')}</Header>}
    >
      <form
        ref={formRef}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Form
          errorText={error?.message}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button formAction="none" onClick={() => router.push(LIST)}>
                {t('cancel')}
              </Button>
              <Button variant="primary" loading={busy}>
                {member ? t('form.save') : t('add')}
              </Button>
            </SpaceBetween>
          }
        >
          <Container>
            <ColumnLayout columns={2}>
              {text('name', t('form.name'), { autoComplete: false })}
              {text('designation', t('form.designation'), { autoComplete: false }, t('form.designationHint'))}
              <FormField label={t('form.type')} errorText={errors.type}>
                <Select
                  selectedOption={typeOptions.find((option) => option.value === values.type) ?? null}
                  options={typeOptions}
                  onChange={({ detail }) => change('type', detail.selectedOption.value ?? '')}
                />
              </FormField>
              {text('department', optional(t('form.department')), { autoComplete: false })}
              {text('phone', t('form.phone'), { inputMode: 'tel', autoComplete: false }, t('form.phoneHint'))}
              {text('email', optional(t('form.email')), { type: 'email', inputMode: 'email', autoComplete: false })}
              <FormField label={t('form.joinedOn')} errorText={errors.joinedOn} constraintText={t('form.dateHint')}>
                <DatePicker
                  value={values.joinedOn}
                  placeholder="YYYY/MM/DD"
                  onChange={({ detail }) => change('joinedOn', detail.value)}
                />
              </FormField>
              {member && (
                <FormField label={t('columns.status')} errorText={errors.status}>
                  <Select
                    selectedOption={{ value: values.status, label: t(`status.${values.status}`) }}
                    options={STATUSES.map((value) => ({ value, label: t(`status.${value}`) }))}
                    onChange={({ detail }) => change('status', detail.selectedOption.value ?? 'active')}
                  />
                </FormField>
              )}
            </ColumnLayout>
          </Container>
          <Container header={<Header variant="h2" description={t('form.qualificationsHint')}>{t('form.qualifications')}</Header>}>
            <AttributeEditor
              items={qualifications}
              addButtonText={t('form.addQualification')}
              removeButtonText={t('form.removeQualification')}
              empty={t('form.noQualifications')}
              disableAddButton={qualifications.length >= 8}
              onAddButtonClick={() => setQualifications([...qualifications, { degree: '', institution: '', year: '' }])}
              onRemoveButtonClick={({ detail }) =>
                setQualifications(qualifications.filter((_, index) => index !== detail.itemIndex))
              }
              definition={(['degree', 'institution', 'year'] as const).map((key) => ({
                label: t(`form.qualification.${key}`),
                errorText: (_: unknown, index: number) => errors[`qualifications.${index}.${key}`],
                control: (item: (typeof qualifications)[number], index: number) => (
                  <Input
                    value={item[key]}
                    inputMode={key === 'year' ? 'numeric' : 'text'}
                    autoComplete={false}
                    onChange={({ detail }) =>
                      setQualifications(qualifications.map((entry, at) => (at === index ? { ...entry, [key]: detail.value } : entry)))
                    }
                  />
                ),
              }))}
            />
          </Container>
        </Form>
      </form>
    </ContentLayout>
  );
}

const NONE = '—';
const day = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' });
const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

export function StaffProfileView({
  member,
  history,
  canEdit,
}: {
  member: StaffProfile;
  history: HistoryEntry[] | null;
  canEdit: boolean;
}) {
  const t = useTranslations('hr');
  const tLeave = useTranslations('hr.leave');
  const router = useRouter();
  useCrumb(member.name);
  const editHref = `${LIST}/${member.id}/edit`;

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description={`${member.designation} · ${member.employeeNo}`}
          actions={
            canEdit && (
              <Button
                iconSvg={svg('edit')}
                href={editHref}
                onFollow={(event) => {
                  event.preventDefault();
                  router.push(editHref);
                }}
              >
                {t('profile.edit')}
              </Button>
            )
          }
        >
          {member.name}
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">{t('profile.details')}</Header>}>
          <KeyValuePairs
            columns={3}
            items={[
              {
                label: t('columns.status'),
                value: <StatusIndicator type={STATUS_TYPE[member.status]}>{t(`status.${member.status}`)}</StatusIndicator>,
              },
              { label: t('columns.type'), value: t(`type.${member.type}`) },
              { label: t('form.department'), value: member.department ?? NONE },
              { label: t('columns.phone'), value: formatPhone(member.phone) },
              { label: t('form.email'), value: member.email ?? NONE },
              { label: t('form.joinedOn'), value: day.format(new Date(`${member.joinedOn}T00:00:00Z`)) },
              {
                label: t('profile.account'),
                value: (
                  <StatusIndicator type={member.hasAccount ? 'success' : 'stopped'}>
                    {t(member.hasAccount ? 'profile.hasAccount' : 'profile.noAccount')}
                  </StatusIndicator>
                ),
              },
              { label: t('profile.classTeacherOf'), value: member.classTeacherOf.join(', ') || NONE },
            ]}
          />
        </Container>
        <Table
          variant="container"
          trackBy="subject"
          items={member.teaches}
          header={
            <Header variant="h2" counter={`(${member.teaches.length})`} description={t('profile.teachingHint')}>
              {t('profile.teaching')}
            </Header>
          }
          empty={
            <EmptyState icon="timetable" heading={t('profile.noTeaching.heading')} body={t('profile.noTeaching.body')} />
          }
          columnDefinitions={[
            { id: 'subject', header: t('profile.subject'), cell: (row) => row.subject, isRowHeader: true },
            { id: 'sections', header: t('profile.sections'), cell: (row) => row.sections },
            { id: 'periods', header: t('profile.periods'), cell: (row) => row.periods },
          ]}
        />
        <StudentDocuments owner="staff" studentId={member.id} documents={member.documents} canEdit={canEdit} />
        {member.qualifications.length > 0 && (
          <Table
            variant="container"
            trackBy="degree"
            items={member.qualifications}
            header={<Header variant="h2">{t('profile.qualifications')}</Header>}
            columnDefinitions={[
              { id: 'degree', header: t('form.qualification.degree'), isRowHeader: true, cell: (item) => item.degree },
              { id: 'institution', header: t('form.qualification.institution'), cell: (item) => item.institution || NONE },
              { id: 'year', header: t('form.qualification.year'), cell: (item) => item.year ?? NONE },
            ]}
          />
        )}
        {history && (
          <Table
            variant="container"
            trackBy="id"
            items={history}
            header={<Header variant="h2" counter={`(${history.length})`}>{t('profile.history.title')}</Header>}
            empty={<EmptyState icon="auditLog" heading={t('profile.history.emptyHeading')} body={t('profile.history.emptyBody')} />}
            columnDefinitions={[
              { id: 'when', header: t('profile.history.when'), isRowHeader: true, cell: (entry) => dateTime.format(new Date(entry.at)) },
              { id: 'who', header: t('profile.history.who'), cell: (entry) => entry.actor },
              {
                id: 'what',
                header: t('profile.history.what'),
                cell: (entry) => {
                  const key = `profile.history.actions.${entry.action.replaceAll('.', '_')}`;
                  return t.has(key) ? t(key) : entry.action;
                },
              },
            ]}
          />
        )}
        <Container header={<Header variant="h2">{t('profile.leave')}</Header>}>
          <KeyValuePairs
            columns={3}
            items={member.leave.map((balance) => ({
              label: tLeave(`type.${balance.type}`),
              value: tLeave('balance', { left: balance.left, quota: balance.quota }),
            }))}
          />
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
