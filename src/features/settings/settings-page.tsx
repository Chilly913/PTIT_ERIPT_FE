"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ConfirmDialog, Field, Input, PageHeader, Select,
  Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, useToast,
} from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { applyApiErrors } from "@/lib/form-errors";
import { messages } from "@/lib/messages";
import { ColorField } from "./color-field";
import { ImageField } from "./image-field";
import { settingsMessages as t } from "./messages";
import { SmtpPassword, type PasswordState } from "./smtp-password";
import {
  FORM_FIELDS, TAB_FIELDS, computeDiff, settingsSchema, toFormValues,
  type SettingsFormValues, type SettingsResponse, type TabId,
} from "./schema";
import { SocialLinksEditor } from "./social-links-editor";
import { useUnsavedGuard } from "./use-unsaved-guard";

const page = messages.admin.pages.settings;

export function SettingsPage() {
  const q = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api.get<SettingsResponse>("/admin/settings"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  return (
    <>
      <PageHeader title={page.title} description={page.description} />
      {q.isPending ? (
        <SettingsSkeleton />
      ) : q.isError ? (
        <Alert tone="danger" title={t.loadError}>
          <p>{q.error.message}</p>
          <Button className="mt-2" size="sm" variant="outline" onClick={() => q.refetch()} loading={q.isFetching}>
            {t.retry}
          </Button>
        </Alert>
      ) : (
        <SettingsForm initial={q.data} />
      )}
    </>
  );
}

function SettingsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label={messages.common.loading} className="space-y-4">
      <Skeleton className="h-10 w-full max-w-md" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsForm({ initial }: { initial: SettingsResponse }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [baseline, setBaseline] = useState(() => toFormValues(initial));
  const [hasPassword, setHasPassword] = useState(initial.secrets.smtp_password);
  const [pw, setPw] = useState<PasswordState>("keep");
  const [tab, setTab] = useState<TabId>("general");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    defaultValues: baseline,
    resolver: zodResolver(settingsSchema),
    mode: "onTouched",
  });
  const { register, control, handleSubmit, setError, clearErrors, reset, getValues, setValue, formState: { errors } } = form;
  const social = useFieldArray({ control, name: "social" });
  const current = useWatch({ control }) as SettingsFormValues;

  const diff = useMemo(() => computeDiff(baseline, { ...baseline, ...current, social: current.social ?? [] }, pw), [baseline, current, pw]);
  const changeCount = Object.keys(diff.settings).length + Object.keys(diff.secrets).length;
  const dirty = changeCount > 0;
  const guard = useUnsavedGuard(dirty);

  const tabDirty = (id: TabId) => TAB_FIELDS[id].some((f) => diff.fields.has(f));
  const tabErrors = (id: TabId) => TAB_FIELDS[id].some((f) => f in errors);

  // Re-run validation of a changed password field when the action changes.
  useEffect(() => {
    if (pw === "keep") clearErrors("smtp_password");
  }, [pw, clearErrors]);

  const save = useMutation({
    mutationFn: (body: { settings: typeof diff.settings; secrets: typeof diff.secrets }) => api.put<SettingsResponse>("/admin/settings", body),
    onSuccess: (res) => {
      const next = toFormValues(res);
      qc.setQueryData(["admin-settings"], res);
      setBaseline(next);
      setHasPassword(res.secrets.smtp_password);
      setPw("keep");
      reset(next);
      setFormError(null);
      toast.success(t.saved, t.savedDesc);
    },
    onError: (e) => {
      // Go names fields `settings.<key>` / `secrets.<key>`.
      let err: unknown = e;
      if (e instanceof ApiError && e.errors) {
        const mapped: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(e.errors)) {
          const key = k.replace(/^(settings|secrets)\./, "");
          mapped[key === "social_links" || key.startsWith("social_links.") ? "social" : key] = v;
        }
        err = new ApiError(e.status, e.message, { errors: mapped });
      }
      const left = applyApiErrors<SettingsFormValues>(err, setError as never, FORM_FIELDS);
      const bad = (Object.keys(TAB_FIELDS) as TabId[]).find((id) => (e instanceof ApiError && e.errors ? Object.keys(e.errors) : []).some((k) => (TAB_FIELDS[id] as readonly string[]).includes(k.replace(/^(settings|secrets)\./, "").replace(/^social_links.*/, "social"))));
      if (bad) setTab(bad);
      setFormError(left ?? (e instanceof ApiError && e.status === 422 ? null : e instanceof Error ? e.message : t.saveFailed));
      toast.error(t.saveFailed);
    },
  });

  const onValid = () => {
    if (pw === "change" && getValues("smtp_password") === "") {
      setTab("smtp");
      setError("smtp_password", { type: "validate", message: t.v.password });
      return;
    }
    setFormError(null);
    save.mutate({ settings: diff.settings, secrets: diff.secrets });
  };
  const onInvalid = (errs: typeof errors) => {
    const bad = (Object.keys(TAB_FIELDS) as TabId[]).find((id) => TAB_FIELDS[id].some((f) => f in errs));
    if (bad) setTab(bad);
  };

  const undo = () => {
    reset(baseline);
    setPw("keep");
    setFormError(null);
  };

  const err = (k: keyof SettingsFormValues) => (errors[k] as { message?: string } | undefined)?.message;
  const dot = (id: TabId) => (
    <>
      {tabErrors(id) ? (
        <span className="ml-1.5 inline-block size-2 rounded-full bg-danger align-middle" aria-hidden />
      ) : tabDirty(id) ? (
        <span className="ml-1.5 inline-block size-2 rounded-full bg-primary align-middle" aria-hidden />
      ) : null}
      {tabErrors(id) ? <span className="sr-only"> ({t.tabHasErrors})</span> : tabDirty(id) ? <span className="sr-only"> ({t.tabHasChanges})</span> : null}
    </>
  );

  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate aria-label={page.title}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
        <TabsList label={t.tabsLabel} className="overflow-y-hidden">
          <TabsTrigger value="general">{t.tabs.general}{dot("general")}</TabsTrigger>
          <TabsTrigger value="contact">{t.tabs.contact}{dot("contact")}</TabsTrigger>
          <TabsTrigger value="smtp">{t.tabs.smtp}{dot("smtp")}</TabsTrigger>
        </TabsList>

        {formError && <Alert tone="danger" className="mt-4">{formError}</Alert>}

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>{t.general.title}</CardTitle>
              <CardDescription>{t.general.description}</CardDescription>
            </CardHeader>
            <CardContent className="max-w-2xl space-y-5">
              <Field label={t.general.siteName} hint={t.general.siteNameHint} error={err("site_name")}>
                <Input maxLength={255} autoComplete="off" placeholder="ERIPT LMS" {...register("site_name")} />
              </Field>
              <Controller control={control} name="site_logo" render={({ field }) => (
                <ImageField label={t.general.logo} hint={t.general.imageHint} value={field.value} onChange={field.onChange} serverError={err("site_logo")} />
              )} />
              <Controller control={control} name="site_favicon" render={({ field }) => (
                <ImageField label={t.general.favicon} hint={t.general.imageHint} value={field.value} onChange={field.onChange} serverError={err("site_favicon")} />
              )} />
              <Controller control={control} name="primary_color" render={({ field }) => (
                <ColorField value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={err("primary_color")} />
              )} />
              <Field label={t.general.footerText} error={err("footer_text")}>
                <Textarea rows={3} maxLength={2000} {...register("footer_text")} />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>{t.contact.title}</CardTitle>
              <CardDescription>{t.contact.description}</CardDescription>
            </CardHeader>
            <CardContent className="max-w-2xl space-y-5">
              <Field label={t.contact.email} error={err("contact_email")}>
                <Input type="email" autoComplete="off" {...register("contact_email")} />
              </Field>
              <Field label={t.contact.phone} error={err("contact_phone")}>
                <Input type="tel" autoComplete="off" {...register("contact_phone")} />
              </Field>
              <Field label={t.contact.address} error={err("contact_address")}>
                <Textarea rows={2} maxLength={500} {...register("contact_address")} />
              </Field>
              <SocialLinksEditor
                fields={social.fields}
                register={register}
                append={social.append}
                remove={social.remove}
                errors={errors.social}
                rootError={(errors.social as { root?: { message?: string }; message?: string } | undefined)?.root?.message ?? (errors.social as { message?: string } | undefined)?.message}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smtp">
          <Card>
            <CardHeader>
              <CardTitle>{t.smtp.title}</CardTitle>
              <CardDescription>{t.smtp.description}</CardDescription>
            </CardHeader>
            <CardContent className="max-w-2xl space-y-5">
              <Alert tone="info">{t.smtp.notice}</Alert>
              <div className="grid gap-5 sm:grid-cols-[1fr_9rem]">
                <Field label={t.smtp.host} error={err("smtp_host")}>
                  <Input autoComplete="off" spellCheck={false} {...register("smtp_host")} />
                </Field>
                <Field label={t.smtp.port} error={err("smtp_port")}>
                  <Input inputMode="numeric" autoComplete="off" {...register("smtp_port")} />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t.smtp.username} error={err("smtp_username")}>
                  <Input autoComplete="off" {...register("smtp_username")} />
                </Field>
                <Field label={t.smtp.encryption} error={err("smtp_encryption")}>
                  <Select {...register("smtp_encryption")}>
                    {Object.entries(t.smtp.encryptionOptions).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t.smtp.fromAddress} error={err("mail_from_address")}>
                  <Input type="email" autoComplete="off" {...register("mail_from_address")} />
                </Field>
                <Field label={t.smtp.fromName} error={err("mail_from_name")}>
                  <Input autoComplete="off" {...register("mail_from_name")} />
                </Field>
              </div>
              <SmtpPassword
                hasPassword={hasPassword}
                state={pw}
                onState={(s) => {
                  setPw(s);
                  if (s !== "change") setValue("smtp_password", "");
                }}
                error={err("smtp_password")}
                inputProps={register("smtp_password")}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="h-20" aria-hidden />
      <div
        className={`sticky bottom-0 z-20 -mx-4 border-t border-border bg-surface px-4 py-3 shadow-md sm:-mx-6 sm:px-6 ${dirty ? "" : "hidden"}`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <p role="status" aria-live="polite" className="text-sm text-muted">
            {dirty ? t.unsavedCount(changeCount) : ""}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={undo} disabled={save.isPending}>{t.undo}</Button>
            <Button type="submit" loading={save.isPending}>{save.isPending ? t.saving : t.save}</Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={guard.pendingHref !== null}
        onClose={guard.cancel}
        onConfirm={guard.proceed}
        destructive
        title={t.leave.title}
        description={t.leave.description}
        confirmLabel={t.leave.confirm}
      />
    </form>
  );
}
