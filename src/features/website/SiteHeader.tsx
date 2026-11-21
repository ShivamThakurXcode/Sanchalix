"use client";

import TopNavigation from "@cloudscape-design/components/top-navigation";
import { applyMode, Mode } from "@cloudscape-design/global-styles";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { svg } from "@/components/icons";
import { useIsDark } from "@/lib/useIsDark";
import { MODE_COOKIE, type VisualMode } from "@/lib/visualMode";
import { setVisualMode } from "@/server/auth/actions";

type Link = { id: string; href: string; text: string };

// The first few pages sit in the bar; the rest are under More, so a school with every section on still fits.
const IN_BAR = 3;

/** The school's header, built from the same TopNavigation as the rest of the platform. */
export function SiteHeader({
  name,
  logo,
  home,
  links,
  apply,
  signIn,
  visualMode,
}: {
  name: string;
  logo: string | null;
  home: string;
  links: Link[];
  apply: Link | null;
  signIn: Link;
  visualMode: VisualMode;
}) {
  const t = useTranslations("site.nav");
  const theme = useTranslations("shell.theme");
  const [mode, setMode] = useState(visualMode);
  const isDark = useIsDark(mode);
  const label = theme(isDark ? "toLight" : "toDark");
  const pages = links.filter((link) => link.id !== "home");
  const more = pages.slice(IN_BAR);

  function toggle() {
    const next = isDark ? "light" : "dark";
    setMode(next);
    applyMode(isDark ? Mode.Light : Mode.Dark);
    document.cookie = `${MODE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    void setVisualMode(next);
  }

  return (
    <div className="vw-top-nav vw-site-nav">
      <TopNavigation
        identity={{
          href: home,
          title: name,
          ...(logo && { logo: { src: logo, alt: "" } }),
        }}
        utilities={[
          ...pages
            .slice(0, IN_BAR)
            .map((link) => ({ type: "button" as const, ...link })),
          ...(more.length > 0
            ? [
                {
                  type: "menu-dropdown" as const,
                  text: t("more"),
                  items: more.map(({ id, href, text }) => ({
                    id,
                    href,
                    text,
                  })),
                },
              ]
            : []),
          {
            type: "button",
            iconSvg: (
              <span className="vw-icon vw-theme-toggle" data-dark={isDark}>
                {svg("themeToggle")}
              </span>
            ),
            ariaLabel: label,
            title: label,
            onClick: toggle,
          },
          { type: "button", text: signIn.text, href: signIn.href },
          ...(apply
            ? [
                {
                  type: "button" as const,
                  variant: "primary-button" as const,
                  text: apply.text,
                  href: apply.href,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
