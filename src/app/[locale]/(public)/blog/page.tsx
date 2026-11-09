import Box from '@cloudscape-design/components/box';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import ContentLayout from '@cloudscape-design/components/content-layout';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { getTranslations } from 'next-intl/server';
import { BlogCard } from '@/features/marketing/BlogCard';
import { PublicPage } from '@/features/marketing/PublicPage';
import { listPublishedPosts } from '@/server/modules/blog/service';

export async function generateMetadata() {
  const t = await getTranslations('marketing.blog');
  return { title: t('title'), description: t('description') };
}

export default async function BlogPage() {
  const [t, posts] = await Promise.all([getTranslations('marketing.blog'), listPublishedPosts()]);

  return (
    <PublicPage>
      <ContentLayout
        defaultPadding
        disableOverlap
        maxContentWidth={1040}
        headerVariant="high-contrast"
        header={
          <Box padding={{ vertical: 'xl' }}>
            <SpaceBetween size="s">
              <Box variant="h1" fontSize="display-l" fontWeight="bold">
                {t('title')}
              </Box>
              <Box variant="p" fontSize="heading-m" color="inherit">
                {t('description')}
              </Box>
            </SpaceBetween>
          </Box>
        }
      >
        <Box padding={{ vertical: 'xl' }}>
          {posts.length === 0 && <Box color="text-body-secondary">{t('empty')}</Box>}
          <ColumnLayout columns={3} minColumnWidth={280}>
            {posts.map((post) => (
              <BlogCard key={post.slug} {...post} />
            ))}
          </ColumnLayout>
        </Box>
      </ContentLayout>
    </PublicPage>
  );
}
