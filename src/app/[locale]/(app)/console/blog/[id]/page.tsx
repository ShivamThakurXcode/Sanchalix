import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { BlogForm } from '@/features/platform/Blog';
import { todayIn } from '@/lib/dates';
import { getPost } from '@/server/modules/blog/service';
import { platformContext } from '../../platformContext';

export async function generateMetadata() {
  const t = await getTranslations('platform.blog');
  return { title: t('edit') };
}

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await platformContext('platform.blog.manage');
  const post = await getPost((await params).id);
  if (!post) notFound();
  return <BlogForm post={post} today={todayIn('Asia/Kolkata')} />;
}
