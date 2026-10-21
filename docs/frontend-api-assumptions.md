# Frontend API assumptions (studio / course management)

Contracts the studio frontend relies on that are NOT (fully) implemented in the Go API yet. The frontend
feature-detects each (404/405 -> friendly "chưa sẵn sàng" state) and never crashes.

## Admin course moderation (planned, not implemented)

Used by `/admin/courses` (`src/features/courses/admin/admin-courses-page.tsx`). Admin only (401/403 as everywhere).

### `GET /api/admin/courses`
Query: `q` (title/slug/instructor name, case-insensitive substring), `status` (`draft|pending_review|published|closed|rejected`,
empty = all), `category_id` (a category and its descendants), `instructor_id`, `page`, `per_page` (default 20, max 100),
`sort` (optional; default `-updated_at`).
Result: standard list `{"data":[Course],"meta":{page,per_page,total,last_page}}` where `Course` is the shape the
catalog already returns from `GET /api/my-courses` plus:
`instructor: {id,name,avatar,email}`, `category: {id,name,slug}`, `lessons_count`, `enrollments_count`,
`reject_reason` (string|null), `updated_at`, `created_at`.

### `PUT /api/admin/courses/:id/approve`
No body. Allowed from `pending_review` (and, leniently, `rejected`/`draft`). Sets `status='published'`, `published_at=now()`,
clears `reject_reason`. Returns `{"message":"...","course":Course}`. (Ideally notifies the instructor.)

### `PUT /api/admin/courses/:id/reject`
Body `{"reason": "string, required, <=1000"}`. Sets `status='rejected'`, `reject_reason=reason`. Returns `{"message","course"}`.
422 with `errors.reason` when empty. (Ideally notifies the instructor.)

Fallback while `/api/admin/courses` answers 404: the page lists `GET /api/courses?status=<s>&search&category&instructor_id`
(default status `pending_review`) and shows "Chức năng duyệt khóa học đang được phát triển"; approve/reject buttons stay visible and
show the same message when the PUT answers 404/405.

## Gaps noticed in existing catalog endpoints (not blocking)

- `GET /api/my-courses` returns no rating (`reviews_count`, `reviews_avg_rating`); the studio list shows "-" until added
  (the public `GET /api/courses` list does include them).
- Lesson attachments can only be added as multipart files (`POST .../attachments`, field `file`); there is no URL-based
  attachment. The studio shows the list/delete and a "file upload will be available once object storage is on" hint.
- `GET /api/courses/:course/sections` (builder tree) only returns lessons with a non-null `section_id`; the studio therefore always
  creates lessons inside a section.
- `POST /courses/:course/lessons/reorder` stores a course-wide `position`; moving a lesson between sections needs
  `PUT lesson {section_id}` followed by the reorder call (what the studio does). A single "move" endpoint would be one round trip.
