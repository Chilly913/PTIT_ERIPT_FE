import Link from "next/link";
import { Avatar, Badge, Card, CardDescription, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { fmtRelative } from "./format";
import { dashboardMessages as t } from "./messages";
import type { PendingCourse, RecentUser } from "./types";
import { BookIcon } from "@/components/icons";

export function PendingCoursesCard({ courses }: { courses: PendingCourse[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.pending.title}</CardTitle>
        <CardDescription>{t.pending.description}</CardDescription>
      </CardHeader>
      {courses.length === 0 ? (
        <EmptyState className="py-10" icon={<BookIcon />} title={t.pending.empty} />
      ) : (
        <ul className="divide-y divide-border">
          {courses.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                {/* Link stays disabled until the course admin screen exists. */}
                <p className="truncate font-medium" title={t.pending.unavailable}>
                  {c.title}
                </p>
                {c.instructor_name && <p className="truncate text-sm text-muted">{t.pending.byInstructor(c.instructor_name)}</p>}
              </div>
              <time dateTime={c.created_at} className="shrink-0 text-sm text-muted">
                {fmtRelative(c.created_at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function RecentUsersCard({ users }: { users: RecentUser[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.recent.title}</CardTitle>
        <CardDescription>{t.recent.description}</CardDescription>
      </CardHeader>
      {users.length === 0 ? (
        <EmptyState className="py-10" title={t.recent.empty} />
      ) : (
        <ul className="divide-y divide-border">
          {users.map((u) => (
            <li key={u.id}>
              <Link
                href={`/admin/users?q=${encodeURIComponent(u.email)}`}
                aria-label={t.recent.viewUser(u.name)}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-muted"
              >
                <Avatar name={u.name} src={u.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.name}</p>
                  <p className="truncate text-sm text-muted">{u.email}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <Badge key={r} tone="primary">
                        {t.roles.names[r] ?? r}
                      </Badge>
                    ))}
                    {u.disabled && <Badge tone="danger">{t.recent.disabled}</Badge>}
                    {!u.email_verified && <Badge tone="warning">{t.recent.unverified}</Badge>}
                  </div>
                </div>
                <time dateTime={u.created_at} className="shrink-0 self-start text-sm text-muted">
                  {fmtRelative(u.created_at)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
