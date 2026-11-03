import { getTranslations } from 'next-intl/server';
import { BlogForm } from '@/features/platform/Blog';
import { todayIn } from '@/lib/dates';
import { platformContext } from '../../platformContext';

export async function generateMetadata() {
  const t = await getTranslations('platform.blog');
  return { title: t('add') };
}

export default async function NewPostPage() {
  await platformContext('platform.blog.manage');
  return <BlogForm today={todayIn('Asia/Kolkata')} />;
}
