import type { LucideIcon } from "lucide-react";
import { Eye, SquarePen } from "lucide-react";
import type { Permission } from "@/lib/admin-users-shared";

// Simple action icons for each permission: an eye for "view", a pen for
// "manage". Keeps the permission toggles scannable at a glance.
export const PERMISSION_ICON: Record<Permission, LucideIcon> = {
  "leads.view": Eye,
  "leads.manage": SquarePen,
  "employees.view": Eye,
  "employees.manage": SquarePen,
};
