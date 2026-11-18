import { getTranslations } from "next-intl/server";
import { WebsiteEditor } from "@/features/website/WebsiteEditor";
import { getWebsite } from "@/server/modules/website/service";
import { pageContext } from "../pageContext";

export async function generateMetadata() {
  const t = await getTranslations("website");
  return { title: t("title") };
}

export default async function WebsitePage() {
  const ctx = await pageContext("website.manage");
  return <WebsiteEditor website={await getWebsite(ctx)} />;
}
