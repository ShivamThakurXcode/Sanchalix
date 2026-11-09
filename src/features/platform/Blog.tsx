'use client';

import Button from '@cloudscape-design/components/button';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import { useTranslations } from 'next-intl';
import { AppLink } from '@/components/AppLink';
import { type Column, DataTable } from '@/components/DataTable';
import { svg } from '@/components/icons';
import { postDate } from '@/features/marketing/posts';
import { useRouter } from '@/i18n/navigation';
import type { PostRow } from '@/server/modules/blog/service';

const LIST = '/console/blog';
type Data = { rows: PostRow[]; page: number; nextCursor: string | null; prevCursor: string | null };

export function BlogTable({ data }: { data: Data | null }) {
  const t = useTranslations('platform.blog');
  const router = useRouter();

  const columns: Column<PostRow>[] = [
    { id: 'title', header: t('columns.title'), cell: (row) => <AppLink href={`${LIST}/${row.id}`}>{row.title}</AppLink>, isRowHeader: true },
    { id: 'topic', header: t('columns.topic'), cell: (row) => t(`topics.${row.topic}`) },
    {
      id: 'status',
      header: t('columns.status'),
      cell: (row) => <StatusIndicator type={row.status === 'published' ? 'success' : 'pending'}>{t(`status.${row.status}`)}</StatusIndicator>,
    },
    { id: 'date', header: t('columns.date'), cell: (row) => postDate(row.publishedOn) },
  ];

  return (
    <DataTable
      id="platform-blog"
      title={t('title')}
      counter={data ? `(${data.rows.length}${data.nextCursor ? '+' : ''})` : ''}
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
      items={data?.rows ?? null}
      columns={columns}
      server={{ page: data?.page ?? 1, nextCursor: data?.nextCursor ?? null, prevCursor: data?.prevCursor ?? null }}
      searchPlaceholder={t('searchPlaceholder')}
      empty={{ icon: 'blog', heading: t('empty.heading'), body: t('empty.body') }}
    />
  );
}
