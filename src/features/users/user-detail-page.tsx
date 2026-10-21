"use client";

import { DateTimePicker } from "@/components/ui/date-time-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useSession } from "@/components/providers/session-provider";
import {
  Alert,
  Avatar,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from "@/components/ui";
import { applyApiErrors } from "@/lib/form-errors";
import { useRoleList, useUser, useUserMutations } from "./api";
import { usersMessages as m } from "./messages";
import { UserRolesDialog } from "./roles-dialog";
import { EDIT_FIELDS, editUserSchema, type EditUserValues } from "./schemas";
import type { AdminUserDetail } from "./types";
import { UserActionConfirm, type ConfirmTarget } from "./user-action-confirm";
import { formatDateTime, roleLabelMap, RoleBadges, StatusBadge } from "./user-parts";
import { ArrowLeftIcon, KeyIcon, LockIcon, MailIcon, TrashIcon, UnlockIcon } from "@/components/icons";

const NULLABLE = ["phone", "student_code", "staff_code", "gender", "date_of_birth", "hometown", "permanent_address", "id_card_number", "bio"];

function toForm(u: AdminUserDetail): EditUserValues {
  const p = u.profile;
  return {
    name: u.name,
    email: u.email,
    user_type: u.user_type,
    phone: u.phone ?? "",
    student_code: u.student_code ?? "",
    staff_code: u.staff_code ?? "",
    gender: p.gender ?? "",
    date_of_birth: p.date_of_birth ?? "",
    hometown: p.hometown ?? "",
    permanent_address: p.permanent_address ?? "",
    nationality: p.nationality ?? "",
    id_card_number: p.id_card_number ?? "",
    bio: p.bio ?? "",
  };
}

export function UserDetailPage({ id }: { id: string }) {
  const q = useUser(id);

  if (q.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Alert tone="danger" title={m.detail.loadError}>
          {q.error.message}
        </Alert>
      </div>
    );
  }
  return <Detail user={q.data} />;
}

function BackLink() {
  return (
    <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
      <ArrowLeftIcon className="size-4" aria-hidden /> {m.detail.back}
    </Link>
  );
}

function Detail({ user }: { user: AdminUserDetail }) {
  const { user: me } = useSession();
  const router = useRouter();
  const toast = useToast();
  const { update } = useUserMutations();
  const rolesQuery = useRoleList();
  const labels = useMemo(() => roleLabelMap(rolesQuery.data), [rolesQuery.data]);
  const [formError, setFormError] = useState<string | null>(null);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const self = user.id === me.id;
  const d = m.detail;

  const form = useForm<EditUserValues>({ resolver: zodResolver(editUserSchema), defaultValues: toForm(user) });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, dirtyFields, isDirty },
  } = form;

  // After a save (or external refresh) the server copy becomes the new baseline.
  const stamp = user.profile.updated_at;
  useEffect(() => {
    reset(toForm(user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, user.name, user.email]);

  // Unsaved-changes guard for reload / tab close.
  useEffect(() => {
    if (!isDirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [isDirty]);

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    const body: Record<string, unknown> = {};
    for (const key of EDIT_FIELDS) {
      if (!dirtyFields[key]) continue;
      const val = v[key];
      body[key] = NULLABLE.includes(key) && val === "" ? null : val;
    }
    if (!Object.keys(body).length) return;
    try {
      await update.mutateAsync({ id: user.id, body });
      toast.success(m.toast.saved);
    } catch (e) {
      setFormError(applyApiErrors(e, setError, EDIT_FIELDS));
    }
  });

  const p = user.profile;
  const busy = update.isPending;

  return (
    <>
      <BackLink />
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={user.name} src={user.avatar} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">{user.name}</h1>
            <p className="flex flex-wrap items-center gap-2 text-muted">
              <span className="truncate">{user.email}</span>
              <StatusBadge user={user} />
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setRolesOpen(true)}>
            <KeyIcon className="size-4" aria-hidden /> {d.changeRoles}
          </Button>
          <Button variant="outline" onClick={() => setConfirm({ kind: "reset", user })}>
            <MailIcon className="size-4" aria-hidden /> {m.actions.resetPassword}
          </Button>
          <Button variant="outline" disabled={self && !user.disabled} onClick={() => setConfirm({ kind: user.disabled ? "enable" : "disable", user })}>
            {user.disabled ? <UnlockIcon className="size-4" aria-hidden /> : <LockIcon className="size-4" aria-hidden />}
            {user.disabled ? m.actions.enable : m.actions.disable}
          </Button>
          <Button variant="danger" disabled={self} onClick={() => setConfirm({ kind: "delete", user })}>
            <TrashIcon className="size-4" aria-hidden /> {m.actions.delete}
          </Button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {formError && <Alert tone="danger">{formError}</Alert>}
          <Card>
            <CardHeader>
              <CardTitle>{d.account}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label={m.create.name} required error={errors.name?.message}>
                <Input autoComplete="off" {...register("name")} />
              </Field>
              <Field label={m.create.email} required error={errors.email?.message}>
                <Input type="email" autoComplete="off" {...register("email")} />
              </Field>
              <Field label={m.create.userType} required error={errors.user_type?.message}>
                <Select {...register("user_type")}>
                  {Object.entries(m.userTypes).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </Select>
              </Field>
              <Field label={m.create.phone} error={errors.phone?.message}>
                <Input type="tel" autoComplete="off" {...register("phone")} />
              </Field>
              <Field label={m.create.studentCode} error={errors.student_code?.message}>
                <Input autoComplete="off" {...register("student_code")} />
              </Field>
              <Field label={m.create.staffCode} error={errors.staff_code?.message}>
                <Input autoComplete="off" {...register("staff_code")} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{d.profile}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label={d.gender} error={errors.gender?.message}>
                <Select {...register("gender")}>
                  <option value="">{d.genderNone}</option>
                  <option value="male">{d.genders.male}</option>
                  <option value="female">{d.genders.female}</option>
                  <option value="other">{d.genders.other}</option>
                </Select>
              </Field>
              <Field label={d.dob} error={errors.date_of_birth?.message}>
                <Controller control={control} name="date_of_birth" render={({ field }) => <DateTimePicker mode="date" value={field.value ?? ""} onChange={field.onChange} aria-label={d.dob} />} />
              </Field>
              <Field label={d.nationality} required error={errors.nationality?.message}>
                <Input {...register("nationality")} />
              </Field>
              <Field label={d.idCard} error={errors.id_card_number?.message}>
                <Input autoComplete="off" {...register("id_card_number")} />
              </Field>
              <Field label={d.hometown} error={errors.hometown?.message}>
                <Input {...register("hometown")} />
              </Field>
              <Field label={d.address} error={errors.permanent_address?.message}>
                <Input {...register("permanent_address")} />
              </Field>
              <Field label={d.bio} error={errors.bio?.message} className="sm:col-span-2">
                <Textarea rows={3} {...register("bio")} />
              </Field>
            </CardContent>
          </Card>

          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-3 border-t border-border bg-background py-3">
            <p className="mr-auto text-sm text-muted" role="status" aria-live="polite">
              {isDirty ? d.unsaved : ""}
            </p>
            <Button variant="outline" onClick={() => reset(toForm(user))} disabled={!isDirty || busy}>
              {d.discard}
            </Button>
            <Button type="submit" loading={busy} disabled={!isDirty}>
              {d.save}
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{m.columns.roles}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <RoleBadges roles={user.roles} labels={labels} />
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <Row k={m.columns.created} v={formatDateTime(user.created_at)} />
                <Row k={m.columns.lastLogin} v={user.last_login_at ? formatDateTime(user.last_login_at) : m.never} />
                <Row k={d.updatedAt} v={formatDateTime(p.updated_at) || d.none} />
                <Row k="Email" v={user.email_verified ? d.emailVerified : d.emailUnverified} />
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{d.academic}</CardTitle>
              <CardDescription>{d.academicHint}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <Row k={d.institution} v={p.institution_name} />
                <Row k={d.unit} v={p.unit_name} />
                <Row k={d.program} v={p.program_id} />
                <Row k={d.major} v={p.major_id} />
                <Row k={d.specialization} v={p.specialization_id} />
                <Row k={d.cohort} v={p.cohort_id} />
                <Row k={d.adminClass} v={p.administrative_class_id} />
                <Row k={d.advisor} v={p.advisor_id} />
                <Row k={d.studyStatus} v={p.study_status} />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <UserRolesDialog user={rolesOpen ? user : null} onClose={() => setRolesOpen(false)} />
      <UserActionConfirm
        target={confirm}
        onClose={() => setConfirm(null)}
        onDone={(kind) => {
          if (kind === "delete") router.replace("/admin/users");
        }}
      />
    </>
  );
}

function Row({ k, v }: { k: string; v?: string | number | null }) {
  return (
    <>
      <dt className="text-muted">{k}</dt>
      <dd className="min-w-0 break-words">{v === null || v === undefined || v === "" ? <span className="text-muted">{m.detail.none}</span> : v}</dd>
    </>
  );
}

