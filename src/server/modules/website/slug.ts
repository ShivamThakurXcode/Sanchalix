const RESERVED = new Set([
  "www",
  "app",
  "api",
  "admin",
  "console",
  "mail",
  "static",
  "assets",
  "cdn",
  "blog",
  "guide",
  "help",
  "status",
  "support",
  "signin",
  "welcome",
  "sanchalix",
]);

export const SLUG = /^[a-z0-9-]{3,30}$/;

/** Subdomains the platform itself uses can't belong to a school. */
export const isUsableSlug = (slug: string) =>
  SLUG.test(slug) &&
  !slug.startsWith("-") &&
  !slug.endsWith("-") &&
  !RESERVED.has(slug);

/** A school's first slug is its code, unless the platform already uses that name for something else. */
export const defaultSlug = (code: string) => {
  const slug = code.toLowerCase();
  return isUsableSlug(slug) ? slug : undefined;
};

/** Where a school's pages start: the site root on its own address, /site/{slug} in development. */
export const siteBase = (slug: string) =>
  process.env.SITE_ROOT_DOMAIN ? "" : `/site/${slug}`;

/** A domain name a school may point at its website. */
export const DOMAIN =
  /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
