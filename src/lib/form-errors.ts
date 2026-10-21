import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isApiError } from "./errors";

/**
 * Copy Go 422 `errors` onto react-hook-form fields.
 * Returns the message to show at form level when the error is not a field error
 * (or when some field names are unknown to the form).
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields?: readonly string[],
): string | null {
  if (!isApiError(error)) return error instanceof Error ? error.message : null;
  if (error.status === 422 && error.errors) {
    let leftover: string | null = null;
    for (const [field, msgs] of Object.entries(error.errors)) {
      if (!msgs?.length) continue;
      if (knownFields && !knownFields.includes(field)) {
        leftover = leftover ?? msgs[0];
        continue;
      }
      setError(field as Path<T>, { type: "server", message: msgs[0] });
    }
    return leftover;
  }
  return error.message;
}