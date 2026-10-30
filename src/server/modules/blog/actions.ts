'use server';

import 'server-only';
import { Types } from 'mongoose';
import { withAction } from '@/server/action';
import { requirePlatform } from '@/server/auth/context';
import { platformAudit } from '@/server/platform/audit';
import { createPost as create, deletePost as remove, PostId, PostInput, updatePost as update } from './service';

export async function createPost(input: unknown) {
  return withAction('platform.blog.create', async () => {
    const ctx = await requirePlatform('platform.blog.manage');
    const data = PostInput.parse(input);
    const post = await create(String(ctx.userId), data);
    await platformAudit(ctx.userId, 'platform.blog.create', { type: 'blogPost', id: new Types.ObjectId(post.id) }, {
      after: { title: data.title, status: data.status },
    });
    return post;
  });
}

export async function updatePost(id: unknown, input: unknown) {
  return withAction('platform.blog.update', async () => {
    const ctx = await requirePlatform('platform.blog.manage');
    const postId = PostId.parse(id);
    const data = PostInput.parse(input);
    const { before } = await update(String(ctx.userId), postId, data);
    await platformAudit(ctx.userId, 'platform.blog.update', { type: 'blogPost', id: new Types.ObjectId(postId) }, {
      before,
      after: { title: data.title, status: data.status },
    });
    return { id: postId };
  });
}

export async function deletePost(id: unknown) {
  return withAction('platform.blog.delete', async () => {
    const ctx = await requirePlatform('platform.blog.manage');
    const postId = PostId.parse(id);
    const { title } = await remove(postId);
    await platformAudit(ctx.userId, 'platform.blog.delete', { type: 'blogPost', id: new Types.ObjectId(postId) }, {
      before: { title },
    });
    return { title };
  });
}
