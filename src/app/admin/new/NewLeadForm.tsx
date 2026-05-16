"use client";

import LeadForm from "../LeadForm";
import { createLeadAction } from "../actions";

export default function NewLeadForm() {
  return <LeadForm action={createLeadAction} submitLabel="Save Lead" pendingLabel="Saving…" />;
}
