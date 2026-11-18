"use client";

import Alert from "@cloudscape-design/components/alert";
import Button from "@cloudscape-design/components/button";
import Checkbox from "@cloudscape-design/components/checkbox";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Multiselect from "@cloudscape-design/components/multiselect";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import Textarea from "@cloudscape-design/components/textarea";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { svg } from "@/components/icons";
import { useRouter } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/appError";
import { DomainSettings } from "./DomainSettings";
import { DownloadsManager } from "./DownloadsManager";
import { GalleryManager } from "./GalleryManager";
import { StaffPhotos } from "./StaffPhotos";
import { ListEditor } from "./ListEditor";
import {
  publishWebsite,
  updateWebsite,
} from "@/server/modules/website/actions";
import {
  COLOURS,
  type SectionKey,
  TEMPLATES,
} from "@/server/modules/website/palette";
import type { WebsiteEditor as Website } from "@/server/modules/website/service";

const FIELDS = [
  "slug",
  "template",
  "admissionsOpen",
  "applyClassIds",
  "colour",
  "headline",
  "subline",
  "about",
  "phone",
  "email",
  "staffIds",
  "programmes",
  "facilities",
  "testimonials",
  "pages",
  "sectionOrder",
  "sections",
] as const;
type Failure = { message: string; fieldErrors?: Record<string, string> };

export function WebsiteEditor({ website }: { website: Website }) {
  const t = useTranslations("website");
  const router = useRouter();
  const [form, setForm] = useState(
    () =>
      Object.fromEntries(FIELDS.map((key) => [key, website[key]])) as Pick<
        Website,
        (typeof FIELDS)[number]
      >,
  );
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);
  const [error, setError] = useState<Failure | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const live = website.status === "published";
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const fieldErrors = error?.fieldErrors ?? {};

  const move = (index: number, by: -1 | 1) => {
    const order = [...form.sectionOrder];
    const target = index + by;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [
      order[target] as SectionKey,
      order[index] as SectionKey,
    ];
    set("sectionOrder", order);
  };

  async function run(
    kind: "save" | "publish",
    call: () => Promise<ActionResult<unknown>>,
    done: string,
  ) {
    setBusy(kind);
    setError(null);
    setNotice(null);
    const result = await call();
    setBusy(null);
    if (!result.ok) return setError(result.error);
    setNotice(done);
    router.refresh();
  }

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description={
            <StatusIndicator type={live ? "success" : "stopped"}>
              {t(`status.${website.status}`)}
            </StatusIndicator>
          }
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                href={website.url}
                target="_blank"
                iconSvg={svg("website")}
              >
                {t(live ? "open" : "preview")}
              </Button>
              <Button
                loading={busy === "publish"}
                onClick={() =>
                  void run(
                    "publish",
                    () => publishWebsite({ published: !live }),
                    t(live ? "unpublished" : "published"),
                  )
                }
              >
                {t(live ? "unpublish" : "publish")}
              </Button>
            </SpaceBetween>
          }
        >
          {t("title")}
        </Header>
      }
    >
      <SpaceBetween size="l">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void run("save", () => updateWebsite(form), t("saved"));
          }}
        >
          <Form
            errorText={error?.message}
            actions={
              <Button variant="primary" loading={busy === "save"}>
                {t("save")}
              </Button>
            }
          >
            <SpaceBetween size="l">
              {notice && <Alert type="success">{notice}</Alert>}
              <Container
                header={<Header variant="h2">{t("content.title")}</Header>}
              >
                <SpaceBetween size="l">
                  <FormField
                    label={t("address.label")}
                    description={t("address.hint")}
                    errorText={fieldErrors.slug}
                  >
                    <Input
                      value={form.slug}
                      onChange={({ detail }) => set("slug", detail.value)}
                    />
                  </FormField>
                  <FormField
                    label={t("content.headline")}
                    errorText={fieldErrors.headline}
                  >
                    <Input
                      value={form.headline}
                      onChange={({ detail }) => set("headline", detail.value)}
                    />
                  </FormField>
                  <FormField
                    label={t("content.subline")}
                    errorText={fieldErrors.subline}
                  >
                    <Input
                      value={form.subline}
                      onChange={({ detail }) => set("subline", detail.value)}
                    />
                  </FormField>
                  <FormField
                    label={t("content.about")}
                    description={t("content.aboutHint")}
                    errorText={fieldErrors.about}
                  >
                    <Textarea
                      rows={6}
                      value={form.about}
                      onChange={({ detail }) => set("about", detail.value)}
                    />
                  </FormField>
                </SpaceBetween>
              </Container>
              <Container
                header={<Header variant="h2">{t("contact.title")}</Header>}
              >
                <ColumnLayout columns={2}>
                  <FormField
                    label={t("contact.phone")}
                    description={t("contact.phoneHint")}
                    errorText={fieldErrors.phone}
                  >
                    <Input
                      inputMode="tel"
                      value={form.phone}
                      onChange={({ detail }) => set("phone", detail.value)}
                    />
                  </FormField>
                  <FormField
                    label={t("contact.email")}
                    errorText={fieldErrors.email}
                  >
                    <Input
                      inputMode="email"
                      value={form.email}
                      onChange={({ detail }) => set("email", detail.value)}
                    />
                  </FormField>
                </ColumnLayout>
              </Container>
              <Container
                header={
                  <Header variant="h2" description={t("staff.hint")}>
                    {t("staff.title")}
                  </Header>
                }
              >
                <FormField
                  label={t("staff.label")}
                  errorText={fieldErrors.staffIds}
                >
                  <Multiselect
                    selectedOptions={website.staffOptions
                      .filter((member) => form.staffIds.includes(member.id))
                      .map((member) => ({
                        value: member.id,
                        label: member.name,
                        description: member.designation,
                      }))}
                    options={website.staffOptions.map((member) => ({
                      value: member.id,
                      label: member.name,
                      description: member.designation,
                    }))}
                    placeholder={t("staff.placeholder")}
                    empty={t("staff.empty")}
                    keepOpen
                    onChange={({ detail }) =>
                      set(
                        "staffIds",
                        detail.selectedOptions.flatMap((option) =>
                          option.value ? [option.value] : [],
                        ),
                      )
                    }
                  />
                </FormField>
              </Container>
              <Container
                header={
                  <Header variant="h2" description={t("lists.programmes.hint")}>
                    {t("lists.programmes.title")}
                  </Header>
                }
              >
                <ListEditor
                  name="programmes"
                  items={form.programmes}
                  max={8}
                  blank={{ title: "", text: "" }}
                  errors={fieldErrors}
                  texts={{
                    add: t("lists.add"),
                    remove: t("lists.remove"),
                    empty: t("lists.programmes.empty"),
                  }}
                  fields={[
                    { key: "title", label: t("lists.cardTitle") },
                    {
                      key: "text",
                      label: t("lists.cardText"),
                      multiline: true,
                    },
                  ]}
                  onChange={(items) => set("programmes", items)}
                />
              </Container>
              <Container
                header={
                  <Header variant="h2" description={t("lists.facilities.hint")}>
                    {t("lists.facilities.title")}
                  </Header>
                }
              >
                <ListEditor
                  name="facilities"
                  items={form.facilities}
                  max={12}
                  blank={{ title: "", text: "" }}
                  errors={fieldErrors}
                  texts={{
                    add: t("lists.add"),
                    remove: t("lists.remove"),
                    empty: t("lists.facilities.empty"),
                  }}
                  fields={[
                    { key: "title", label: t("lists.cardTitle") },
                    {
                      key: "text",
                      label: t("lists.cardText"),
                      multiline: true,
                    },
                  ]}
                  onChange={(items) => set("facilities", items)}
                />
              </Container>
              <Container
                header={
                  <Header
                    variant="h2"
                    description={t("lists.testimonials.hint")}
                  >
                    {t("lists.testimonials.title")}
                  </Header>
                }
              >
                <ListEditor
                  name="testimonials"
                  items={form.testimonials}
                  max={6}
                  blank={{ quote: "", by: "" }}
                  errors={fieldErrors}
                  texts={{
                    add: t("lists.add"),
                    remove: t("lists.remove"),
                    empty: t("lists.testimonials.empty"),
                  }}
                  fields={[
                    { key: "quote", label: t("lists.quote"), multiline: true },
                    { key: "by", label: t("lists.by") },
                  ]}
                  onChange={(items) => set("testimonials", items)}
                />
              </Container>
              <Container
                header={
                  <Header variant="h2" description={t("lists.pages.hint")}>
                    {t("lists.pages.title")}
                  </Header>
                }
              >
                <ListEditor
                  name="pages"
                  items={form.pages}
                  max={5}
                  blank={{ title: "", slug: "", body: "" }}
                  errors={fieldErrors}
                  texts={{
                    add: t("lists.add"),
                    remove: t("lists.remove"),
                    empty: t("lists.pages.empty"),
                  }}
                  fields={[
                    { key: "title", label: t("lists.pageTitle") },
                    { key: "slug", label: t("lists.pageSlug") },
                    {
                      key: "body",
                      label: t("lists.pageBody"),
                      multiline: true,
                    },
                  ]}
                  onChange={(items) => set("pages", items)}
                />
              </Container>
              <Container
                header={<Header variant="h2">{t("admissions.title")}</Header>}
              >
                <Checkbox
                  checked={form.admissionsOpen}
                  description={t("admissions.hint")}
                  onChange={({ detail }) =>
                    set("admissionsOpen", detail.checked)
                  }
                >
                  {t("admissions.label")}
                </Checkbox>
                {form.admissionsOpen && (
                  <FormField
                    label={t("admissions.classes")}
                    description={t("admissions.classesHint")}
                    errorText={fieldErrors.applyClassIds}
                  >
                    <Multiselect
                      selectedOptions={website.classOptions
                        .filter((item) => form.applyClassIds.includes(item.id))
                        .map((item) => ({ value: item.id, label: item.name }))}
                      options={website.classOptions.map((item) => ({
                        value: item.id,
                        label: item.name,
                      }))}
                      placeholder={t("admissions.classesAll")}
                      empty={t("admissions.classesEmpty")}
                      keepOpen
                      onChange={({ detail }) =>
                        set(
                          "applyClassIds",
                          detail.selectedOptions.flatMap((option) =>
                            option.value ? [option.value] : [],
                          ),
                        )
                      }
                    />
                  </FormField>
                )}
              </Container>
              <Container
                header={<Header variant="h2">{t("design.title")}</Header>}
              >
                <SpaceBetween size="l">
                  <FormField label={t("design.template")}>
                    <Select
                      selectedOption={{
                        value: form.template,
                        label: t(`templates.${form.template}`),
                      }}
                      options={TEMPLATES.map((template) => ({
                        value: template,
                        label: t(`templates.${template}`),
                        description: t(`templates.${template}Hint`),
                      }))}
                      onChange={({ detail }) =>
                        set(
                          "template",
                          detail.selectedOption.value as typeof form.template,
                        )
                      }
                    />
                  </FormField>
                  <FormField label={t("design.colour")}>
                    <Select
                      selectedOption={{
                        value: form.colour,
                        label: t(`colours.${form.colour}`),
                      }}
                      options={COLOURS.map((colour) => ({
                        value: colour,
                        label: t(`colours.${colour}`),
                      }))}
                      onChange={({ detail }) =>
                        set(
                          "colour",
                          detail.selectedOption.value as typeof form.colour,
                        )
                      }
                    />
                  </FormField>
                  <FormField
                    label={t("design.sections")}
                    description={t("design.sectionsHint")}
                  >
                    <SpaceBetween size="xs">
                      {form.sectionOrder.map((key, index) => (
                        <SpaceBetween
                          key={key}
                          direction="horizontal"
                          size="xs"
                          alignItems="center"
                        >
                          <Checkbox
                            checked={form.sections[key]}
                            onChange={({ detail }) =>
                              set("sections", {
                                ...form.sections,
                                [key]: detail.checked,
                              })
                            }
                          >
                            {t(`sections.${key}`)}
                          </Checkbox>
                          <Button
                            variant="icon"
                            iconSvg={svg("moveUp")}
                            disabled={index === 0}
                            ariaLabel={t("design.moveUp", {
                              section: t(`sections.${key}`),
                            })}
                            onClick={() => move(index, -1)}
                          />
                          <Button
                            variant="icon"
                            iconSvg={svg("moveDown")}
                            disabled={index === form.sectionOrder.length - 1}
                            ariaLabel={t("design.moveDown", {
                              section: t(`sections.${key}`),
                            })}
                            onClick={() => move(index, 1)}
                          />
                        </SpaceBetween>
                      ))}
                    </SpaceBetween>
                  </FormField>
                </SpaceBetween>
              </Container>
            </SpaceBetween>
          </Form>
        </form>
        <GalleryManager slug={website.slug} items={website.gallery} />
        <StaffPhotos
          slug={website.slug}
          teachers={website.staffOptions.filter((teacher) =>
            website.staffIds.includes(teacher.id),
          )}
          withPhoto={website.staffPhotoIds}
        />
        <DownloadsManager items={website.downloads} />
        <DomainSettings info={website.domain} />
        <Container
          header={
            <Header variant="h2" description={t("visits.hint")}>
              {t("visits.title")}
            </Header>
          }
        >
          <SpaceBetween size="l">
            <KeyValuePairs
              columns={4}
              items={[
                { label: t("visits.total"), value: website.visits.total },
                { label: t("visits.home"), value: website.visits.byKind.home },
                {
                  label: t("visits.apply"),
                  value: website.visits.byKind.apply,
                },
                {
                  label: t("visits.applications"),
                  value: website.visits.applications,
                },
              ]}
            />
            <Table
              variant="embedded"
              items={website.visits.days}
              trackBy="day"
              columnDefinitions={[
                {
                  id: "day",
                  header: t("visits.day"),
                  cell: (row) => row.day,
                  isRowHeader: true,
                },
                {
                  id: "count",
                  header: t("visits.views"),
                  cell: (row) => row.count,
                },
              ]}
            />
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
