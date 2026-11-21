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
- Sign-in is username + password only: usernames map to internal `<username>@users.school.local` addresses (`src/lib/username.ts`); admins create every account via server functions in `src/lib/accounts.functions.ts`, which set the role explicitly — roles never come from user input.
- Students (`students.user_id`) and parents (`parent_children`) read records through `can_view_student`/`can_view_class`; writes to grades/attendance/notes stay staff-only via `can_access_student`.
- Keep school timezone, the bell timetable, and period-based lateness in the shared attendance-time helper; store optional timing on existing attendance rows so legacy history and status actions stay intact.
- Leaderboard math lives in `src/lib/rankings.ts`; class comparisons give graded students equal weight and use each class's recorded attendance days, with RLS-limited reads and no ranking tables to keep in sync.
- Serve font weights from `public/fonts/` through local CSS `@font-face` rules, retaining their bundled license — removes runtime font-service dependencies without new infrastructure.
- Class weekly timetables live in `class_timetable` (class_id, day 0=Sat…4=Wed, period 1–4) and render via `ClassTimetable` at the top of the class page — per-class rows keep each class independent.
- Subjects are assigned per class via `class_subjects`; grade entry, profile averages and settings read only the student's class list, and a DB trigger rejects grades for subjects outside the class.
- Demo records are flagged with `is_demo` on grades/attendance/notes and removed only via the admin-only `clear_demo_data()` function — keeps real records safe. Large reads page through `fetchAll` because the server caps responses at 1000 rows.
- Virtual learning reuses the existing authenticated client through a locally typed external-schema adapter; its additive installer targets the school's VPS only, so managed school records and generated types remain unchanged.
- Virtual-school authorization and exam answer keys stay in database policies, validation triggers and narrow RPCs; online attendance is session-specific and exam scores enter existing grades only after release, avoiding physical-record overwrites and duplicate grades.
- Live classes use real external HTTPS meeting links and recordings use external media URLs; private educational files use Storage API with short-lived authorized links, so no fake video service or large database media is introduced.
