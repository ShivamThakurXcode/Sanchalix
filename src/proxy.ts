import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { SESSION_COOKIE } from '@/lib/sessionCookie';
import { DOMAIN, isUsableSlug } from '@/server/modules/website/slug';

const handleLocale = createMiddleware(routing);
const LOCALE_PREFIX = new RegExp(`^/(${routing.locales.join('|')})(?=/|$)`);
const PUBLIC_PATH = /^\/(signin|welcome|blog|guide|verify|forgot-password|reset-password|site)(\/|$)/;
const SITE_ROOT = process.env.SITE_ROOT_DOMAIN?.toLowerCase();
const CUSTOM_DOMAINS = process.env.SITE_CUSTOM_DOMAINS === 'true';
const APP_HOST = URL.canParse(process.env.APP_URL ?? '') ? new URL(process.env.APP_URL as string).hostname.toLowerCase() : '';

/** The school whose website this host is, such as `vwn` for `vwn.sanchalix.app`. Unset in development, which uses /site/{slug}. */
function schoolSlug(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase();
  if (!SITE_ROOT || !host) return null;
  if (host.endsWith(`.${SITE_ROOT}`)) {
    const slug = host.slice(0, -(SITE_ROOT.length + 1));
    return isUsableSlug(slug) ? slug : null;
  }
  // A school's own domain. The page serves it only if that school has proved it owns the name.
  return CUSTOM_DOMAINS && host !== SITE_ROOT && host !== APP_HOST && DOMAIN.test(host) ? host : null;
}

const SECURITY_HEADERS = {
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), geolocation=(self), microphone=()',
};

// A convenience redirect only. Authorization is enforced by requirePermission on every page and action.
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const prefix = LOCALE_PREFIX.exec(pathname)?.[0] ?? '';
  const path = pathname.slice(prefix.length) || '/';

  const slug = schoolSlug(request);
  let response: NextResponse;
  if (slug) {
    const url = request.nextUrl.clone();
    const seo = path === '/sitemap.xml' ? 'sitemap' : path === '/robots.txt' ? 'robots' : null;
    url.pathname = seo ? `/api/site/${slug}/seo/${seo}` : `/site/${slug}${path === '/' ? '' : path}`;
    response = seo ? NextResponse.rewrite(url) : handleLocale(new NextRequest(url, request));
  } else if (PUBLIC_PATH.test(path) || request.cookies.has(SESSION_COOKIE)) {
    response = handleLocale(request);
  } else if (path === '/') {
    // A visitor with no session who opens the site sees what Sanchalix is, not a bare sign-in form.
    response = NextResponse.redirect(new URL(`${prefix}/welcome`, request.url));
  } else {
    const signIn = new URL(`${prefix}/signin`, request.url);
    signIn.searchParams.set('next', path + search);
    response = NextResponse.redirect(signIn);
  }

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
  return response;
}

// The two files a search engine asks a school's address for are let through so they can be answered per school.
export const config = { matcher: ['/((?!api|_next|.*\\..*).*)', '/sitemap.xml', '/robots.txt'] };
