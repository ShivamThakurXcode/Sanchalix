import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { BlogTable } from '@/features/platform/Blog';
import { ListPosts, listPosts } from '@/server/modules/blog/service';
import { platformContext } from '../platformContext';

export async function generateMetadata() {
  const t = await getTranslations('platform.blog');
  return { title: t('title') };
}

export default async function BlogAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await platformContext('platform.blog.read');
  const query = ListPosts.parse(await searchParams);
  return (
    <Suspense key={JSON.stringify(query)} fallback={<BlogTable data={null} />}>
      <Posts query={query} />
    </Suspense>
  );
}

async function Posts({ query }: { query: ListPosts }) {
  return <BlogTable data={await listPosts(query)} />;
}
