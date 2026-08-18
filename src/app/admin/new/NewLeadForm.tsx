"use client";

import LeadForm from "../LeadForm";
import { createLeadAction } from "../actions";
import type { LeadListRow } from "@/lib/leadLists-shared";

export default function NewLeadForm({
  knownAreas,
  leadLists,
}: {
  knownAreas?: string[];
  leadLists?: LeadListRow[];
}) {
  return (
    <LeadForm
      action={createLeadAction}
      submitLabel="Save Lead"
      pendingLabel="Saving…"
      knownAreas={knownAreas}
      leadLists={leadLists}
    />
  );
}
