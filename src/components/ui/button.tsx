import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  // Colours come from component tokens (--btn-*), see design/tokens.json. Flat fills, no shadows, no gradients.
  primary: "border-(--btn-primary-border) bg-(--btn-primary-bg) text-(color:--btn-primary-fg) hover:bg-(--btn-primary-hover) active:bg-(--btn-primary-active)",
  secondary: "border-(--btn-secondary-border) bg-(--btn-secondary-bg) text-(color:--btn-secondary-fg) hover:bg-(--btn-secondary-hover) active:bg-(--btn-secondary-active)",
  outline: "border-(--btn-outline-border) bg-(--btn-outline-bg) text-(color:--btn-outline-fg) hover:bg-(--btn-outline-hover) active:bg-(--btn-outline-active)",
  ghost: "border-(--btn-ghost-border) bg-(--btn-ghost-bg) text-(color:--btn-ghost-fg) hover:bg-(--btn-ghost-hover) active:bg-(--btn-ghost-active)",
  danger: "border-(--btn-danger-border) bg-(--btn-danger-bg) text-(color:--btn-danger-fg) hover:bg-(--btn-danger-hover) active:bg-(--btn-danger-active)",
  link: "border-transparent text-primary underline-offset-4 hover:underline px-0 h-auto",
};
/** Disabled look (token driven) for every filled variant; link keeps text colour only. */
const disabledStyles = {
  filled: "disabled:border-(--btn-disabled-border) disabled:bg-(--btn-disabled-bg) disabled:text-(color:--btn-disabled-fg) aria-disabled:border-(--btn-disabled-border) aria-disabled:bg-(--btn-disabled-bg) aria-disabled:text-(color:--btn-disabled-fg)",
  link: "disabled:text-(color:--btn-disabled-fg) aria-disabled:text-(color:--btn-disabled-fg)",
};
const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[0.9rem] gap-1.5",
  md: "h-9 px-4 gap-2",
  lg: "h-11 px-5 text-base gap-2",
  icon: "size-9 justify-center",
};

/** Class string for styling `<Link>`/`<a>` like a button. */
export function buttonStyles(opts: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  const { variant = "primary", size = "md", className } = opts;
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg border font-medium transition-[color,background-color,border-color,transform] duration-150 select-none",
    "active:not-disabled:not-aria-disabled:scale-[0.98]",
    "disabled:pointer-events-none aria-disabled:pointer-events-none",
    variants[variant],
    variant === "link" ? disabledStyles.link : disabledStyles.filled,
    variant === "link" ? "" : sizes[size],
    className,
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({ variant, size, loading, disabled, className, children, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, className })}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}