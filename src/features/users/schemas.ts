import { z } from "zod";
import { usersMessages as m } from "./messages";

const v = m.validation;
const optional = (max: number) => z.string().trim().max(max, v.max(max));

export const createUserSchema = z
  .object({
    name: z.string().trim().min(1, v.nameRequired).max(255, v.max(255)),
    email: z.string().trim().min(1, v.emailRequired).max(255, v.max(255)).pipe(z.email(v.emailInvalid)),
    roles: z.array(z.string()).min(1, v.rolesRequired).max(20),
    user_type: z.string(),
    student_code: optional(50),
    staff_code: optional(50),
    phone: optional(32),
    password: z.string(),
    send_invite: z.boolean(),
  })
  .superRefine((d, ctx) => {
    if (!d.send_invite && d.password && (d.password.length < 8 || d.password.length > 72)) {
      ctx.addIssue({ code: "custom", path: ["password"], message: v.passwordLength });
    }
  });
export type CreateUserValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  name: z.string().trim().min(1, v.nameRequired).max(255, v.max(255)),
  email: z.string().trim().min(1, v.emailRequired).max(255, v.max(255)).pipe(z.email(v.emailInvalid)),
  user_type: z.string().min(1, v.userTypeRequired),
  phone: optional(32),
  student_code: optional(50),
  staff_code: optional(50),
  gender: z.string(),
  date_of_birth: z.string(),
  hometown: optional(255),
  permanent_address: optional(500),
  nationality: z.string().trim().min(1, v.nationalityRequired).max(100, v.max(100)),
  id_card_number: optional(50),
  bio: optional(2000),
});
export type EditUserValues = z.infer<typeof editUserSchema>;
export const EDIT_FIELDS = Object.keys(editUserSchema.shape) as Array<keyof EditUserValues>;
