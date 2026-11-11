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

## Project rules
- UI is Persian RTL (`dir="rtl"` on html); display dates via `jalali()` in `src/lib/fa.ts` while storing ISO Gregorian dates — keeps DB queries simple.
- Use the shared SolarDatePicker and the Persian DayPicker for all date selection; convert selected dates to local ISO dates so calendar presentation never changes persisted records.
- Data access goes straight from the browser Supabase client with RLS (`can_access_class`/`can_access_student`, roles in `user_roles`) — teachers only see assigned classes without extra server code.
- First signed-up user becomes admin via the `handle_new_user` trigger; later users are teachers — do not create test accounts in production, they would consume the admin slot.
- Keep school timezone and attendance timing calculations in the shared attendance-time helper; store optional timing on existing attendance rows so legacy history and status actions stay intact.
