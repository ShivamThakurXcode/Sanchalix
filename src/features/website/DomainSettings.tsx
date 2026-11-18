"use client";

import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { saveDomain, verifyDomain } from "@/server/modules/website/actions";
import type { DomainInfo } from "@/server/modules/website/domain";

export function DomainSettings({ info }: { info: DomainInfo }) {
  const t = useTranslations("website.domain");
  const router = useRouter();
  const [domain, setDomain] = useState(info.domain);
  const [busy, setBusy] = useState<"save" | "verify" | null>(null);
  const [error, setError] = useState<{
    message: string;
    field?: string;
  } | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function run(kind: "save" | "verify") {
    setBusy(kind);
    setError(null);
    setDone(null);
    const result =
      kind === "save" ? await saveDomain({ domain }) : await verifyDomain();
    setBusy(null);
    if (!result.ok) {
      return setError({
        message: result.error.message,
        ...(result.error.fieldErrors?.domain && {
          field: result.error.fieldErrors.domain,
        }),
      });
    }
    setDone(t(kind === "save" ? "saved" : "verified"));
    router.refresh();
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
        {!info.enabled && <Alert type="info">{t("off")}</Alert>}
        {done && <Alert type="success">{done}</Alert>}
        {error && !error.field && <Alert type="error">{error.message}</Alert>}
        <FormField
          label={t("label")}
          description={t("labelHint")}
          errorText={error?.field}
        >
          <Input
            value={domain}
            disabled={!info.enabled}
            placeholder="www.example-school.in"
            onChange={({ detail }) => setDomain(detail.value)}
          />
        </FormField>
        <Button
          loading={busy === "save"}
          disabled={!info.enabled || domain === info.domain}
          onClick={() => void run("save")}
        >
          {t("save")}
        </Button>
        {info.enabled && info.domain && (
          <SpaceBetween size="s">
            <StatusIndicator type={info.verified ? "success" : "pending"}>
              {t(info.verified ? "statusVerified" : "statusPending")}
            </StatusIndicator>
            {!info.verified && (
              <SpaceBetween size="s">
                <Box>{t("steps")}</Box>
                <Box variant="code">
                  CNAME {info.domain} → {info.cname}
                </Box>
                <Box variant="code">
                  TXT {info.txtName} = {info.txtValue}
                </Box>
                <div>
                  <Button
                    loading={busy === "verify"}
                    onClick={() => void run("verify")}
                  >
                    {t("verify")}
                  </Button>
                </div>
              </SpaceBetween>
            )}
          </SpaceBetween>
        )}
      </SpaceBetween>
    </Container>
  );
}
