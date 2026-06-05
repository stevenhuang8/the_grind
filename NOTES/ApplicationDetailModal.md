# Application Detail Modal + Document Storage

Clicking a job card opens a detail modal (placard) showing all fields for that application and allows attaching files (resumes, cover letters, etc.).

---

## Components

- `components/ApplicationDetailModal.tsx` — read-only modal; displays company, role, stage (colored dot), applied date, XP, URL, and notes. Bottom section is document management.
- `hooks/useDocuments.ts` — fetches, uploads, and deletes documents. Generates 1-hour signed URLs on fetch so files can be opened in a new tab without exposing storage paths.

---

## Click vs. Drag

`ApplicationCard` spreads `{...listeners}` from `useDraggable` on the root div, which means all pointer events go to dnd-kit. dnd-kit only activates drag after a movement threshold, so short taps/clicks still fire a native `onClick`. The card's `onClick={() => onSelect?.(application)}` is safe to add alongside the drag listeners.

Two elements inside the card needed `onClick={e => e.stopPropagation()}` to prevent bubbling up to the card's click handler:
- The delete button (already had `onPointerDown` stop for drag; click stop added too)
- The job URL anchor link (same reason)

---

## Document Storage

Files are stored in a private Supabase Storage bucket `application-documents`. Storage path format: `{userId}/{applicationId}/{timestamp}-{filename}` (timestamp avoids collisions on re-uploads of same filename).

DB row (`documents` table) is inserted after a successful storage upload. If the DB insert fails, the uploaded file is cleaned up from storage. On document fetch, signed URLs are generated for all docs in one pass so the UI can open them directly.

See `supabase/documents.sql` for the table definition and RLS policies.

In Supabase dashboard → Storage → New bucket → name `application-documents`, set **private**. Add a storage policy allowing authenticated users to read/write under their own `user_id` folder prefix.
