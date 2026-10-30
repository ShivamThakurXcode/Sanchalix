'use client';

import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import DatePicker from '@cloudscape-design/components/date-picker';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import Modal from '@cloudscape-design/components/modal';
import Pagination from '@cloudscape-design/components/pagination';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import Textarea from '@cloudscape-design/components/textarea';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { AppLink } from '@/components/AppLink';
import { useCrumb } from '@/components/Crumb';
import { EmptyState } from '@/components/EmptyState';
import { svg } from '@/components/icons';
import { COVERS, postDate, TOPICS } from '@/features/marketing/posts';
import { usePathname, useRouter } from '@/i18n/navigation';
import { createPost, deletePost, updatePost } from '@/server/modules/blog/actions';
import type { PostRow } from '@/server/modules/blog/service';

const LIST = '/platform/blog';
type Data = { rows: PostRow[]; page: number; nextCursor: string | null; prevCursor: string | null };

export function BlogTable({ data }: { data: Data | null }) {
  const t = useTranslations('platform.blog');
  const router = useRouter();
  const pathname = usePathname();
  const page = data?.page ?? 1;

  return (
    <Table
      variant="container"
      stickyHeader
      enableKeyboardNavigation
      trackBy="id"
      items={data?.rows ?? []}
      loading={!data}
      loadingText={t('loading')}
      header={
        <Header
          variant="h2"
          counter={data ? `(${data.rows.length}${data.nextCursor ? '+' : ''})` : undefined}
          description={t('description')}
          actions={
            <Button
              variant="primary"
              iconSvg={svg('add')}
              href={`${LIST}/new`}
              onFollow={(event) => {
                event.preventDefault();
                router.push(`${LIST}/new`);
              }}
            >
              {t('add')}
            </Button>
          }
        >
          {t('title')}
        </Header>
      }
      pagination={
        <Pagination
          currentPageIndex={page}
          pagesCount={data?.nextCursor ? page + 1 : page}
          openEnd={Boolean(data?.nextCursor)}
          disabled={!data}
          onChange={({ detail }) => {
            if (!data) return;
            const cursor = detail.currentPageIndex > page ? data.nextCursor : data.prevCursor;
            router.replace(detail.currentPageIndex === 1 || !cursor ? pathname : `${pathname}?cursor=${cursor}`);
          }}
        />
      }
      empty={<EmptyState icon="blog" heading={t('empty.heading')} body={t('empty.body')} />}
      columnDefinitions={[
        { id: 'title', header: t('columns.title'), cell: (row) => <AppLink href={`${LIST}/${row.id}`}>{row.title}</AppLink>, isRowHeader: true },
        { id: 'topic', header: t('columns.topic'), cell: (row) => t(`topics.${row.topic}`) },
        {
          id: 'status',
          header: t('columns.status'),
          cell: (row) => (
            <StatusIndicator type={row.status === 'published' ? 'success' : 'pending'}>{t(`status.${row.status}`)}</StatusIndicator>
          ),
        },
        { id: 'date', header: t('columns.date'), cell: (row) => postDate(row.publishedOn) },
      ]}
    />
  );
}

type Values = {
  title: string;
  slug: string;
  summary: string;
  topic: string;
  cover: string;
  publishedOn: string;
  status: string;
  body: string;
};

const slugOf = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export function BlogForm({ post, today }: { post?: Values & { id: string }; today: string }) {
  const t = useTranslations('platform.blog');
  const router = useRouter();
  useCrumb(post?.title ?? t('add'));
  const [values, setValues] = useState<Values>(
    post ?? { title: '', slug: '', summary: '', topic: '', cover: 'dashboard', publishedOn: today, status: 'draft', body: '' },
  );
  const [slugEdited, setSlugEdited] = useState(Boolean(post));
  const [error, setError] = useState<{ message: string; fieldErrors?: Record<string, string> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = error?.fieldErrors ?? {};
  const set = (patch: Partial<Values>) => setValues({ ...values, ...patch });

  useEffect(() => {
    if (error) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [error]);

  async function submit() {
    setBusy(true);
    setError(null);
    const result = post ? await updatePost(post.id, values) : await createPost(values);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    router.push(LIST);
  }

  async function remove() {
    if (!post) return;
    setBusy(true);
    const result = await deletePost(post.id);
    setBusy(false);
    setConfirmDelete(false);
    if (!result.ok) return setError(result.error);
    router.push(LIST);
  }

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description={t('formDescription')}
          actions={
            post && (
              <Button iconSvg={svg('delete')} onClick={() => setConfirmDelete(true)}>
                {t('delete')}
              </Button>
            )
          }
        >
          {post ? t('edit') : t('add')}
        </Header>
      }
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
                {t('save')}
              </Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="l">
            <Container header={<Header variant="h2">{t('details')}</Header>}>
              <SpaceBetween size="l">
                <FormField label={t('fields.title')} errorText={errors.title}>
                  <Input
                    value={values.title}
                    autoComplete={false}
                    onChange={({ detail }) => set({ title: detail.value, ...(!slugEdited && { slug: slugOf(detail.value) }) })}
                  />
                </FormField>
                <FormField label={t('fields.slug')} constraintText={t('slugHint')} errorText={errors.slug}>
                  <Input
                    value={values.slug}
                    autoComplete={false}
                    onChange={({ detail }) => {
                      setSlugEdited(true);
                      set({ slug: detail.value });
                    }}
                  />
                </FormField>
                <FormField label={t('fields.summary')} constraintText={t('summaryHint')} errorText={errors.summary}>
                  <Textarea value={values.summary} rows={2} onChange={({ detail }) => set({ summary: detail.value })} />
                </FormField>
                <ColumnLayout columns={4}>
                  <FormField label={t('fields.topic')} errorText={errors.topic}>
                    <Select
                      placeholder={t('choose')}
                      selectedOption={values.topic ? { value: values.topic, label: t(`topics.${values.topic}`) } : null}
                      options={TOPICS.map((value) => ({ value, label: t(`topics.${value}`) }))}
                      onChange={({ detail }) => set({ topic: detail.selectedOption.value ?? '' })}
                    />
                  </FormField>
                  <FormField label={t('fields.cover')} errorText={errors.cover}>
                    <Select
                      selectedOption={{ value: values.cover, label: t(`covers.${values.cover}`) }}
                      options={COVERS.map((value) => ({ value, label: t(`covers.${value}`) }))}
                      onChange={({ detail }) => set({ cover: detail.selectedOption.value ?? 'dashboard' })}
                    />
                  </FormField>
                  <FormField label={t('fields.publishedOn')} errorText={errors.publishedOn}>
                    <DatePicker value={values.publishedOn} placeholder="YYYY/MM/DD" onChange={({ detail }) => set({ publishedOn: detail.value })} />
                  </FormField>
                  <FormField label={t('fields.status')} constraintText={t('statusHint')}>
                    <Select
                      selectedOption={{ value: values.status, label: t(`status.${values.status}`) }}
                      options={['draft', 'published'].map((value) => ({ value, label: t(`status.${value}`) }))}
                      onChange={({ detail }) => set({ status: detail.selectedOption.value ?? 'draft' })}
                    />
                  </FormField>
                </ColumnLayout>
              </SpaceBetween>
            </Container>
            <Container header={<Header variant="h2" description={t('bodyHint')}>{t('fields.body')}</Header>}>
              <FormField label={t('fields.body')} stretch errorText={errors.body}>
                <Textarea value={values.body} rows={20} spellcheck onChange={({ detail }) => set({ body: detail.value })} />
              </FormField>
            </Container>
          </SpaceBetween>
        </Form>
      </form>
      <Modal
        visible={confirmDelete}
        header={t('confirmDelete.title')}
        closeAriaLabel={t('cancel')}
        onDismiss={() => setConfirmDelete(false)}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setConfirmDelete(false)}>
                {t('cancel')}
              </Button>
              <Button variant="primary" loading={busy} onClick={() => void remove()}>
                {t('delete')}
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        {t('confirmDelete.body', { title: values.title })}
      </Modal>
    </ContentLayout>
  );
}
