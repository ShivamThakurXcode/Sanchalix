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

const MAX_BYTES = 5 * 1024 * 1024;
type Item = { id: string; title: string; size: number };

const size = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export function DownloadsManager({ items }: { items: Item[] }) {
  const t = useTranslations("website.downloads");
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const file = files[0];
  const tooBig = Boolean(file && file.size > MAX_BYTES);

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
        setTitle("");
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
          label={t("file")}
          errorText={error ?? (tooBig ? t("tooBig") : null)}
        >
          <SpaceBetween size="xs">
            <FileUpload
              value={files}
              accept=".pdf"
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
              value={title}
              placeholder={t("titlePlaceholder")}
              onChange={({ detail }) => setTitle(detail.value)}
            />
            <div>
              <Button
                loading={busy === "add"}
                disabled={!file || tooBig || title.trim() === ""}
                iconSvg={svg("upload")}
                onClick={() => {
                  const body = new FormData();
                  body.set("file", file as File);
                  body.set("title", title);
                  void send(
                    "add",
                    { method: "POST", body },
                    "/api/v1/website/downloads",
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
              id: "title",
              header: t("columns.title"),
              cell: (item) => item.title,
              isRowHeader: true,
            },
            {
              id: "size",
              header: t("columns.size"),
              cell: (item) => size(item.size),
            },
            {
              id: "remove",
              header: t("columns.actions"),
              cell: (item) => (
                <Button
                  variant="inline-link"
                  loading={busy === item.id}
                  ariaLabel={t("removeLabel", { title: item.title })}
                  onClick={() =>
                    void send(
                      item.id,
                      { method: "DELETE" },
                      `/api/v1/website/downloads/${item.id}`,
                    )
                  }
                >
                  {t("remove")}
                </Button>
              ),
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
