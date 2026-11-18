"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import FileUpload from "@cloudscape-design/components/file-upload";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { svg } from "@/components/icons";
import { useRouter } from "@/i18n/navigation";
import { moveGalleryPhoto } from "@/server/modules/website/actions";
const MAX_BYTES = 5 * 1024 * 1024;
type Item = { id: string; caption: string };

export function GalleryManager({
  slug,
  items,
}: {
  slug: string;
  items: Item[];
}) {
  const t = useTranslations("website.gallery");
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const file = files[0];
  const tooBig = Boolean(file && file.size > MAX_BYTES);

  async function move(id: string, by: -1 | 1) {
    setBusy(id);
    setError(null);
    const result = await moveGalleryPhoto({ id, by });
    setBusy(null);
    if (!result.ok) return setError(result.error.message);
    router.refresh();
  }

  async function send(id: string, init: RequestInit, url: string) {
    setBusy(id);
    setError(null);
    try {
      const result = (await (await fetch(url, init)).json()) as {
        ok: boolean;
        error?: { message: string };
      };
      if (result.ok) {
        setFiles([]);
        setCaption("");
        router.refresh();
      } else setError(result.error?.message ?? t("failed"));
    } catch {
      setError(t("failed"));
    }
    setBusy(null);
  }

  return (
    <Container
      header={
        <Header variant="h2" description={t("hint")}>
          {t("title")}
        </Header>
      }
    >
      <SpaceBetween size="l">
        <FormField
          label={t("photo")}
          errorText={error ?? (tooBig ? t("tooBig") : null)}
        >
          <SpaceBetween size="xs">
            <FileUpload
              value={files}
              accept=".jpg,.jpeg,.png,.webp"
              showFileSize
              i18nStrings={{
                uploadButtonText: () => t("choose"),
                dropzoneText: () => t("drop"),
                removeFileAriaLabel: () => t("removeFile"),
                limitShowFewer: t("showFewer"),
                limitShowMore: t("showMore"),
                errorIconAriaLabel: t("errorIcon"),
              }}
              onChange={({ detail }) => setFiles(detail.value.slice(-1))}
            />
            <Input
              value={caption}
              placeholder={t("captionPlaceholder")}
              onChange={({ detail }) => setCaption(detail.value)}
            />
            <div>
              <Button
                loading={busy === "add"}
                disabled={!file || tooBig}
                iconSvg={svg("upload")}
                onClick={() => {
                  const body = new FormData();
                  body.set("file", file as File);
                  body.set("caption", caption);
                  void send(
                    "add",
                    { method: "POST", body },
                    "/api/v1/website/gallery",
                  );
                }}
              >
                {t("upload")}
              </Button>
            </div>
          </SpaceBetween>
        </FormField>
        <Table
          variant="embedded"
          items={items}
          trackBy="id"
          columnDefinitions={[
            {
              id: "photo",
              header: t("columns.photo"),
              cell: (item) => (
                <img
                  src={`/api/site/${slug}/${item.id}`}
                  alt={item.caption}
                  width={64}
                  height={64}
                  className="vw-gallery-thumb"
                />
              ),
            },
            {
              id: "caption",
              header: t("columns.caption"),
              cell: (item) => item.caption || "-",
              isRowHeader: true,
            },
            {
              id: "remove",
              header: t("columns.actions"),
              cell: (item) => {
                const index = items.findIndex((other) => other.id === item.id);
                return (
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button
                      variant="icon"
                      iconSvg={svg("moveUp")}
                      disabled={index === 0 || busy !== null}
                      ariaLabel={t("moveUp", {
                        caption: item.caption || t("untitled"),
                      })}
                      onClick={() => void move(item.id, -1)}
                    />
                    <Button
                      variant="icon"
                      iconSvg={svg("moveDown")}
                      disabled={index === items.length - 1 || busy !== null}
                      ariaLabel={t("moveDown", {
                        caption: item.caption || t("untitled"),
                      })}
                      onClick={() => void move(item.id, 1)}
                    />
                    <Button
                      variant="inline-link"
                      loading={busy === item.id}
                      ariaLabel={t("removeLabel", {
                        caption: item.caption || t("untitled"),
                      })}
                      onClick={() =>
                        void send(
                          item.id,
                          { method: "DELETE" },
                          `/api/v1/website/gallery/${item.id}`,
                        )
                      }
                    >
                      {t("remove")}
                    </Button>
                  </SpaceBetween>
                );
              },
            },
          ]}
          empty={
            <Box textAlign="center" color="text-body-secondary">
              {t("empty")}
            </Box>
          }
        />
      </SpaceBetween>
    </Container>
  );
}
