'use client';

import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import DatePicker from '@cloudscape-design/components/date-picker';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import Modal from '@cloudscape-design/components/modal';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Textarea from '@cloudscape-design/components/textarea';
import TokenGroup from '@cloudscape-design/components/token-group';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useCrumb } from '@/components/Crumb';
import { svg } from '@/components/icons';
import { postDate, readingMinutes, TOPICS } from '@/features/marketing/posts';
import { useRouter } from '@/i18n/navigation';
import { createPost, deletePost, updatePost } from '@/server/modules/blog/actions';
import { uploadBlogImage } from './blogImage';
import { RichTextEditor } from './RichTextEditor';

const LIST = '/console/blog';

type Values = {
  title: string;
  slug: string;
  summary: string;
  topic: string;
  cover: string;
  coverImage: string;
  publishedOn: string;
  status: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  jsonLd: string;
  content: string;
};
type Post = Values & { id: string; author: string; createdOn: string; updatedOn: string };

const slugOf = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

type TokenInputProps = { label: string; tokens: string[]; hint: string; onChange: (tokens: string[]) => void };

function TokenInput({ label, tokens, hint, onChange }: TokenInputProps) {
  const t = useTranslations('platform.blog');
  const [text, setText] = useState('');
  const add = () => {
    const token = text.trim();
    setText('');
    if (token && !tokens.includes(token)) onChange([...tokens, token]);
  };
  return (
    <FormField label={label} constraintText={hint}>
      <SpaceBetween size="xs">
        <Input
          value={text}
          placeholder={t('tokenPlaceholder')}
          onChange={({ detail }) => setText(detail.value)}
          onKeyDown={({ detail }) => {
            if (detail.key === 'Enter') add();
          }}
          onBlur={add}
        />
        {tokens.length > 0 && (
          <TokenGroup
            alignment="horizontal"
            items={tokens.map((token) => ({ label: token, dismissLabel: `${t('remove')} ${token}` }))}
            onDismiss={({ detail }) => onChange(tokens.filter((_, index) => index !== detail.itemIndex))}
          />
        )}
      </SpaceBetween>
    </FormField>
  );
}

export function BlogForm({ post, today }: { post?: Post; today: string }) {
  const t = useTranslations('platform.blog');
  const router = useRouter();
  useCrumb(post?.title ?? t('add'));
  const [values, setValues] = useState<Values>(
    post ?? {
      title: '',
      slug: '',
      summary: '',
      topic: '',
      cover: 'dashboard',
      coverImage: '',
      publishedOn: today,
      status: 'draft',
      tags: [],
      seoTitle: '',
      seoDescription: '',
      keywords: [],
      jsonLd: '',
      content: '',
    },
  );
  const [saved, setSaved] = useState(JSON.stringify(values));
  const [slugEdited, setSlugEdited] = useState(Boolean(post));
  const [error, setError] = useState<{ message: string; fieldErrors?: Record<string, string> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const coverPicker = useRef<HTMLInputElement>(null);
  const [toolbarHost, setToolbarHost] = useState<HTMLElement | null>(null);
  const errors = error?.fieldErrors ?? {};
  const dirty = JSON.stringify(values) !== saved;
  const published = values.status === 'published';
  const set = (patch: Partial<Values>) => setValues((current) => ({ ...current, ...patch }));

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save(patch: Partial<Values> = {}) {
    const next = { ...values, ...patch };
    setBusy(true);
    setError(null);
    const result = post ? await updatePost(post.id, next) : await createPost(next);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setValues(next);
    setSaved(JSON.stringify(next));
    if (post) router.refresh();
    else router.replace(`${LIST}/${result.data.id}`);
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

  async function uploadCover(file: File) {
    setUploadingCover(true);
    const result = await uploadBlogImage(file);
    setUploadingCover(false);
    if ('error' in result) return setError({ message: result.error });
    set({ coverImage: result.url });
  }

  function formatJson() {
    try {
      set({ jsonLd: JSON.stringify(JSON.parse(values.jsonLd), null, 2) });
    } catch {
      setError({ message: t('errors.jsonLd'), fieldErrors: { jsonLd: t('errors.jsonLd') } });
    }
  }

  return (
    <div className="vw-composer">
      <div className="vw-composer-body">
          <div className="vw-pane">
            <SpaceBetween size="l">
              <Header variant="h2">{t('details')}</Header>
              <FormField label={t('fields.title')} errorText={errors.title}>
                <Input
                  value={values.title}
                  autoComplete={false}
                  invalid={Boolean(errors.title)}
                  onChange={({ detail }) => set({ title: detail.value, ...(!slugEdited && { slug: slugOf(detail.value) }) })}
                />
              </FormField>
              <FormField label={t('fields.summary')} constraintText={t('summaryHint', { count: values.summary.length })} errorText={errors.summary}>
                <Textarea value={values.summary} rows={5} invalid={Boolean(errors.summary)} onChange={({ detail }) => set({ summary: detail.value })} />
              </FormField>
              <FormField label={t('fields.slug')} constraintText={`/blog/${values.slug}`} errorText={errors.slug}>
                <Input
                  value={values.slug}
                  autoComplete={false}
                  invalid={Boolean(errors.slug)}
                  onChange={({ detail }) => {
                    setSlugEdited(true);
                    set({ slug: detail.value });
                  }}
                />
              </FormField>
              <FormField label={t('fields.topic')} errorText={errors.topic}>
                <Select
                  placeholder={t('choose')}
                  invalid={Boolean(errors.topic)}
                  selectedOption={values.topic ? { value: values.topic, label: t(`topics.${values.topic}`) } : null}
                  options={TOPICS.map((value) => ({ value, label: t(`topics.${value}`) }))}
                  onChange={({ detail }) => set({ topic: detail.selectedOption.value ?? '' })}
                />
              </FormField>
              <TokenInput label={t('fields.tags')} tokens={values.tags} hint={errors.tags ?? t('tagsHint')} onChange={(tags) => set({ tags })} />
              <FormField label={t('fields.coverImage')} constraintText={t('coverImageHint')} errorText={errors.coverImage}>
                <SpaceBetween size="xs">
                  {Boolean(values.coverImage) && (
                    <div className="vw-prose">
                      <img src={values.coverImage} alt="" />
                    </div>
                  )}
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button iconSvg={svg('upload')} loading={uploadingCover} onClick={() => coverPicker.current?.click()}>
                      {values.coverImage ? t('replaceImage') : t('uploadImage')}
                    </Button>
                    {Boolean(values.coverImage) && (
                      <Button variant="link" onClick={() => set({ coverImage: '' })}>
                        {t('removeImage')}
                      </Button>
                    )}
                  </SpaceBetween>
                  <input
                    ref={coverPicker}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void uploadCover(file);
                    }}
                  />
                </SpaceBetween>
              </FormField>
              {post && (
                <Button iconSvg={svg('delete')} onClick={() => setConfirmDelete(true)}>
                  {t('delete')}
                </Button>
              )}
            </SpaceBetween>
          </div>

          <div className="vw-composer-main">
            <div className="vw-composer-toolbar" ref={setToolbarHost} />
            <div className="vw-composer-scroll">
              {error && (
                <div role="alert">
                  <StatusIndicator type="error">{error.message}</StatusIndicator>
                </div>
              )}
              <FormField stretch errorText={errors.content}>
                <RichTextEditor
                  label={t('fields.body')}
                  toolbarHost={toolbarHost}
                  value={values.content}
                  onChange={(content) => set({ content })}
                  onError={(message) => setError({ message })}
                />
              </FormField>
            </div>
          </div>

          <div className="vw-pane">
            <SpaceBetween size="l">
              <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                {post && (
                  <Button iconSvg={svg(published ? 'hide' : 'success')} disabled={busy} onClick={() => void save({ status: published ? 'draft' : 'published' })}>
                    {published ? t('unpublish') : t('publish')}
                  </Button>
                )}
                <Button variant="primary" iconSvg={svg('save')} loading={busy} onClick={() => void save()}>
                  {t('save')}
                </Button>
              </SpaceBetween>
              <SpaceBetween size="s">
                <SpaceBetween direction="horizontal" size="m">
                  <StatusIndicator type={published ? 'success' : 'pending'}>{t(`status.${values.status}`)}</StatusIndicator>
                  <Box color="text-body-secondary">{t('readTime', { minutes: readingMinutes(values.content) })}</Box>
                </SpaceBetween>
                {post && (
                  <Box color="text-body-secondary">
                    <SpaceBetween size="xxs">
                      <span>{t('meta.author', { name: post.author || t('meta.unknown') })}</span>
                      <span>{t('meta.created', { date: postDate(post.createdOn) })}</span>
                      <span>{t('meta.updated', { date: postDate(post.updatedOn) })}</span>
                    </SpaceBetween>
                  </Box>
                )}
                <FormField label={t('fields.publishedOn')} constraintText={t('statusHint')} errorText={errors.publishedOn}>
                  <DatePicker value={values.publishedOn} placeholder="YYYY/MM/DD" onChange={({ detail }) => set({ publishedOn: detail.value })} />
                </FormField>
              </SpaceBetween>
              <SpaceBetween size="l">
                <Header variant="h2">{t('seo')}</Header>
                <FormField label={t('fields.seoTitle')} constraintText={`${values.seoTitle.length}/60`} errorText={errors.seoTitle}>
                  <Input value={values.seoTitle} invalid={Boolean(errors.seoTitle)} onChange={({ detail }) => set({ seoTitle: detail.value })} />
                </FormField>
                <FormField label={t('fields.seoDescription')} constraintText={`${values.seoDescription.length}/160`} errorText={errors.seoDescription}>
                  <Textarea value={values.seoDescription} rows={4} invalid={Boolean(errors.seoDescription)} onChange={({ detail }) => set({ seoDescription: detail.value })} />
                </FormField>
                <TokenInput label={t('fields.keywords')} tokens={values.keywords} hint={errors.keywords ?? t('keywordsHint')} onChange={(keywords) => set({ keywords })} />
                <FormField label={t('searchPreview')}>
                  <SpaceBetween size="xxs">
                    <Box variant="small" color="text-status-success">{`/blog/${values.slug}`}</Box>
                    <Box variant="h3" color="text-status-info">
                      {values.seoTitle || values.title}
                    </Box>
                    <Box variant="small" color="text-body-secondary">
                      {values.seoDescription || values.summary}
                    </Box>
                  </SpaceBetween>
                </FormField>
                <FormField
                  label={t('fields.jsonLd')}
                  constraintText={t('jsonLdHint')}
                  errorText={errors.jsonLd}
                  secondaryControl={
                    <Button variant="inline-link" disabled={!values.jsonLd.trim()} onClick={formatJson}>
                      {t('format')}
                    </Button>
                  }
                >
                  <Textarea value={values.jsonLd} rows={10} spellcheck={false} invalid={Boolean(errors.jsonLd)} onChange={({ detail }) => set({ jsonLd: detail.value })} />
                </FormField>
              </SpaceBetween>
            </SpaceBetween>
          </div>
      </div>
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
    </div>
  );
}
