"use client";

import Alert from "@cloudscape-design/components/alert";
import Button from "@cloudscape-design/components/button";
import Checkbox from "@cloudscape-design/components/checkbox";
import Container from "@cloudscape-design/components/container";
import DatePicker from "@cloudscape-design/components/date-picker";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { svg } from "@/components/icons";

type Result =
  | { ok: true; data: { applicationNo: string } }
  | {
      ok: false;
      error: { message: string; fieldErrors?: Record<string, string> };
    };

const BLANK = {
  firstName: "",
  lastName: "",
  dob: "",
  gender: "",
  classId: "",
  previousSchool: "",
  guardianName: "",
  relation: "mother",
  phone: "",
  email: "",
  consent: false,
  website: "",
};
const GENDERS = ["female", "male", "other", "undisclosed"];
const RELATIONS = ["mother", "father", "guardian", "other"];
const today = new Date().toISOString().slice(0, 10);

export function ApplyForm({
  slug,
  classes,
}: {
  slug: string;
  classes: { id: string; name: string }[];
}) {
  const t = useTranslations("site.apply");
  const [values, setValues] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{
    message: string;
    fieldErrors?: Record<string, string>;
  } | null>(null);
  const [applicationNo, setApplicationNo] = useState<string | null>(null);
  const errors = error?.fieldErrors ?? {};
  const set = (key: keyof typeof BLANK, value: string | boolean) =>
    setValues((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/site/${slug}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          dob: values.dob,
          gender: values.gender,
          classId: values.classId,
          previousSchool: values.previousSchool,
          guardian: {
            name: values.guardianName,
            relation: values.relation,
            phone: values.phone,
            email: values.email,
          },
          consent: values.consent,
          website: values.website,
        }),
      });
      const result = (await response.json()) as Result;
      if (result.ok) setApplicationNo(result.data.applicationNo);
      else setError(result.error);
    } catch {
      setError({ message: t("failed") });
    }
    setBusy(false);
  }

  if (applicationNo !== null) {
    return (
      <Alert type="success" header={t("done.title")}>
        {applicationNo
          ? t("done.body", { number: applicationNo })
          : t("done.bodyNoNumber")}
      </Alert>
    );
  }

  const options = {
    gender: GENDERS.map((value) => ({
      value,
      label: t(`genders.${value}`),
    })),
    relation: RELATIONS.map((value) => ({
      value,
      label: t(`relations.${value}`),
    })),
    classId: classes.map((schoolClass) => ({
      value: schoolClass.id,
      label: schoolClass.name,
    })),
  };
  const pick = (key: "gender" | "relation" | "classId") =>
    options[key].find((option) => option.value === values[key]) ?? null;

  return (
    <form noValidate onSubmit={(event) => void submit(event)}>
      <Form
        errorText={error && !error.fieldErrors ? error.message : undefined}
        actions={
          <Button
            variant="primary"
            formAction="submit"
            loading={busy}
            loadingText={t("sending")}
            iconSvg={svg("send")}
          >
            {t("send")}
          </Button>
        }
      >
        <SpaceBetween size="l">
          <Container header={<Header variant="h2">{t("child")}</Header>}>
            <SpaceBetween size="m">
              <FormField label={t("firstName")} errorText={errors.firstName}>
                <Input
                  value={values.firstName}
                  autoComplete={false}
                  onChange={({ detail }) => set("firstName", detail.value)}
                />
              </FormField>
              <FormField label={t("lastName")} errorText={errors.lastName}>
                <Input
                  value={values.lastName}
                  autoComplete={false}
                  onChange={({ detail }) => set("lastName", detail.value)}
                />
              </FormField>
              <FormField
                label={t("dob")}
                constraintText={t("dobHint")}
                errorText={errors.dob}
              >
                <DatePicker
                  value={values.dob}
                  placeholder="YYYY/MM/DD"
                  isDateEnabled={(date) =>
                    date.toISOString().slice(0, 10) <= today
                  }
                  onChange={({ detail }) => set("dob", detail.value)}
                />
              </FormField>
              <FormField label={t("gender")} errorText={errors.gender}>
                <Select
                  selectedOption={pick("gender")}
                  options={options.gender}
                  placeholder={t("choose")}
                  onChange={({ detail }) =>
                    set("gender", detail.selectedOption.value ?? "")
                  }
                />
              </FormField>
              <FormField label={t("classSought")} errorText={errors.classId}>
                <Select
                  selectedOption={pick("classId")}
                  options={options.classId}
                  placeholder={t("choose")}
                  onChange={({ detail }) =>
                    set("classId", detail.selectedOption.value ?? "")
                  }
                />
              </FormField>
              <FormField
                label={t("previousSchool")}
                errorText={errors.previousSchool}
              >
                <Input
                  value={values.previousSchool}
                  autoComplete={false}
                  onChange={({ detail }) => set("previousSchool", detail.value)}
                />
              </FormField>
            </SpaceBetween>
          </Container>
          <Container header={<Header variant="h2">{t("guardian")}</Header>}>
            <SpaceBetween size="m">
              <FormField
                label={t("guardianName")}
                errorText={errors["guardian.name"]}
              >
                <Input
                  value={values.guardianName}
                  autoComplete="name"
                  onChange={({ detail }) => set("guardianName", detail.value)}
                />
              </FormField>
              <FormField label={t("relation")}>
                <Select
                  selectedOption={pick("relation")}
                  options={options.relation}
                  onChange={({ detail }) =>
                    set("relation", detail.selectedOption.value ?? "mother")
                  }
                />
              </FormField>
              <FormField
                label={t("phone")}
                constraintText={t("phoneHint")}
                errorText={errors["guardian.phone"]}
              >
                <Input
                  value={values.phone}
                  inputMode="tel"
                  autoComplete="tel-national"
                  onChange={({ detail }) => set("phone", detail.value)}
                />
              </FormField>
              <FormField
                label={t("email")}
                errorText={errors["guardian.email"]}
              >
                <Input
                  value={values.email}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  onChange={({ detail }) => set("email", detail.value)}
                />
              </FormField>
            </SpaceBetween>
          </Container>
          <div className="vw-site-honey" aria-hidden="true">
            <label htmlFor="apply-website">{t("honeypot")}</label>
            <input
              id="apply-website"
              tabIndex={-1}
              autoComplete="off"
              value={values.website}
              onChange={(event) => set("website", event.target.value)}
            />
          </div>
          <FormField errorText={errors.consent}>
            <Checkbox
              checked={values.consent}
              onChange={({ detail }) => set("consent", detail.checked)}
            >
              {t("consent")}
            </Checkbox>
          </FormField>
        </SpaceBetween>
      </Form>
    </form>
  );
}
