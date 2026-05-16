// Turns raw PostgREST / Supabase errors into something safe to surface in the
// admin UI. We deliberately keep this dependency-free so it can be imported
// from server components, server actions, and API routes alike.

export interface FriendlyDbError {
  title: string;
  detail: string;
  hint?: string;
  missingTable?: boolean;
}

export function friendlyDbError(err: unknown): FriendlyDbError {
  const e = err as { code?: string; message?: string; details?: string } | null;
  const code = e?.code;
  const message = e?.message ?? String(err);

  // PostgREST returns PGRST205 when a referenced table is unknown to the
  // schema cache — almost always means a migration hasn't been run yet.
  if (code === "PGRST205") {
    const tableMatch = /'public\.(\w+)'/.exec(message);
    const table = tableMatch?.[1];
    return {
      title: table ? `The "${table}" table is missing.` : "A database table is missing.",
      detail: "PostgREST couldn't find the table in the schema cache.",
      hint: "Run the latest migration in supabase/migrations/ via the Supabase SQL editor, then refresh.",
      missingTable: true,
    };
  }

  // Connection / env issues
  if (/SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY/.test(message)) {
    return {
      title: "Supabase is not configured.",
      detail: message,
      hint: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local.",
    };
  }

  // Storage bucket missing (careers form upload before the bucket exists).
  if (/Bucket not found/i.test(message)) {
    return {
      title: "Storage bucket is missing.",
      detail: message,
      hint: "Run migration 0003_employees.sql — it creates the employee-docs bucket.",
    };
  }

  return {
    title: "Something went wrong loading data.",
    detail: message,
  };
}
