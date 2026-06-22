 Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Plan: Scope lead/employee visibility by admin role
  
 Context

 Today every admin (super_admin / admin / staff) sees every lead and every employee. The lead-lists feature was built so a super_admin can group leads and assign a list to a staff member — but only /admin (the leads index) and
 /admin/my-lists honour that scope. The employees index, the detail pages, the export APIs, the payments page, and the sidebar all still expose the full dataset to anyone with the right permission. A staff member can browse to
 /admin/<any-lead-id>, hit the CSV export, or open any employee's full record.

 This change makes visibility uniform: only super_admin sees all leads/employees. Everyone else sees only the leads and employees explicitly assigned to them. Exports are restricted to the same scope, detail pages enforce the scope
 server-side, and the sidebar hides the "All" links for non-super-admins. The scoping is enforced at the lib boundary so a stale client tab or a crafted URL can't bypass it.

 Per the user's confirmation:
 - Only super_admin sees all. admin and staff see only their assigned scope.
 - Exports use the same scope.
 - Detail pages return "not in scope" for items outside the caller's scope.
 - Sidebar hides "All Leads" / "All Employees" for non-super-admins.

 Current state (verified by exploration)

 The infrastructure is mostly in place:

 - src/lib/leads.ts listLeads() already accepts assignedAdminUserId (line 139) — already used by /admin page.
 - src/lib/employees.ts listEmployees() already accepts assignedAdminUserId (line 84) — used by /admin/my-employees.
 - lead_lists.assigned_admin_user_id exists (migration 0036); employees.assigned_admin_user_id exists (migration 0037).
 - lead_list_items join is the source of truth for "which leads this admin user is assigned".

 What's missing or wrong:

 1. /admin/employees/page.tsx calls listEmployees(...) without assignedAdminUserId — so non-super-admins see all employees.
 2. /admin/employees/[id]/page.tsx and /admin/[id]/page.tsx use getEmployee / getLead with no scope check — a non-super-admin can open any row by URL.
 3. /admin/lists/[id]/page.tsx and /admin/lists/[id]/edit/page.tsx similarly have no check — a non-super-admin can open any list and read all its leads.
 4. /api/admin/leads-export/route.ts, /api/admin/employees-export/route.ts, /api/admin/payments-export/route.ts call listLeads / listEmployees with no scoping — anyone with .view can bulk-download.
 5. /admin/payments/page.tsx lists all status='booked' leads without scoping.
 6. AdminShell.tsx always shows the "All Leads" and "All Employees" sidebar links — even when they would show an empty / scoped view.
 7. /admin/employees/page.tsx job counts (listJobCounts()) and the employees index page also fetch the full dataset.
 8. /api/admin/leads-export uses me.role === 'super_admin' || me.role === 'admin' (admin gets full) — needs to drop to super_admin only per the new rule.

 The current "admin sees all" exception in /admin/page.tsx line 53 (isSuperAdmin) is already correct (it gates on super_admin only). The export routes are the ones that incorrectly include admin.

 Approach

 Add one helper that resolves the caller's visible scope (a LeadScope / EmployeeScope value), then thread it through every read path. Reuse listLeads({ assignedAdminUserId }) and listEmployees({ assignedAdminUserId }) rather than
 re-implementing. The detail-page guards reuse the same assignedAdminUserId membership check that listLeads already does internally (the lead_list_items join).

 1. New helper: resolveScope in src/lib/admin-auth.ts

 Expose a small server-side helper that, given the current principal, returns:

 - super_admin → { kind: "all" }
 - everyone else → { kind: "assigned", adminUserId: <admin_users.id> }, looked up via getAdminUser(me.email).id (already done in /admin/page.tsx).

 It returns null if the principal has no admin_users row (defensive — shouldn't happen in practice, but it keeps us from generating an empty-string filter that matches every row).

 2. New helper: assertLeadInScope(leadId, scope) / assertEmployeeInScope(employeeId, scope)

 For detail-page guards. Both reuse the existing assignedAdminUserId membership logic:

 - Lead: a lead is in the caller's scope iff it appears in at least one list whose assigned_admin_user_id = scope.adminUserId. Implemented as a small targeted query against lead_list_items + lead_lists!inner, mirroring the second-step join
 in listLeads (lines 169–179).
 - Employee: an employee is in scope iff employees.assigned_admin_user_id = scope.adminUserId. One-row equality check against employees.

 For kind === "all", both helpers short-circuit to true. For kind === "assigned", they run the membership query. Throw notFound() semantics: callers notFound() if the helper returns false (i.e. row exists but is out of scope) — this matches
 the existing pattern in /admin/[id]/page.tsx and /admin/employees/[id]/page.tsx (if (!lead) notFound();).

 Add these helpers to src/lib/leads.ts (the lead one) and src/lib/employees.ts (the employee one), next to getLead / getEmployee. Both keep "server-only" and continue to use the service-role client.

 3. Apply the scope on the index pages

 - src/app/admin/page.tsx: already scopes via assignedAdminUserId. Confirm it's still the canonical super_admin-only-all pattern (it is).
 - src/app/admin/employees/page.tsx: resolve scope, pass assignedAdminUserId to listEmployees for non-super-admins. Drop the "admin sees all" behaviour. The role-pill counts (listJobCounts) and listAssignableAdminUsers() need scoping too —
 listJobCounts() should be filtered to the caller's scope, and listAssignableAdminUsers() is already gated by canManage so it stays. Use a new listJobCounts({ assignedAdminUserId }) overload — implemented by adding the optional filter to
 the existing query.
 - src/app/admin/payments/page.tsx: scope listLeads({ status: "booked", ... }) to the caller's assignedAdminUserId when not super_admin.
 - src/app/admin/lists/page.tsx: leave as-is. The list index is the super_admin's tool for managing all lists (only people with leads.manage see it). For a staff user with only leads.view, the sidebar won't expose /admin/lists (see step 6).

 4. Apply the scope on the detail pages

 - src/app/admin/[id]/page.tsx (lead detail): after getLead(id) returns a non-null row, call assertLeadInScope(id, scope). If out of scope, notFound().
 - src/app/admin/[id]/edit/page.tsx (lead edit): same — guard after getLead(id).
 - src/app/admin/employees/[id]/page.tsx (employee detail): after getEmployee(id), call assertEmployeeInScope(id, scope). If out of scope, notFound().
 - src/app/admin/employees/[id]/edit/page.tsx (employee edit): same.
 - src/app/admin/lists/[id]/page.tsx (list detail): a non-super-admin must only see a list assigned to them. After getLeadList(id), check list.assigned_admin_user_id === scope.adminUserId (or any for super_admin). If not, notFound().
 - src/app/admin/lists/[id]/edit/page.tsx (list edit): same — only super_admin can edit lists. notFound() for non-super-admins (a stricter rule, matches that this page uses require="leads.manage" and non-super-admins won't get there via the
 sidebar).

 5. Apply the scope on the export API routes

 - /api/admin/leads-export/route.ts: drop me.role === 'admin' from the allowed check (super_admin only for full; staff with .view continue to get their scoped data). Resolve scope, pass assignedAdminUserId to listLeads when not super_admin.
 - /api/admin/employees-export/route.ts: same — drop me.role === 'admin' from allowed, scope listEmployees for non-super-admins.
 - /api/admin/payments-export/route.ts: scope listLeads({ status: "booked", ... }) to assignedAdminUserId for non-super-admins (already requires leads.view).

 The ExportToolbar component doesn't need changes — it just GETs the URL, which now returns the scoped data.

 6. Sidebar: hide "All" links for non-super-admins

 - src/app/admin/AdminShell.tsx:
   - For non-super-admins, replace href: "/admin", label: "All Leads" with href: "/admin", label: "My Leads".
   - For non-super-admins, replace href: "/admin/employees", label: "All Employees" with href: "/admin/my-employees", label: "My Employees".
   - Keep "/admin/lists" (Lead Lists) gated to super_admin + admin only — it requires leads.manage, which is the right gate.
   - Same for "/admin/employees" (All Employees) — gate the "All Employees" link to super_admin only, and show "My Employees" to everyone with employees.view.

 7. Notification bell scopes (small touch-up)

 AdminShell.tsx calls listCallReminders() and listEmployeeCallReminders() to power the bell. These currently return reminders across all leads/employees. A staff member shouldn't see a reminder for a lead they're not assigned to. Add an
 optional assignedAdminUserId filter to both:

 - listCallReminders(opts: { assignedAdminUserId?: string }) — when set, only emit reminders for leads in lists assigned to that admin user.
 - listEmployeeCallReminders(opts: { assignedAdminUserId?: string }) — when set, only emit reminders for employees whose assigned_admin_user_id matches.

 Both filter server-side inside the existing functions (no new query surface — just an additional .eq() / membership check before the loop). AdminShell.tsx resolves the scope once and threads it into both bell calls.

 This is small but important: a staff member shouldn't see a flash of "Call today · Ravi · +91 98..." for a lead they have no relationship with.

 8. Empty-state copy on the scoped pages
     This is small but important: a staff member shouldn't see a flash of "Call today · Ravi · +91 98..." for a lead they have no relationship with.

     8. Empty-state copy on the scoped pages

     - /admin/page.tsx: the empty-state already says "No leads in your assigned lists match this filter" for non-super-admins — keep it. Add a one-line helper: "Ask a super-admin to create a list and assign it to you."
     - /admin/employees/page.tsx (non-super-admin branch): when employees.length === 0, render the same kind of "you have no employees assigned" message.
     - /admin/my-employees/page.tsx: already says "No employees are assigned to you yet" — keep.

     No new strings files needed — the existing copy is close enough.

     9. Tests

     The LeadListDetailClient.test.tsx already exists. Add:

     - A small unit-style test (or extend the existing test) for assertLeadInScope / assertEmployeeInScope semantics — easiest path is a Vitest test in src/lib/__tests__/scope.test.ts that mocks supabase() to return canned rows for
     super_admin, admin, and staff principals and asserts membership.

     If test scaffolding is not already complete, mirror the pattern of LeadListDetailClient.test.tsx and keep the new test tiny (don't pull in a heavyweight mocking framework — use the existing vi.mock("@/lib/supabase") pattern if it's
     already present, otherwise hand-roll a small mock for the two helpers).

     Critical files to change

     New code:
     - src/lib/admin-auth.ts — add resolveScope helper (small).
     - src/lib/leads.ts — add assertLeadInScope(leadId, scope).
     - src/lib/employees.ts — add assertEmployeeInScope(employeeId, scope). Extend listCallReminders and listEmployeeCallReminders with assignedAdminUserId.

     Modified:
     - src/app/admin/employees/page.tsx — scope listEmployees + listJobCounts.
     - src/app/admin/employees/[id]/page.tsx — guard with assertEmployeeInScope.
     - src/app/admin/employees/[id]/edit/page.tsx — same guard.
     - src/app/admin/[id]/page.tsx — guard with assertLeadInScope.
     - src/app/admin/[id]/edit/page.tsx — same guard.
     - src/app/admin/lists/[id]/page.tsx — guard so non-super-admin can only see lists assigned to them.
     - src/app/admin/lists/[id]/edit/page.tsx — restrict to super_admin.
     - src/app/admin/payments/page.tsx — scope listLeads.
     - src/app/admin/AdminShell.tsx — rename "All Leads" → "My Leads" for non-super-admins, "All Employees" → "My Employees", and gate the "All" links to super_admin; thread scope into bell.
     - src/app/api/admin/leads-export/route.ts — drop admin from allowed, scope listLeads.
     - src/app/api/admin/employees-export/route.ts — drop admin from allowed, scope listEmployees.
     - src/app/api/admin/payments-export/route.ts — scope listLeads.

     README + SECURITY.md cross-reference: not strictly required for behaviour, but I'll add a one-line note in README §15 ("Notable design decisions") and SECURITY.md noting that non-super-admin visibility is now strictly scoped to assigned
     rows. This is the kind of architectural rule the README is meant to record.

     Existing utilities to reuse (not reinvent)

     - listLeads({ assignedAdminUserId }) — src/lib/leads.ts:125–186 already does the correct membership join. Don't rewrite; just pass the option.
     - listEmployees({ assignedAdminUserId }) — src/lib/employees.ts:78–120 already filters by assigned_admin_user_id.
     - getAdminUser(email) — src/lib/admin-users.ts:35 to resolve the caller's admin_users.id from their email. Pattern already used in /admin/page.tsx:57 and /admin/my-lists/page.tsx:12.
     - currentAdmin() — src/lib/admin-auth.ts:138. The scope helper builds on this.
     - requirePermission(perm) — leave server actions alone (they already gate by .manage). The visibility change is read-side; writes remain permission-gated.

     Verification

     1. Type-check: npx tsc --noEmit — must pass.
     2. Lint: npm run lint — must pass.
     3. Unit tests: npm test — existing LeadListDetailClient.test.tsx plus the new scope test should pass.
     4. Manual — super_admin: log in as SUPER_ADMIN_EMAIL. On /admin, /admin/employees, /admin/lists, /admin/[id], /admin/employees/[id], /admin/payments — every page should look exactly like today (sees everything). The sidebar should show
     "All Leads" and "All Employees". CSV exports should return full data.
     5. Manual — admin: log in as a user with role admin (not super_admin). The sidebar should show "My Leads" and "My Employees". /admin should show only leads in lists assigned to them. /admin/employees should show only employees with
     their assigned_admin_user_id set to this admin. /admin/<any-id> and /admin/employees/<any-id> should notFound() for rows outside scope. The CSV export should return only the scoped rows.
     6. Manual — staff (no assignments): log in as a user with role staff and no list/employee assignments. /admin and /admin/employees should render the empty-state copy. CSV export should return the header row only.
     7. Manual — bell: as a staff user, the notification bell should not show reminders for leads/employees outside the caller's scope.

