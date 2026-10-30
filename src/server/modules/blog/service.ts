import 'server-only';
import { z } from 'zod';
import { todayIn } from '@/lib/dates';
import { AppError } from '@/lib/appError';
import { bodyToSections, COVERS, readingMinutes, sectionsToBody, TOPICS } from '@/features/marketing/posts';
import { connectDb } from '@/server/db/connect';
import { paginate } from '@/server/db/paginate';
import { BlogPost } from '@/server/models/blogPost';
import { DATE_STR } from '@/server/models/shared';

const E = 'platform.blog.errors';
export const PostId = z.string().regex(/^[0-9a-f]{24}$/, `${E}.notFound`);

export const PostInput = z.object({
  title: z.string().trim().min(3, `${E}.title`).max(120, `${E}.title`),
  slug: z.string().trim().max(80, `${E}.slug`).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, `${E}.slug`),
  summary: z.string().trim().min(10, `${E}.summary`).max(300, `${E}.summary`),
  topic: z.enum(TOPICS, `${E}.topic`),
  cover: z.enum(COVERS, `${E}.cover`),
  publishedOn: z.string().regex(DATE_STR, `${E}.date`),
  status: z.enum(['draft', 'published']),
  body: z
    .string()
    .trim()
    .refine((body) => body.startsWith('## '), `${E}.body`)
    .transform(bodyToSections)
    .refine((sections) => sections.length > 0 && sections.every(({ heading, paragraphs }) => heading && paragraphs.length > 0), `${E}.body`),
});
export type PostInput = z.input<typeof PostInput>;

export const ListPosts = z.object({ cursor: z.string().optional().catch(undefined) });
export type ListPosts = z.infer<typeof ListPosts>;

export type PostRow = { id: string; title: string; topic: string; status: 'draft' | 'published'; publishedOn: string };

export async function listPosts(query: ListPosts) {
  const { rows, ...page } = await paginate(BlogPost, {}, {
    sortField: 'publishedOn',
    descending: true,
    select: ['title', 'topic', 'status', 'publishedOn'],
    limit: 25,
    cursor: query.cursor,
  });
  const posts: PostRow[] = rows.map((row) => ({
    id: String(row._id),
    title: row.title,
    topic: row.topic,
    status: row.status,
    publishedOn: row.publishedOn,
  }));
  return { rows: posts, ...page };
}

export async function getPost(id: string) {
  if (!PostId.safeParse(id).success) return null;
  const post = await BlogPost.findById(id).lean();
  if (!post) return null;
  return {
    id,
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    topic: post.topic,
    cover: post.cover,
    publishedOn: post.publishedOn,
    status: post.status,
    body: sectionsToBody(post.sections.map(({ heading, paragraphs }) => ({ heading, paragraphs }))),
  };
}

const fields = (input: z.output<typeof PostInput>) => {
  const { body, ...rest } = input;
  return { ...rest, sections: body };
};

export async function createPost(userId: string, input: z.output<typeof PostInput>) {
  const post = await BlogPost.create({ ...fields(input), createdBy: userId, updatedBy: userId });
  return { id: String(post._id) };
}

export async function updatePost(userId: string, id: string, input: z.output<typeof PostInput>) {
  const post = await BlogPost.findByIdAndUpdate(id, { ...fields(input), updatedBy: userId }, { runValidators: true })
    .select('status')
    .lean();
  if (!post) throw new AppError('NOT_FOUND', `${E}.notFound`);
  return { before: { status: post.status } };
}

export async function deletePost(id: string) {
  const post = await BlogPost.findByIdAndDelete(id).select('title').lean();
  if (!post) throw new AppError('NOT_FOUND', `${E}.notFound`);
  return { title: post.title };
}

const visible = () => ({ status: 'published' as const, publishedOn: { $lte: todayIn('Asia/Kolkata') } });
const shape = (post: { slug: string; title: string; summary: string; topic: string; cover: string; publishedOn: string; sections: { heading: string; paragraphs: string[] }[] }) => ({
  slug: post.slug,
  title: post.title,
  summary: post.summary,
  topic: post.topic,
  cover: post.cover,
  date: post.publishedOn,
  minutes: readingMinutes(post.sections),
});

export async function listPublishedPosts() {
  await connectDb();
  const posts = await BlogPost.find(visible()).sort({ publishedOn: -1, _id: -1 }).lean();
  return posts.map(shape);
}

export async function getPublishedPost(slug: string) {
  await connectDb();
  const post = await BlogPost.findOne({ ...visible(), slug }).lean();
  return post && { ...shape(post), sections: post.sections.map(({ heading, paragraphs }) => ({ heading, paragraphs })) };
}
