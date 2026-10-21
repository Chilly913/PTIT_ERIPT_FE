# ERIPT web frontend

Next.js 16 (App Router, Turbopack), React 19, Tailwind 4, TypeScript. UI copy is Vietnamese only.

## Run

```
cp .env.example .env.local     # API_URL=http://127.0.0.1:8080
npm run dev                    # http://localhost:3000
npm run build && npm start
npm run lint
```

Env: `API_URL` (server only, Go API origin), `NEXT_PUBLIC_APP_NAME`.
The Go API must have `FRONTEND_URL` = the public URL of this app (mailed links point to `/verify-email`, `/reset-password`; Google flow returns to `/auth/google`).

Config notes (`next.config.ts`):
- `cacheComponents`/`partialPrefetching` are OFF: pages depend on the session cookie, Cache Components would force Suspense around every cookie read.
- The turbopack rule `*.css -> @tailwindcss/turbopack` IS required (verified: without it Tailwind utilities are not generated).
- Auth gate file is `src/proxy.ts` (Next 16 name for middleware).
- Font: Be Vietnam Pro self-hosted in `public/fonts` (`src/app/fonts.css`), no network needed at build.

## Structure

```
src/proxy.ts                 optimistic gate: no cookie on /admin* -> /login?next=
src/app/layout.tsx           html, theme init script, <Providers>
src/app/(auth)/...           login, register, forgot-password, reset-password, verify-email, auth/google
src/app/(admin)/layout.tsx   requireUser + admin role check, <AdminShell>, 403 screen
src/app/(admin)/admin/**     admin pages (feature work lives ONLY here + its own components)
src/app/session/*            login / logout / google (+ google/start) route handlers
src/app/bff/[...path]        authenticated proxy to Go /api/*
src/components/ui            design system (barrel: "@/components/ui")
src/components/admin-shell   sidebar, topbar, breadcrumbs, user menu, nav-config.ts
src/components/auth          auth forms
src/components/providers     Providers (React Query + Theme + Toast), SessionProvider/useSession/useCan
src/lib                      api, errors, form-errors, messages, server-api, session, guards, auth-utils, types, cn
src/hooks                    use-countdown
```

## Session / BFF design

- Go bearer token lives ONLY in httpOnly cookie `eript_token` (SameSite=Lax, Secure in production, 14 days). Browser JS never sees it.
- `POST /session/login` -> Go login, sets cookie, returns `{user}`; passes 4xx bodies through (422 errors, 403 `requires_verification`, 429 + `Retry-After`).
- `POST /session/logout` revokes the token and clears the cookie. `POST /session/google {token}` validates a token via `/auth/me` and stores it. `GET /session/google/start` redirects to the Google consent URL (from `/api/auth/google/url`).
- `/bff/<path>` -> `${API_URL}/api/<path>` for every method, streaming bodies (multipart ok), adds `Authorization`, clears the cookie on 401, does not follow redirects, rejects cross-origin state-changing requests (Origin check), and 404s the token-issuing endpoints (`auth/login`, `login`, `auth/google/*`).
- Server code: `serverApi(path, init)` (`@/lib/server-api`) calls Go directly with the cookie token, returns `{ok,status,data,error}` and never throws. `getCurrentUser()` is memoised per request.
- Guards: `requireUser(returnTo)` and `redirectIfAuthenticated(next)` in `@/lib/guards`. `/admin/*` requires role `admin`, otherwise the 403 screen (rendered with HTTP 200, layouts cannot set status).
- Client: `useSession()` -> `{user, logout}`; `useCan()(perm)`.

## Client data layer

```ts
import { api, apiRequest, ApiError, isApiError } from "@/lib/api";
api.get<Paginated<AdminUser>>("/admin/users", { query: { page: 1, q: "x" } });
api.post("/admin/users", body);  api.put(...); api.patch(...); api.delete(...)
```
Paths are relative to Go `/api` (the helper prefixes `/bff`). JSON or `FormData` bodies. Non-2xx throws `ApiError {status, message, errors?, retryAfter?, requiresVerification}`; known English Go messages are translated (`translateServerMessage` in `messages.ts`). A 401 outside auth endpoints sends the browser to `/login?next=`.

Forms: react-hook-form + zod; map 422 onto fields with `applyApiErrors(error, setError, knownFields)` (`@/lib/form-errors`), which returns a leftover message for a form-level `<Alert>`.

Types in `@/lib/types`: `User`, `Paginated<T>`, `PageMeta`, `ApiErrorBody`, `RoleName`.

## Copy

All strings go through `messages` (`@/lib/messages`), grouped per feature (`common`, `landing`, `auth`, `admin`). Add a key per new feature (or a sibling `messages.<feature>.ts`); components import `messages.<feature>`.

## UI components (`@/components/ui`)

| Component | Notes |
|---|---|
| `Button` | `variant` primary/secondary/outline/ghost/danger/link, `size` sm/md/lg/icon, `loading`. `buttonStyles({variant,size,className})` styles `<Link>` |
| `Field` | `label`, `hint`, `error`, `required`; wires id/aria-describedby/aria-invalid to child control via context |
| `Input`, `Textarea`, `Select`, `Label`, `FieldError` | inside `<Field>` they pick up id/aria; `Select` is a styled native select; all accept `register()` |
| `Checkbox` | `label`; `Switch` (`checked`, `onCheckedChange`, `label`) |
| `Badge` | `tone` neutral/primary/success/warning/danger/info |
| `Alert` | `tone` info/success/warning/danger, `title` |
| `Card`, `CardHeader/Title/Description/Content/Footer` | |
| `Table`, `THead`, `TBody`, `Tr`, `Th`, `Td`, `TableSkeleton{rows,columns}`, `TableEmpty{columns,title,description}` | |
| `Pagination` | `meta` (from `Paginated`), `onPageChange(page)`, `disabled` |
| `Dialog` | `open`, `onClose`, `title`, `description`, `footer`, `size` sm/md/lg, `dismissable`; native `<dialog>` (focus trap, ESC); children mount only while open |
| `ConfirmDialog` | `open,onClose,onConfirm,title,description,confirmLabel,destructive,loading` |
| `Dropdown`, `DropdownTrigger`, `DropdownContent{align}`, `DropdownItem{onSelect,href,danger,disabled}`, `DropdownSeparator`, `DropdownLabel` | keyboard nav |
| `Tabs`, `TabsList`, `TabsTrigger{value}`, `TabsContent{value}` | controlled or `defaultValue` |
| `ToastProvider`, `useToast()` | `.success/.error/.info(title, description?)`, `.toast({...})`, `.dismiss(id)` |
| `Tooltip` | `content`, `side`; wraps ONE focusable child |
| `Skeleton`, `Spinner`, `Avatar{name,src,size}`, `EmptyState{icon,title,description,action}`, `PageHeader{title,description,actions}` | |

Tokens (light only; dark is dormant, see design-system.md) are CSS variables in `globals.css`, exposed as Tailwind colors: `bg-surface`, `bg-surface-muted`, `border-border`, `text-muted`, `bg-primary`, `text-primary-foreground`, `bg-primary-soft`, `text-danger`, `bg-success-soft`, etc. Base font size is 14px. Icons: `@/components/icons` (own SVG set, no icon library).

## Recipe: add an admin page

1. Enable the nav item: `src/components/admin-shell/nav-config.ts` (`enabled: true`, add the entry if new; breadcrumbs derive from it).
2. Add copy: `messages.admin.pages.<feature>` in `src/lib/messages.ts` (or a sibling file).
3. Create `src/app/(admin)/admin/<feature>/page.tsx` as a thin server component that renders a client component from `src/components/<feature>/` (or `src/features/<feature>/`). The layout already guarantees an authenticated admin, wrapped in `AdminShell`, `SessionProvider`, React Query and Toast.
4. Fetch with React Query + `api`; mutate with `useMutation` and invalidate.

```tsx
// src/app/(admin)/admin/users/page.tsx
import { UsersPage } from "@/components/users/users-page";
export default function Page() { return <UsersPage />; }
```

```tsx
// src/components/users/users-page.tsx
"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import { Badge, Button, ConfirmDialog, Card, Input, PageHeader, Pagination, Table, TBody, TableEmpty,
  TableSkeleton, Td, Th, THead, Tr, useToast } from "@/components/ui";
import { messages } from "@/lib/messages";

interface Row { id: number; name: string; email: string; disabled: boolean }

export function UsersPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const toast = useToast();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["admin-users", { q, page }],
    queryFn: () => api.get<Paginated<Row>>("/admin/users", { query: { q, page, per_page: 20 } }),
    placeholderData: keepPreviousData,
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => { toast.success("Đã xóa"); setToDelete(null); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Người dùng" actions={<Button>Thêm</Button>} />
      <Card>
        <div className="p-4"><Input placeholder={messages.common.search} value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
        <Table>
          <THead><Tr><Th>Tên</Th><Th>Email</Th><Th>Trạng thái</Th><Th /></Tr></THead>
          <TBody>
            {list.isPending ? <TableSkeleton columns={4} />
              : list.data?.data.length ? list.data.data.map((u) => (
                <Tr key={u.id}><Td>{u.name}</Td><Td>{u.email}</Td>
                  <Td><Badge tone={u.disabled ? "danger" : "success"}>{u.disabled ? "Khóa" : "Hoạt động"}</Badge></Td>
                  <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => setToDelete(u)}>{messages.common.delete}</Button></Td></Tr>))
              : <TableEmpty columns={4} />}
          </TBody>
        </Table>
        <Pagination meta={list.data?.meta} onPageChange={setPage} disabled={list.isFetching} />
      </Card>
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} destructive loading={del.isPending}
        title="Xóa người dùng?" description={toDelete?.email} confirmLabel={messages.common.delete}
        onConfirm={() => toDelete && del.mutate(toDelete.id)} />
    </>
  );
}
```

Form dialogs: `useForm` + `zodResolver`, `onError` -> `applyApiErrors(e, setError, [...fields])`, show the returned string in an `<Alert tone="danger">`. There is no file upload UI yet (no object storage): logo/favicon are plain URL inputs.
Server-side data (rare, e.g. initial render): `const r = await serverApi<T>("/admin/stats")` in a server component.
