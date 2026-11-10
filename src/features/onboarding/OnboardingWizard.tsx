"use client";

import Alert from "@cloudscape-design/components/alert";
import AttributeEditor from "@cloudscape-design/components/attribute-editor";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import DatePicker from "@cloudscape-design/components/date-picker";
import FormField from "@cloudscape-design/components/form-field";
import Grid from "@cloudscape-design/components/grid";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Modal from "@cloudscape-design/components/modal";
import Multiselect from "@cloudscape-design/components/multiselect";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Wizard from "@cloudscape-design/components/wizard";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AppLink } from "@/components/AppLink";
import { svg } from "@/components/icons";
import { LogoUpload } from "@/features/settings/Settings";
import { useRouter } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/appError";
import { upsertClass, upsertSection } from "@/server/modules/academics/actions";
import { completeOnboarding } from "@/server/modules/onboarding/actions";
import type { getOnboarding } from "@/server/modules/onboarding/service";
import {
  updateAcademicYear,
  updateSchoolSettings,
  updateTerms,
} from "@/server/modules/settings/actions";
import { upsertSubject } from "@/server/modules/timetable/actions";

type Data = NonNullable<Awaited<ReturnType<typeof getOnboarding>>>;
type Failure = { message: string; fieldErrors?: Record<string, string> };
type ClassRow = { name: string; sections: string; capacity: string };
type SubjectRow = {
  name: string;
  code: string;
  type: "scholastic" | "co_scholastic";
};

const DAYS = [1, 2, 3, 4, 5, 6, 0];
const span = (columns: 2 | 3 | 5 | 6 | 7) => ({
  colspan: { default: 12 as const, m: columns },
});
const FEES_HREF = "/fees/structures";

export function OnboardingWizard({ data }: { data: Data }) {
  const t = useTranslations("onboarding");
  const tSettings = useTranslations("settings");
  const router = useRouter();
  const { settings } = data;
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const [school, setSchool] = useState({
    name: settings.name,
    affiliationNo: settings.affiliationNo,
    ...settings.address,
  });
  const [workingDays, setWorkingDays] = useState(settings.workingDays);
  const [year, setYear] = useState({
    startDate: settings.year?.startDate ?? "",
    endDate: settings.year?.endDate ?? "",
  });
  const [yearLabel, setYearLabel] = useState(settings.year?.label ?? "");
  const [terms, setTerms] = useState(settings.year?.terms ?? []);
  const [classes, setClasses] = useState(data.classes);
  const [classRows, setClassRows] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState(data.subjects);
  const [subjectRows, setSubjectRows] = useState<SubjectRow[]>([]);
  const errors = error?.fieldErrors ?? {};

  const fail = (result: Extract<ActionResult<unknown>, { ok: false }>) => {
    setError(result.error);
    return false;
  };

  async function saveProfile() {
    const result = await updateSchoolSettings({
      name: school.name,
      affiliationNo: school.affiliationNo,
      address: {
        line1: school.line1,
        city: school.city,
        state: school.state,
        pincode: school.pincode,
      },
      workingDays,
      shiftDueDates: settings.shiftDueDates,
    });
    return result.ok || fail(result);
  }

  async function saveYear() {
    const saved = await updateAcademicYear(year);
    if (!saved.ok) return fail(saved);
    setYearLabel(saved.data.label);
    const result = await updateTerms(terms);
    return result.ok || fail(result);
  }

  async function saveClasses() {
    let order = Math.max(0, ...classes.map((item) => item.order));
    for (const row of classRows) {
      order += 1;
      const created = await upsertClass({ name: row.name, order });
      if (!created.ok) return fail(created);
      const names = row.sections
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
      let made = 0;
      for (const name of names) {
        const section = await upsertSection({
          classId: created.data.id,
          name,
          capacity: row.capacity,
        });
        if (!section.ok) return fail(section);
        made += 1;
      }
      setClasses((current) => [
        ...current,
        { id: created.data.id, name: created.data.name, order, sections: made },
      ]);
      setClassRows((current) => current.slice(1));
    }
    return true;
  }

  async function saveSubjects() {
    for (const row of subjectRows) {
      const created = await upsertSubject(row);
      if (!created.ok) return fail(created);
      setSubjects((current) => [
        ...current,
        { ...row, id: row.code, isOptional: false },
      ]);
      setSubjectRows((current) => current.slice(1));
    }
    return true;
  }

  async function leave(requested: number) {
    if (requested < step) return setStep(requested);
    setBusy(true);
    setError(null);
    const saved = [saveProfile, saveYear, saveClasses, saveSubjects][step];
    if (!saved || (await saved())) setStep(requested);
    setBusy(false);
  }

  async function finish() {
    setBusy(true);
    setError(null);
    const result = await completeOnboarding();
    if (!result.ok) {
      fail(result);
      return setBusy(false);
    }
    setOpen(false);
    router.refresh();
  }

  const text = (name: keyof typeof school, path: string = name) => (
    <FormField label={tSettings(`school.${name}`)} errorText={errors[path]}>
      <Input
        value={school[name]}
        autoComplete={false}
        {...(name === "pincode" && { inputMode: "numeric" as const })}
        onChange={({ detail }) =>
          setSchool({ ...school, [name]: detail.value })
        }
      />
    </FormField>
  );
  const dayOptions = DAYS.map((value) => ({
    value: String(value),
    label: tSettings(`days.${value}`),
  }));
  const typeOptions = (["scholastic", "co_scholastic"] as const).map(
    (value) => ({ value, label: t(`subjects.type.${value}`) }),
  );
  const inYear = (date: Date) => {
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return day >= year.startDate && day <= year.endDate;
  };

  return (
    <SpaceBetween size="l">
      {!open && (
        <Alert
          type="info"
          header={t("banner.title")}
          action={
            <Button iconSvg={svg("school")} onClick={() => setOpen(true)}>
              {t("banner.resume")}
            </Button>
          }
        >
          {t("banner.body")}
        </Alert>
      )}
      <Modal
        visible={open}
        size="max"
        header={t("title")}
        onDismiss={() => setOpen(false)}
      >
        <div data-onboarding>
          <SpaceBetween size="m">
            <Box color="text-body-secondary">{t("intro")}</Box>
            {error && (
              <Alert type="error" header={t("failed")}>
                {error.message}
              </Alert>
            )}
            <Wizard
              activeStepIndex={step}
              isLoadingNextStep={busy}
              submitButtonText={t("finish")}
              i18nStrings={{
                stepNumberLabel: (number) => t("step", { number }),
                collapsedStepsLabel: (number, total) =>
                  t("stepOf", { number, total }),
                navigationAriaLabel: t("steps"),
                cancelButton: t("later"),
                previousButton: t("previous"),
                nextButton: t("next"),
                optional: t("optional"),
              }}
              onCancel={() => setOpen(false)}
              onSubmit={() => void finish()}
              onNavigate={({ detail }) => {
                if (!busy) void leave(detail.requestedStepIndex);
              }}
              steps={[
                {
                  title: t("profile.title"),
                  description: t("profile.description"),
                  content: (
                    <SpaceBetween size="xl">
                      <Container
                        header={
                          <Header variant="h3">{t("profile.details")}</Header>
                        }
                      >
                        <Grid
                          gridDefinition={[
                            span(6),
                            span(6),
                            span(6),
                            span(2),
                            span(2),
                            span(2),
                          ]}
                        >
                          {text("name")}
                          {text("affiliationNo")}
                          {text("line1", "address.line1")}
                          {text("city", "address.city")}
                          {text("state", "address.state")}
                          {text("pincode", "address.pincode")}
                        </Grid>
                      </Container>
                      <Grid gridDefinition={[span(7), span(5)]}>
                        <Container
                          header={
                            <Header variant="h3">
                              {t("profile.schedule")}
                            </Header>
                          }
                          fitHeight
                        >
                          <FormField
                            label={tSettings("workingDays.label")}
                            description={tSettings("workingDays.description")}
                            errorText={errors.workingDays}
                          >
                            <Multiselect
                              selectedOptions={dayOptions.filter((option) =>
                                workingDays.includes(Number(option.value)),
                              )}
                              options={dayOptions}
                              placeholder={tSettings("workingDays.placeholder")}
                              onChange={({ detail }) =>
                                setWorkingDays(
                                  detail.selectedOptions.map((option) =>
                                    Number(option.value),
                                  ),
                                )
                              }
                            />
                          </FormField>
                        </Container>
                        <Container
                          header={
                            <Header variant="h3">{t("profile.brand")}</Header>
                          }
                          fitHeight
                        >
                          <LogoUpload hasLogo={settings.hasLogo} />
                        </Container>
                      </Grid>
                    </SpaceBetween>
                  ),
                },
                {
                  title: t("year.title"),
                  description: t("year.description", { year: yearLabel }),
                  content: (
                    <SpaceBetween size="l">
                      <Container
                        header={<Header variant="h3">{t("year.dates")}</Header>}
                      >
                        <Grid gridDefinition={[span(3), span(3), span(6)]}>
                          {(["startDate", "endDate"] as const).map((key) => (
                            <FormField
                              key={key}
                              label={t(`year.${key}`)}
                              errorText={errors[key]}
                            >
                              <DatePicker
                                value={year[key]}
                                placeholder="YYYY/MM/DD"
                                onChange={({ detail }) =>
                                  setYear({ ...year, [key]: detail.value })
                                }
                              />
                            </FormField>
                          ))}
                          <FormField label={t("year.label")}>
                            <Box variant="awsui-value-large">{yearLabel}</Box>
                          </FormField>
                        </Grid>
                      </Container>
                      <AttributeEditor
                        items={terms}
                        addButtonText={tSettings("terms.add")}
                        removeButtonText={tSettings("terms.remove")}
                        removeButtonAriaLabel={(item) =>
                          tSettings("terms.removeLabel", {
                            name: item.name || tSettings("terms.unnamed"),
                          })
                        }
                        disableAddButton={terms.length >= 6}
                        empty={tSettings("terms.empty")}
                        onAddButtonClick={() =>
                          setTerms([
                            ...terms,
                            { name: "", startDate: "", endDate: "" },
                          ])
                        }
                        onRemoveButtonClick={({ detail }) =>
                          setTerms(
                            terms.filter(
                              (_, index) => index !== detail.itemIndex,
                            ),
                          )
                        }
                        definition={[
                          {
                            label: tSettings("terms.name"),
                            errorText: (_: unknown, index: number) =>
                              errors[`${index}.name`],
                            control: (
                              term: (typeof terms)[number],
                              index: number,
                            ) => (
                              <Input
                                value={term.name}
                                placeholder={tSettings("terms.namePlaceholder")}
                                onChange={({ detail }) =>
                                  setTerms(
                                    terms.map((item, at) =>
                                      at === index
                                        ? { ...item, name: detail.value }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            ),
                          },
                          ...(["startDate", "endDate"] as const).map((key) => ({
                            label: tSettings(`terms.${key}`),
                            errorText: (_: unknown, index: number) =>
                              errors[`${index}.${key}`],
                            control: (
                              term: (typeof terms)[number],
                              index: number,
                            ) => (
                              <DatePicker
                                value={term[key]}
                                placeholder="YYYY/MM/DD"
                                isDateEnabled={inYear}
                                onChange={({ detail }) =>
                                  setTerms(
                                    terms.map((item, at) =>
                                      at === index
                                        ? { ...item, [key]: detail.value }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            ),
                          })),
                        ]}
                      />
                    </SpaceBetween>
                  ),
                },
                {
                  title: t("classes.title"),
                  description: t("classes.description"),
                  isOptional: true,
                  content: (
                    <SpaceBetween size="l">
                      {classes.length === 0 ? (
                        <Box color="text-body-secondary">
                          {t("classes.empty")}
                        </Box>
                      ) : (
                        <SpaceBetween size="xs">
                          {classes.map((item) => (
                            <StatusIndicator key={item.id} type="success">
                              {t("classes.done", {
                                name: item.name,
                                count: item.sections,
                              })}
                            </StatusIndicator>
                          ))}
                        </SpaceBetween>
                      )}
                      <AttributeEditor
                        items={classRows}
                        addButtonText={t("classes.add")}
                        removeButtonText={t("remove")}
                        removeButtonAriaLabel={(item) =>
                          t("classes.removeLabel", {
                            name: item.name || t("classes.unnamed"),
                          })
                        }
                        empty={t("classes.noneNew")}
                        onAddButtonClick={() =>
                          setClassRows([
                            ...classRows,
                            { name: "", sections: "A", capacity: "40" },
                          ])
                        }
                        onRemoveButtonClick={({ detail }) =>
                          setClassRows(
                            classRows.filter(
                              (_, index) => index !== detail.itemIndex,
                            ),
                          )
                        }
                        definition={[
                          {
                            label: t("classes.name"),
                            control: (row: ClassRow, index: number) => (
                              <Input
                                value={row.name}
                                placeholder={t("classes.namePlaceholder")}
                                onChange={({ detail }) =>
                                  setClassRows(
                                    classRows.map((item, at) =>
                                      at === index
                                        ? { ...item, name: detail.value }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            ),
                          },
                          {
                            label: t("classes.sections"),
                            constraintText: t("classes.sectionsHint"),
                            control: (row: ClassRow, index: number) => (
                              <Input
                                value={row.sections}
                                onChange={({ detail }) =>
                                  setClassRows(
                                    classRows.map((item, at) =>
                                      at === index
                                        ? { ...item, sections: detail.value }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            ),
                          },
                          {
                            label: t("classes.capacity"),
                            control: (row: ClassRow, index: number) => (
                              <Input
                                value={row.capacity}
                                inputMode="numeric"
                                onChange={({ detail }) =>
                                  setClassRows(
                                    classRows.map((item, at) =>
                                      at === index
                                        ? { ...item, capacity: detail.value }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            ),
                          },
                        ]}
                      />
                    </SpaceBetween>
                  ),
                },
                {
                  title: t("subjects.title"),
                  description: t("subjects.description"),
                  isOptional: true,
                  content: (
                    <SpaceBetween size="l">
                      {subjects.length === 0 ? (
                        <Box color="text-body-secondary">
                          {t("subjects.empty")}
                        </Box>
                      ) : (
                        <SpaceBetween size="xs">
                          {subjects.map((item) => (
                            <StatusIndicator key={item.code} type="success">
                              {t("subjects.done", {
                                name: item.name,
                                code: item.code,
                              })}
                            </StatusIndicator>
                          ))}
                        </SpaceBetween>
                      )}
                      <AttributeEditor
                        items={subjectRows}
                        addButtonText={t("subjects.add")}
                        removeButtonText={t("remove")}
                        removeButtonAriaLabel={(item) =>
                          t("subjects.removeLabel", {
                            name: item.name || t("subjects.unnamed"),
                          })
                        }
                        empty={t("subjects.noneNew")}
                        onAddButtonClick={() =>
                          setSubjectRows([
                            ...subjectRows,
                            { name: "", code: "", type: "scholastic" },
                          ])
                        }
                        onRemoveButtonClick={({ detail }) =>
                          setSubjectRows(
                            subjectRows.filter(
                              (_, index) => index !== detail.itemIndex,
                            ),
                          )
                        }
                        definition={[
                          {
                            label: t("subjects.name"),
                            control: (row: SubjectRow, index: number) => (
                              <Input
                                value={row.name}
                                placeholder={t("subjects.namePlaceholder")}
                                onChange={({ detail }) =>
                                  setSubjectRows(
                                    subjectRows.map((item, at) =>
                                      at === index
                                        ? { ...item, name: detail.value }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            ),
                          },
                          {
                            label: t("subjects.code"),
                            control: (row: SubjectRow, index: number) => (
                              <Input
                                value={row.code}
                                placeholder={t("subjects.codePlaceholder")}
                                onChange={({ detail }) =>
                                  setSubjectRows(
                                    subjectRows.map((item, at) =>
                                      at === index
                                        ? { ...item, code: detail.value }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            ),
                          },
                          {
                            label: t("subjects.typeLabel"),
                            control: (row: SubjectRow, index: number) => (
                              <Select
                                selectedOption={
                                  typeOptions.find(
                                    (option) => option.value === row.type,
                                  ) ?? null
                                }
                                options={typeOptions}
                                onChange={({ detail }) =>
                                  setSubjectRows(
                                    subjectRows.map((item, at) =>
                                      at === index
                                        ? {
                                            ...item,
                                            type: detail.selectedOption
                                              .value as SubjectRow["type"],
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            ),
                          },
                        ]}
                      />
                    </SpaceBetween>
                  ),
                },
                {
                  title: t("review.title"),
                  description: t("review.description"),
                  content: (
                    <SpaceBetween size="l">
                      <KeyValuePairs
                        columns={4}
                        items={[
                          { label: t("review.school"), value: school.name },
                          { label: t("review.year"), value: yearLabel },
                          {
                            label: t("review.classes"),
                            value: String(classes.length),
                          },
                          {
                            label: t("review.subjects"),
                            value: String(subjects.length),
                          },
                        ]}
                      />
                      <Alert type="info" header={t("review.fees.title")}>
                        {t("review.fees.body")}{" "}
                        <AppLink href={FEES_HREF}>
                          {t("review.fees.link")}
                        </AppLink>
                      </Alert>
                      <Box color="text-body-secondary">{t("review.later")}</Box>
                    </SpaceBetween>
                  ),
                },
              ]}
            />
          </SpaceBetween>
        </div>
      </Modal>
    </SpaceBetween>
  );
}
