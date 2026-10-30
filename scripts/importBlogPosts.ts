import mongoose from 'mongoose';
import { connectDb } from '@/server/db/connect';
import { BlogPost } from '@/server/models/blogPost';
import posts from './blogPosts.json';

async function main() {
  await connectDb();
  for (const { date, ...post } of posts) {
    await BlogPost.updateOne({ slug: post.slug }, { $setOnInsert: { ...post, publishedOn: date, status: 'published' } }, { upsert: true });
  }
  console.log(`Blog posts present: ${posts.length} (existing ones are left as they are)`);
  await mongoose.disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
