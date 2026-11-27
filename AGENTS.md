<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (TIEMPO LIBRE 360)

- Pages under `src/pages/**` are the original JSX screens; keep them and their design classes in `src/styles.css`. Routes in `src/routes/*` are thin wrappers. Why: the owner requires the original design and structure to stay unchanged.
- Pages import routing only from `@/lib/router` (React Router–shaped shim over TanStack Router). Why: lets the original screens run unchanged on TanStack.
- All business logic (credits, exchanges, verification, feedback, private classes, chat) runs on the server in `src/server/tl/*.server.js`, reached through the single `tlApi` server function (`src/lib/tl-api.functions.ts`, client helper `api()` in `src/lib/pb.js`). The server checks the session and roles on every call. Why: ports the original PocketBase hooks with identical rules and keeps privileged tables out of the browser.
- Private feature tables (verification requests, feedback reports, private bookings) have no browser access; chat messages are readable only by the two participants and written only through the server. Why: users may only see their own data and conversations.
- Uploaded evidence goes to the private `evidencias` bucket under `<user id>/...`; it is shown only through short-lived signed links created by the server. Why: evidence files are private.
- Roles live only in `public.user_roles`; a database guard and server-side grant pin principal admin to the independently verified existing account ID, never to signup metadata or email alone. Why: auto-confirmed registrations do not prove email ownership.
- Private class commission accounting is server-only and isolated from time-credit accounting; provider settlement requires verified test events and unique event/payment identifiers. Why: prevents fabricated, live or duplicate payments.
- Profile photos remain in the existing private evidence bucket under each user's profile folder, validated server-side and displayed through temporary signed URLs. Why: preserves storage and prevents cross-user file substitution.
- Account password fields use the shared PasswordInput control, preserving native input props and independent visibility state. Why: keeps login, registration and password changes consistent without changing authentication.
- Profile-image preflight lives in a browser-safe helper and runs before the existing upload call; server ownership validation remains authoritative. Why: reject empty, disguised or undecodable files without changing storage or access rules.
