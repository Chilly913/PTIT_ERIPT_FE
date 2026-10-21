"use client";

import { useState } from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { messages } from "@/lib/messages";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

/** Input with a show/hide toggle. Spread react-hook-form `register()` on it. */
export function PasswordInput({ className, ...props }: Omit<InputProps, "type">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} className={`pr-10 ${className ?? ""}`} {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? messages.auth.hidePassword : messages.auth.showPassword}
        aria-pressed={show}
        className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1.5 text-muted hover:text-foreground"
      >
        {show ? <EyeOffIcon className="size-4" aria-hidden /> : <EyeIcon className="size-4" aria-hidden />}
      </button>
    </div>
  );
}