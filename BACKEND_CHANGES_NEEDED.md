# Backend Changes Needed

This document lists backend additions or changes required for the frontend to work correctly
after the public portal migration from Requests → Feedbacks.

---

## 1. Comments endpoint for Feedbacks (MISSING)

**Problem:** There is no `POST /api/public/{workspaceSlug}/feedbacks/{feedbackId}/comments` endpoint.
The frontend currently proxies feedback comments to the existing:
```
POST /api/public/{workspaceSlug}/requests/{requestId}/comments
```
This works as a **temporary workaround** only if the feedback's underlying request shares the same ID. If that's not guaranteed, comment submission will fail.

**Required:**
```
POST /api/public/{workspaceSlug}/feedbacks/{feedbackId}/comments
GET  /api/public/{workspaceSlug}/feedbacks/{feedbackId}/comments
```
The `GET` endpoint should be included in the `GET /api/public/{workspaceSlug}/feedbacks/{feedbackId}` response as `comments: []` to avoid a second round-trip.

---

## 2. Status filter for public feedbacks list (MISSING IN SPEC)

**Problem:** `GET /api/public/{workspaceSlug}/feedbacks` does not document a `status` query parameter in the OpenAPI spec.
The frontend sends `?status=<value>` when the user filters by status.

**Required:**
```
GET /api/public/{workspaceSlug}/feedbacks?status=open&search=...
```
Supported values: `open`, `in_progress`, `resolved`, `closed` (or equivalent).

---

## 3. Similar items endpoint should return Feedback IDs (NOT Request IDs)

**Problem:** `POST /api/public/{workspaceSlug}/requests/similar` returns:
```json
{ "items": [{ "requestId": "...", "title": "...", "votes": 0 }] }
```
The public portal now primarily uses Feedback IDs. When the user clicks on a similar item, the frontend fetches `GET /requests/{requestId}` — a route being deprecated.

**Required (preferred):**
```
POST /api/public/{workspaceSlug}/feedbacks/similar
```
Response shape:
```json
{ "items": [{ "feedbackId": "...", "title": "...", "votes": 0 }] }
```
This allows the frontend to route the click to `GET /feedbacks/{feedbackId}` instead.

---

## 4. Vote endpoint response shape

**Current:** `POST /api/public/{workspaceSlug}/feedbacks/vote` returns `{ success: boolean }`.

**Suggestion:** Also return updated vote count:
```json
{ "success": true, "votes": 42 }
```
This allows optimistic UI update without a full list refresh.

---

## 5. Feedback details GET should include comments inline

**Current behavior:** Unknown — the spec doesn't document a `comments` field in the feedback detail response.

**Required:** `GET /api/public/{workspaceSlug}/feedbacks/{feedbackId}` should include:
```json
{
  "id": "...",
  "title": "...",
  "description": "...",
  "status": "open",
  "votes": 5,
  "commentCount": 2,
  "createdAt": "...",
  "comments": [
    { "id": "...", "name": "...", "text": "...", "createdAt": "..." }
  ]
}
```

---

## 6. Public Request routes (deprecated)

The following routes are expected to be **removed** from the public portal:
- `GET  /api/public/{workspaceSlug}/requests`
- `POST /api/public/{workspaceSlug}/requests`
- `GET  /api/public/{workspaceSlug}/requests/{requestId}`
- `POST /api/public/{workspaceSlug}/requests/{requestId}/vote`

> **Note:** The similar requests endpoint (`/requests/similar`) is still used as a temporary bridge.
> Once item #3 above is implemented, this can be removed too.

---

## Summary Table

| Priority | Change | Status |
|----------|--------|--------|
| 🔴 High  | `GET/POST /feedbacks/{id}/comments` endpoint | Missing |
| 🔴 High  | `GET /feedbacks` supports `?status=` filter | Not in spec |
| 🟡 Medium | `POST /feedbacks/similar` returning feedbackIds | Missing |
| 🟡 Medium | Feedback detail includes `comments[]` inline | Unknown |
| 🟢 Low   | Vote response includes updated vote count | Improvement |
| 🟢 Low   | Remove deprecated public `/requests/*` routes | After migration |
