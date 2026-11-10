import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { MODE_COOKIE, parseVisualMode } from '@/lib/visualMode';
import { getContext } from '@/server/auth/context';
import { PublicHeader } from './PublicHeader';

export const SECTIONS = ['features', 'roles', 'steps'];
const HOME = '/welcome';
const BLOG = '/blog';
const GUIDE = '/guide';

/** Where "Sign in" leads. Someone already signed in gets a way back into the app, not a second sign-in. */
export async function getEntry() {
  const [t, ctx] = await Promise.all([getTranslations('marketing'), getContext()]);
  return { signedIn: Boolean(ctx), ...(ctx ? { href: '/', text: t('openApp') } : { href: '/signin', text: t('signIn') }) };
}

/**
 * The header and footer every marketing page shares. On the home page the section links scroll; on any other page
 * they lead back to the home page's sections.
 */
export async function PublicPage({ home = false, children }: { home?: boolean; children: ReactNode }) {
  const [t, enter] = await Promise.all([getTranslations('marketing'), getEntry()]);
  const links = [
    ...SECTIONS.map((key) => ({ href: `${home ? '' : HOME}#${key}`, text: t(`nav.${key}`) })),
    { href: GUIDE, text: t('nav.guide') },
    { href: BLOG, text: t('nav.blog') },
  ];

  return (
    <>
      <PublicHeader
        brand={t('brand')}
        builtBy={t('builtBy')}
        links={links}
        enter={enter}
        visualMode={parseVisualMode((await cookies()).get(MODE_COOKIE)?.value)}
      />
      {children}
      <footer className="vw-public-footer awsui-context-top-navigation">
        <Box padding={{ vertical: 'xxl', horizontal: 'xl' }}>
          <SpaceBetween size="xl">
            <div className="vw-public-footer-grid">
              <div className="vw-public-footer-brand">
                <SpaceBetween size="s">
                  <div className="vw-public-footer-logo" role="img" aria-label={t('brand')} />
                  <Box fontWeight="bold" fontSize="heading-s">
                    {t('tagline')}
                  </Box>
                  <div className="vw-public-footer-about">
                    <Box color="text-body-secondary">{t('footer.tagline')}</Box>
                  </div>
                </SpaceBetween>
                <div>
                  <Button href={enter.href}>{enter.text}</Button>
                </div>
              </div>
              <nav aria-label={t('footer.product')}>
                <SpaceBetween size="m">
                  <Box fontWeight="bold" fontSize="heading-s">
                    {t('footer.product')}
                  </Box>
                  {links.map(({ href, text }) => (
                    <Link key={href} href={href} variant="secondary">
                      {text}
                    </Link>
                  ))}
                </SpaceBetween>
              </nav>
              <nav aria-label={t('footer.account')}>
                <SpaceBetween size="m">
                  <Box fontWeight="bold" fontSize="heading-s">
                    {t('footer.account')}
                  </Box>
                  <Link href={enter.href} variant="secondary">
                    {enter.text}
                  </Link>
                  {!enter.signedIn && (
                    <Link href="/forgot-password" variant="secondary">
                      {t('footer.forgotPassword')}
                    </Link>
                  )}
                </SpaceBetween>
              </nav>
            </div>
            <div className="vw-public-footer-legal">
              <Box color="text-body-secondary" fontSize="body-s">
                {t('footer.credit')}
              </Box>
              <div className="vw-public-footer-legal-end">
                <Link href="#top" variant="secondary" fontSize="body-s">
                  {t('footer.backToTop')}
                </Link>
                <Box color="text-body-secondary" fontSize="body-s">
                  {t('footer.copyright', { year: new Date().getFullYear() })}
                </Box>
              </div>
            </div>
          </SpaceBetween>
        </Box>
      </footer>
    </>
  );
}
