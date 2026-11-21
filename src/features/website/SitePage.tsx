import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Box from "@cloudscape-design/components/box";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import type { PublicSite } from "@/server/modules/website/public";
import { siteBase } from "@/server/modules/website/slug";
import { SiteFrame } from "./SiteFrame";

/** Every page but the home page: a breadcrumb and the page's title above its content. */
export async function SitePage({
  site,
  title,
  parent,
  children,
}: {
  site: PublicSite;
  title: string;
  parent?: { href: string; text: string };
  children: ReactNode;
}) {
  const t = await getTranslations("site");
  const home = siteBase(site.slug) || "/";
  return (
    <SiteFrame site={site}>
      <ContentLayout
        defaultPadding
        disableOverlap
        maxContentWidth={1040}
        header={
          <Box padding={{ vertical: "l" }}>
            <SpaceBetween size="s">
              <BreadcrumbGroup
                ariaLabel={t("breadcrumb")}
                items={[
                  { text: t("nav.homeShort"), href: home },
                  ...(parent ? [parent] : []),
                  { text: title, href: "#" },
                ]}
              />
              <Header variant="h1">{title}</Header>
            </SpaceBetween>
          </Box>
        }
      >
        <Box padding={{ bottom: "xxl" }}>{children}</Box>
      </ContentLayout>
    </SiteFrame>
  );
}
