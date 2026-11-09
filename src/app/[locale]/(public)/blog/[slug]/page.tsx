import Badge from '@cloudscape-design/components/badge';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { svg } from '@/components/icons';
import { BlogCard, BlogCover } from '@/features/marketing/BlogCard';
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
        maxContentWidth={1040}
        headerVariant="high-contrast"
        header={
          <Box padding={{ vertical: 'xl' }}>
            <div className="vw-article-column">
              <SpaceBetween size="s">
                <Link href="/blog" color="inverted">
                  {t('back')}
                </Link>
                <Box variant="awsui-key-label" color="inherit">
                  {t(`topics.${post.topic}`)} · {t('readTime', { minutes: post.minutes })}
                </Box>
                <Box variant="h1" fontSize="display-l" fontWeight="bold">
                  {post.title}
                </Box>
                <Box variant="p" fontSize="heading-m" color="inherit">
                  {post.summary}
                </Box>
                <Box color="inherit" fontSize="body-s">
                  {postDate(post.date)}
                </Box>
              </SpaceBetween>
            </div>
          </Box>
        }
      >
        <Box padding={{ vertical: 'xl' }}>
          <SpaceBetween size="xxl">
            <article className="vw-article-column">
              <SpaceBetween size="xl">
                <div className="vw-article-cover">
                  <BlogCover cover={post.cover} coverImage={post.coverImage} />
                </div>
                <div className="vw-prose" dangerouslySetInnerHTML={{ __html: post.content }} />
                {post.tags.length > 0 && (
                  <SpaceBetween direction="horizontal" size="xs">
                    {post.tags.map((tag) => (
                      <Badge key={tag} color="grey">
                        {tag}
                      </Badge>
                    ))}
                  </SpaceBetween>
                )}
              </SpaceBetween>
            </article>

            {others.length > 0 && (
              <section aria-labelledby="more-heading">
                <SpaceBetween size="l">
                  <Header variant="h2">
                    <span id="more-heading">{t('more')}</span>
                  </Header>
                  <ColumnLayout columns={3} minColumnWidth={280}>
                    {others.map((other) => (
                      <BlogCard key={other.slug} {...other} />
                    ))}
                  </ColumnLayout>
                </SpaceBetween>
              </section>
            )}

            <Container>
              <SpaceBetween size="m" alignItems="center">
                <Box variant="h2" textAlign="center">
                  {tMarketing('cta.title')}
                </Box>
                <Box color="text-body-secondary" textAlign="center">
                  {tMarketing('cta.body')}
                </Box>
                <Button variant="primary" href={enter.href} iconSvg={svg('signIn')}>
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
