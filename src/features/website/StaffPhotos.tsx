"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import FileUpload from "@cloudscape-design/components/file-upload";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { svg } from "@/components/icons";
import { useRouter } from "@/i18n/navigation";

const MAX_BYTES = 5 * 1024 * 1024;
type Teacher = { id: string; name: string; designation: string };

/** Pictures for the teachers already saved on the website. A teacher not chosen above has nothing to show them on. */
export function StaffPhotos({
  slug,
  teachers,
  withPhoto,
}: {
  slug: string;
  teachers: Teacher[];
  withPhoto: string[];
}) {
  const t = useTranslations("website.staffPhotos");
  const router = useRouter();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const file = files[0];
  const tooBig = Boolean(file && file.size > MAX_BYTES);
  const options = teachers.map((teacher) => ({
    value: teacher.id,
    label: teacher.name,
    description: teacher.designation,
  }));
  const shown = teachers.filter((teacher) => withPhoto.includes(teacher.id));

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
        setTeacherId(null);
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
          label={t("teacher")}
          errorText={error ?? (tooBig ? t("tooBig") : null)}
        >
          <SpaceBetween size="xs">
            <Select
              selectedOption={
                options.find((o) => o.value === teacherId) ?? null
              }
              options={options}
              placeholder={t("choose")}
              empty={t("none")}
              onChange={({ detail }) =>
                setTeacherId(detail.selectedOption.value ?? null)
              }
            />
            <FileUpload
              value={files}
              accept=".jpg,.jpeg,.png,.webp"
              showFileSize
              i18nStrings={{
                uploadButtonText: () => t("chooseFile"),
                dropzoneText: () => t("drop"),
                removeFileAriaLabel: () => t("removeFile"),
                limitShowFewer: t("showFewer"),
                limitShowMore: t("showMore"),
                errorIconAriaLabel: t("errorIcon"),
              }}
              onChange={({ detail }) => setFiles(detail.value.slice(-1))}
            />
            <div>
              <Button
                loading={busy === "add"}
                disabled={!file || !teacherId || tooBig}
                iconSvg={svg("upload")}
                onClick={() => {
                  const body = new FormData();
                  body.set("file", file as File);
                  body.set("staffId", teacherId as string);
                  void send(
                    "add",
                    { method: "POST", body },
                    "/api/v1/website/staff-photo",
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
          items={shown}
          trackBy="id"
          columnDefinitions={[
            {
              id: "photo",
              header: t("columns.photo"),
              cell: (teacher) => (
                <img
                  src={`/api/site/${slug}/staff-${teacher.id}`}
                  alt=""
                  width={48}
                  height={48}
                  className="vw-gallery-thumb"
                />
              ),
            },
            {
              id: "name",
              header: t("columns.name"),
              cell: (teacher) => teacher.name,
              isRowHeader: true,
            },
            {
              id: "remove",
              header: t("columns.actions"),
              cell: (teacher) => (
                <Button
                  variant="inline-link"
                  loading={busy === teacher.id}
                  ariaLabel={t("removeLabel", { name: teacher.name })}
                  onClick={() =>
                    void send(
                      teacher.id,
                      { method: "DELETE" },
                      `/api/v1/website/staff-photo/${teacher.id}`,
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
