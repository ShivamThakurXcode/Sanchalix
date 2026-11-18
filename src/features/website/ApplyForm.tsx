"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

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

// ADR-030: part of the public school site, so plain HTML controls rather than Cloudscape.
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
      <div role="status" className="vw-site-done">
        <h2>{t("done.title")}</h2>
        <p>
          {applicationNo
            ? t("done.body", { number: applicationNo })
            : t("done.bodyNoNumber")}
        </p>
      </div>
    );
  }

  const field = (
    key: keyof typeof BLANK,
    label: string,
    props: {
      type?: string;
      required?: boolean;
      autoComplete?: string;
      hint?: string;
      inputMode?: "tel" | "email";
    } = {},
  ) => {
    const id = `apply-${key}`;
    const errorKey =
      key === "guardianName"
        ? "guardian.name"
        : key === "phone"
          ? "guardian.phone"
          : key === "email"
            ? "guardian.email"
            : key;
    return (
      <div className="vw-site-field">
        <label htmlFor={id}>{label}</label>
        {props.hint && <span id={`${id}-hint`}>{props.hint}</span>}
        <input
          id={id}
          value={String(values[key])}
          onChange={(event) => set(key, event.target.value)}
          aria-invalid={Boolean(errors[errorKey])}
          aria-describedby={
            [props.hint && `${id}-hint`, errors[errorKey] && `${id}-error`]
              .filter(Boolean)
              .join(" ") || undefined
          }
          {...props}
        />
        {errors[errorKey] && (
          <span id={`${id}-error`} className="vw-site-error">
            {errors[errorKey]}
          </span>
        )}
      </div>
    );
  };

  return (
    <form
      className="vw-site-form"
      noValidate
      onSubmit={(event) => void submit(event)}
    >
      {error && !error.fieldErrors && (
        <p role="alert" className="vw-site-error">
          {error.message}
        </p>
      )}
      <fieldset>
        <legend>{t("child")}</legend>
        {field("firstName", t("firstName"), {
          required: true,
          autoComplete: "off",
        })}
        {field("lastName", t("lastName"), { autoComplete: "off" })}
        {field("dob", t("dob"), { type: "date", required: true })}
        <div className="vw-site-field">
          <label htmlFor="apply-gender">{t("gender")}</label>
          <select
            id="apply-gender"
            value={values.gender}
            required
            onChange={(event) => set("gender", event.target.value)}
            aria-invalid={Boolean(errors.gender)}
          >
            <option value="" disabled>
              {t("choose")}
            </option>
            {["female", "male", "other", "undisclosed"].map((value) => (
              <option key={value} value={value}>
                {t(`genders.${value}`)}
              </option>
            ))}
          </select>
          {errors.gender && (
            <span className="vw-site-error">{errors.gender}</span>
          )}
        </div>
        <div className="vw-site-field">
          <label htmlFor="apply-classId">{t("classSought")}</label>
          <select
            id="apply-classId"
            value={values.classId}
            required
            onChange={(event) => set("classId", event.target.value)}
            aria-invalid={Boolean(errors.classId)}
          >
            <option value="" disabled>
              {t("choose")}
            </option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name}
              </option>
            ))}
          </select>
          {errors.classId && (
            <span className="vw-site-error">{errors.classId}</span>
          )}
        </div>
        {field("previousSchool", t("previousSchool"), { autoComplete: "off" })}
      </fieldset>
      <fieldset>
        <legend>{t("guardian")}</legend>
        {field("guardianName", t("guardianName"), {
          required: true,
          autoComplete: "name",
        })}
        <div className="vw-site-field">
          <label htmlFor="apply-relation">{t("relation")}</label>
          <select
            id="apply-relation"
            value={values.relation}
            onChange={(event) => set("relation", event.target.value)}
          >
            {["mother", "father", "guardian", "other"].map((value) => (
              <option key={value} value={value}>
                {t(`relations.${value}`)}
              </option>
            ))}
          </select>
        </div>
        {field("phone", t("phone"), {
          type: "tel",
          required: true,
          autoComplete: "tel-national",
          inputMode: "tel",
          hint: t("phoneHint"),
        })}
        {field("email", t("email"), {
          type: "email",
          autoComplete: "email",
          inputMode: "email",
        })}
      </fieldset>
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
      <div className="vw-site-field">
        <label className="vw-site-check">
          <input
            type="checkbox"
            checked={values.consent}
            onChange={(event) => set("consent", event.target.checked)}
            aria-invalid={Boolean(errors.consent)}
          />
          {t("consent")}
        </label>
        {errors.consent && (
          <span className="vw-site-error">{errors.consent}</span>
        )}
      </div>
      <button type="submit" className="vw-site-button" disabled={busy}>
        {busy ? t("sending") : t("send")}
      </button>
    </form>
  );
}
