"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert, Button, Dialog, Field, Input, Select, Spinner, Switch, useToast } from "@/components/ui";
import { applyApiErrors } from "@/lib/form-errors";
import { useRoleList, useUserMutations } from "./api";
import { usersMessages as m } from "./messages";
import { RolePicker } from "./role-picker";
import { createUserSchema, type CreateUserValues } from "./schemas";

const FIELDS = ["name", "email", "roles", "user_type", "student_code", "staff_code", "phone", "password", "send_invite"];
const FORM_ID = "create-user-form";

const empty: CreateUserValues = {
  name: "",
  email: "",
  roles: ["student"],
  user_type: "",
  student_code: "",
  staff_code: "",
  phone: "",
  password: "",
  send_invite: false,
};

export function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={m.create.title} description={m.create.description} size="lg">
      {/* Children mount only while open, so the form state resets on every open. */}
      <CreateUserForm onClose={onClose} />
    </Dialog>
  );
}

function CreateUserForm({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const { create } = useUserMutations();
  const rolesQuery = useRoleList();
  const rolesLabelId = useId();
  const rolesHintId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateUserValues>({ resolver: zodResolver(createUserSchema), defaultValues: empty });
  const invite = useWatch({ control, name: "send_invite" });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    const body: Record<string, unknown> = { name: v.name, email: v.email, roles: v.roles };
    if (v.user_type) body.user_type = v.user_type;
    if (v.student_code) body.student_code = v.student_code;
    if (v.staff_code) body.staff_code = v.staff_code;
    if (v.phone) body.phone = v.phone;
    if (v.send_invite) body.send_invite = true;
    else if (v.password) body.password = v.password;
    try {
      const u = await create.mutateAsync(body);
      if (v.send_invite && u.invite_sent === false) toast.info(m.toast.created, m.toast.inviteFailed);
      else toast.success(m.toast.created, u.email);
      onClose();
    } catch (e) {
      setFormError(applyApiErrors(e, setError, FIELDS));
    }
  });

  const busy = create.isPending;
  return (
    <form id={FORM_ID} onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={m.create.name} required error={errors.name?.message}>
          <Input autoComplete="off" autoFocus {...register("name")} />
        </Field>
        <Field label={m.create.email} required error={errors.email?.message}>
          <Input type="email" autoComplete="off" {...register("email")} />
        </Field>
      </div>

      <div>
        <p id={rolesLabelId} className="mb-1.5 text-sm font-medium">
          {m.create.roles} <span aria-hidden className="text-danger">*</span>
        </p>
        {rolesQuery.isPending ? (
          <Spinner label={m.rolesDialog.loading} />
        ) : rolesQuery.isError ? (
          <Alert tone="danger">{rolesQuery.error.message}</Alert>
        ) : (
          <Controller
            control={control}
            name="roles"
            render={({ field }) => (
              <RolePicker roles={rolesQuery.data} value={field.value} onChange={field.onChange} labelledBy={rolesLabelId} describedBy={rolesHintId} />
            )}
          />
        )}
        <p id={rolesHintId} role={errors.roles ? "alert" : undefined} className={errors.roles ? "mt-1 text-sm text-danger" : "mt-1 text-sm text-muted"}>
          {errors.roles?.message ?? m.create.rolesHint}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={m.create.userType} error={errors.user_type?.message}>
          <Select {...register("user_type")}>
            <option value="">{m.create.userTypeAuto}</option>
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
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-surface-muted p-3">
        <Controller
          control={control}
          name="send_invite"
          render={({ field }) => (
            <div>
              <Switch checked={field.value} onCheckedChange={field.onChange} label={m.create.invite} />
              <p className="mt-1 ml-12 text-sm text-muted">{m.create.inviteHint}</p>
            </div>
          )}
        />
        <Field label={m.create.password} hint={invite ? undefined : m.create.passwordHint} error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" disabled={invite} {...register("password")} />
        </Field>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Hủy
        </Button>
        <Button type="submit" loading={busy}>
          {m.create.submit}
        </Button>
      </div>
    </form>
  );
}
