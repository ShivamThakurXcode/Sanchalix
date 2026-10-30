import 'server-only';
import { Schema } from 'mongoose';
import { COVERS, TOPICS } from '@/features/marketing/posts';
import { audit, DATE_STR, defineModel } from './shared';

// The platform's own blog, shown on the public site. It belongs to no school, so it has no schoolId.
const schema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    topic: { type: String, required: true, enum: TOPICS },
    cover: { type: String, required: true, enum: COVERS },
    publishedOn: { type: String, required: true, match: DATE_STR },
    status: { type: String, required: true, enum: ['draft', 'published'], default: 'draft' },
    sections: [
      new Schema({ heading: { type: String, required: true }, paragraphs: [String] }, { _id: false }),
    ],
    ...audit,
  },
  { timestamps: true },
);

schema.index({ status: 1, publishedOn: -1 });

export const BlogPost = defineModel('BlogPost', schema, 'blogPosts');
