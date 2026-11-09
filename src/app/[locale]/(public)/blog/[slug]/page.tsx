import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getEntry, PublicPage } from '@/features/marketing/PublicPage';
import { postDate } from '@/features/marketing/posts';
import { getPublishedPost, listPublishedPosts } from '@/server/modules/blog/service';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const post = await getPublishedPost((await params).slug);
  return post ? { title: post.seoTitle, description: post.seoDescription, ...(post.keywords.length > 0 && { keywords: post.keywords }) } : {};
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();
  const [t, tMarketing, enter, posts] = await Promise.all([
    getTranslations('marketing.blog'),
    getTranslations('marketing'),
    getEntry(),
    listPublishedPosts(),
  ]);
  const others = posts.filter(({ slug }) => slug !== post.slug).slice(0, 3);

  return (
    <PublicPage>
      {post.jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: post.jsonLd.replace(/</g, '\\u003c') }} />}
      <ContentLayout
        defaultPadding
        disableOverlap
        maxContentWidth={760}
        headerVariant="high-contrast"
        header={
          <Box padding={{ vertical: 'xl' }}>
            <SpaceBetween size="s">
              <Link href="/blog" color="inverted">
                {t('back')}
              </Link>
              <Box variant="awsui-key-label" color="inherit">
                {t(`topics.${post.topic}`)}
              </Box>
              <Box variant="h1" fontSize="display-l" fontWeight="bold">
                {post.title}
              </Box>
              <Box variant="p" fontSize="heading-m" color="inherit">
                {post.summary}
              </Box>
              <Box color="inherit" fontSize="body-s">
                {t('meta', { date: postDate(post.date), minutes: post.minutes })}
              </Box>
            </SpaceBetween>
          </Box>
        }
      >
        <Box padding={{ vertical: 'xl' }}>
          <SpaceBetween size="xxl">
            <article>
              <SpaceBetween size="l">
                {post.coverImage && (
                  <div key="cover" className="vw-prose">
                    <img src={post.coverImage} alt="" />
                  </div>
                )}
                <div key="content" className="vw-prose" dangerouslySetInnerHTML={{ __html: post.content }} />
                {post.tags.length > 0 && (
                  <Box key="tags" color="text-body-secondary">
                    {post.tags.map((tag) => `#${tag}`).join('  ')}
                  </Box>
                )}
              </SpaceBetween>
            </article>

            {others.length > 0 && (
              <Container header={<Header variant="h2">{t('more')}</Header>}>
                <SpaceBetween size="m">
                  {others.map(({ slug, title, date, minutes }) => (
                    <div key={slug}>
                      <Link href={`/blog/${slug}`} fontSize="heading-s">
                        {title}
                      </Link>
                      <Box color="text-body-secondary" fontSize="body-s">
                        {t('meta', { date: postDate(date), minutes })}
                      </Box>
                    </div>
                  ))}
                </SpaceBetween>
              </Container>
            )}

            <Container>
              <SpaceBetween size="m" alignItems="center">
                <Box variant="h2" textAlign="center">
                  {tMarketing('cta.title')}
                </Box>
                <Box color="text-body-secondary" textAlign="center">
                  {tMarketing('cta.body')}
                </Box>
                <Button variant="primary" href={enter.href}>
                  {enter.text}
                </Button>
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </Box>
      </ContentLayout>
    </PublicPage>
  );
}
