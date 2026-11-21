import { randomUUID } from 'node:crypto';
import { crc32, deflateSync } from 'node:zlib';
import mongoose, { Types } from 'mongoose';
import { todayIn } from '@/lib/dates';
import { connectDb } from '@/server/db/connect';
import { Announcement } from '@/server/models/announcement';
import { Event } from '@/server/models/event';
import { GalleryItem } from '@/server/models/galleryItem';
import { School } from '@/server/models/school';
import { Staff } from '@/server/models/staff';
import { User } from '@/server/models/user';
import { Website } from '@/server/models/website';
import { putFile } from '@/server/storage/store';

const DAY_MS = 86_400_000;

const NOTICES = [
  ['Half-yearly examination schedule', 'The half-yearly examinations begin next week. The date sheet is on the calendar. Students must carry their ID cards.'],
  ['Admissions are open for 2027-28', 'Applications for Classes 6 to 10 are open. Apply online from this website, or visit the school office between 9 am and 1 pm on working days.'],
  ['Annual day rehearsals begin', 'Students taking part in the annual day programme will rehearse after school from Monday. Class teachers will share the schedule.'],
] as const;

const EVENTS = [
  ['Open day for new families', 'academic', 18, 18],
  ['Annual sports day', 'sports', 25, 26],
  ['Science exhibition', 'academic', 40, 40],
  ['Annual day', 'cultural', 70, 70],
] as const;

const PHOTOS = [
  ['Morning assembly', [34, 139, 94]],
  ['Science exhibition', [37, 99, 235]],
  ['Annual sports day', [217, 119, 6]],
  ['Library hour', [109, 40, 217]],
  ['Art class', [190, 24, 93]],
  ['Class 6 picnic', [15, 118, 110]],
] as const;

// Plain coloured pictures stand in for photographs: a seed must never hold real children's photos.
function placeholderPng([red, green, blue]: readonly [number, number, number]) {
  const [width, height] = [640, 480];
  const rows = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const at = y * (width * 3 + 1);
    const shade = 1 - (y / height) * 0.35;
    for (let x = 0; x < width; x += 1) rows.set([red * shade, green * shade, blue * shade], at + 1 + x * 3);
  }
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const frame = Buffer.alloc(8 + data.length + 4);
    frame.writeUInt32BE(data.length, 0);
    body.copy(frame, 4);
    frame.writeUInt32BE(crc32(body), 8 + data.length);
    return frame;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(rows)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

/** Fills Green Valley's website, and is safe to run again: what already exists is kept, not repeated. */
export async function seedGreenValleyWebsite(schoolId: Types.ObjectId, domain: string) {
  const shift = (days: number) => todayIn('Asia/Kolkata', new Date(Date.now() + days * DAY_MS));
  const principal = await User.findOne({ 'roles.schoolId': schoolId, 'roles.role': 'principal' }).select('_id').lean();
  if (!principal) throw new Error('Green Valley has no principal account to author the notices');

  await School.updateOne({ _id: schoolId }, { phone: '+917552400100', email: `office@${domain}` });
  const teachers = await Staff.find({ schoolId, type: 'teaching', status: 'active' }).sort({ employeeNo: 1 }).limit(6).select('_id').lean();
  await Website.updateOne(
    { schoolId },
    {
      status: 'published',
      admissionsOpen: true,
      'hero.headline': 'Green Valley School, Bhopal',
      'hero.subline': 'A caring CBSE school where every child is known by name.',
      about:
        'Green Valley School teaches Classes 6 to 10 under the CBSE curriculum. Our classes are small, our teachers know every child, and we keep parents closely informed through the school app.\n\nWe believe in steady habits: reading every day, asking questions, and finishing what you start. Sports, art and science projects are part of the week, not an extra.',
      sections: { about: true, notices: true, events: true, staff: true, gallery: true, contact: true },
      staffIds: teachers.map((teacher) => teacher._id),
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  // Filled only where the school has written nothing yet, so a school's own words are never replaced.
  const ifEmpty = (field: string, value: unknown) =>
    Website.updateOne({ schoolId, [`${field}.0`]: { $exists: false } }, { [field]: value });
  await ifEmpty('programmes', [
    { title: 'Middle school, Classes 6 to 8', text: 'Core subjects with project work, a reading hour and weekly sports.' },
    { title: 'Secondary school, Classes 9 and 10', text: 'CBSE board preparation with regular tests and one-to-one guidance.' },
    { title: 'Clubs and activities', text: 'Science, art, music and debate clubs after school.' },
  ]);
  await ifEmpty('facilities', [
    { title: 'Library', text: 'Over 5,000 books and a quiet reading room.' },
    { title: 'Science laboratory', text: 'Physics, chemistry and biology practicals for every class.' },
    { title: 'Computer lab', text: 'One computer for every two students.' },
    { title: 'Playground', text: 'A cricket field, basketball court and open play area.' },
  ]);
  await ifEmpty('testimonials', [
    { quote: 'The teachers know our child by name and tell us early when something needs attention.', by: 'A parent of Class 7' },
    { quote: 'Getting updates on the school app means we never miss a notice or a fee date.', by: 'A parent of Class 9' },
  ]);
  await ifEmpty('pages', [
    { slug: 'admissions-policy', title: 'Admissions policy', body: 'Applications open every year for Classes 6 to 10. Apply online from this website. The school will contact you to confirm a date to meet, and to ask for the birth certificate and a recent photograph.\n\nSeats are offered in the order applications complete, after a short conversation with the child and parents.' },
  ]);

  const titles = NOTICES.map(([title]) => title);
  await Announcement.updateMany({ schoolId, title: { $in: titles }, 'audience.type': 'school' }, { isPublic: true });
  const haveNotices = new Set((await Announcement.find({ schoolId, title: { $in: titles } }).select('title').lean()).map((row) => row.title));
  for (const [title, body] of NOTICES) {
    if (haveNotices.has(title)) continue;
    await Announcement.create({
      schoolId,
      title,
      body,
      audience: { type: 'school' },
      status: 'published',
      publishAt: new Date(),
      isPublic: true,
      authorId: principal._id,
      createdBy: principal._id,
      updatedBy: principal._id,
    });
  }

  const eventTitles = EVENTS.map(([title]) => title);
  await Event.updateMany({ schoolId, title: { $in: eventTitles } }, { isPublic: true });
  const haveEvents = new Set((await Event.find({ schoolId, title: { $in: eventTitles } }).select('title').lean()).map((row) => row.title));
  for (const [title, type, from, to] of EVENTS) {
    if (haveEvents.has(title)) continue;
    await Event.create({ schoolId, title, type, start: shift(from), end: shift(to), allDay: true, audience: { type: 'school' }, isPublic: true, createdBy: principal._id, updatedBy: principal._id });
  }

  if ((await GalleryItem.countDocuments({ schoolId })) === 0) {
    for (const [caption, colour] of PHOTOS) {
      const _id = new Types.ObjectId();
      const storageKey = `${schoolId}/${_id}/${randomUUID()}.png`;
      await putFile(storageKey, placeholderPng(colour));
      await GalleryItem.create({ _id, schoolId, storageKey, caption, createdBy: principal._id, updatedBy: principal._id });
    }
  }
  return { teachers: teachers.length };
}

async function main() {
  const host = URL.canParse(process.env.MONGODB_URI ?? '') ? new URL(process.env.MONGODB_URI as string).host : 'an unknown host';
  if (!process.argv.includes('--yes')) {
    console.log(`This adds demo website data for the school with code VWN in the database at ${host}.`);
    console.log('Nothing is deleted. Run it again with --yes to go ahead.');
    return;
  }
  await connectDb();
  const school = await School.findOne({ code: 'VWN' }).select('_id').lean();
  if (!school) throw new Error('No school with code VWN in this database');
  const { teachers } = await seedGreenValleyWebsite(school._id, 'greenvalley.example');
  console.log(`Green Valley's website is filled in (${teachers} teachers). Open /site/vwn.`);
}

if (process.argv[1]?.endsWith('seedWebsite.ts')) {
  main()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
