"use client";

import Link from "next/link";
import { isApiError } from "@/lib/errors";
import { buttonStyles, Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertTriangleIcon, LockIcon, SearchIcon } from "@/components/icons";
import { siteMessages as t } from "@/features/site/messages";

/** Friendly full-block state for a failed query: 401 / 403 / 404 / generic, always with a way out. */
export function QueryError({
  error,
  onRetry,
  loginNext,
  backHref,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  loginNext?: string;
  backHref?: string;
  className?: string;
}) {
  const status = isApiError(error) ? error.status : 0;
  const back = backHref ? (
    <Link href={backHref} className={buttonStyles({ variant: "outline" })}>{t.states.toCourse}</Link>
  ) : null;

  if (status === 401) {
    return (
      <EmptyState
        className={className}
        icon={<LockIcon />}
        title={t.states.unauthorizedTitle}
        description={t.states.unauthorizedText}
        action={<Link href={`/login?next=${encodeURIComponent(loginNext ?? "/my")}`} className={buttonStyles()}>{t.states.login}</Link>}
      />
    );
  }
  if (status === 403) {
    // The API explains schedule / sequence locks in Vietnamese ("Khóa học sẽ mở lúc ..."); show that instead of the generic text.
    const reason = error instanceof Error && /[ạ-ỹà-ỹđĐ]/i.test(error.message) ? error.message : null;
    return <EmptyState className={className} icon={<LockIcon />} title={reason ? t.states.lockedTitle : t.states.forbiddenTitle} description={reason ?? t.states.forbiddenText} action={back} />;
  }
  if (status === 404) {
    return <EmptyState className={className} icon={<SearchIcon />} title={t.states.notFoundTitle} description={t.states.notFoundText} action={back} />;
  }
  return (
    <EmptyState
      className={className}
      icon={<AlertTriangleIcon />}
      title={t.states.errorTitle}
      description={isApiError(error) && error.message ? error.message : t.states.errorText}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {onRetry && <Button onClick={onRetry}>{t.states.retry}</Button>}
          {back}
        </div>
      }
    />
  );
}
