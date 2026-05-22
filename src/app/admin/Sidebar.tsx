"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  PlusCircle,
  Users,
  UserPlus,
  UserCog,
  Tag,
  Car,
  Settings2,
  Briefcase,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { ROLE_LABEL, type AdminRole } from "@/lib/admin-users-shared";
import type { CallReminder } from "@/lib/leads-shared";
import NotificationBell from "./NotificationBell";

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  // exact = highlight only on exact path match (avoids /admin matching everything)
  exact?: boolean;
}
export interface NavGroup {
  title: string;
  items: NavItem[];
}

const ICONS = { Inbox, PlusCircle, Users, UserPlus, UserCog, Tag, Car, Settings2, Briefcase } as const;

export default function Sidebar({
  groups,
  email,
  role,
  reminders = [],
  showBell = false,
}: {
  groups: NavGroup[];
  email: string;
  role: AdminRole;
  reminders?: CallReminder[];
  showBell?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

  const initials = email.slice(0, 2).toUpperCase();

  // withBell: show the bell in the brand row. True for the desktop rail; false
  // for the mobile drawer (the mobile bell lives in the top bar, and showing it
  // in the drawer would collide with the close button).
  const renderNav = (withBell: boolean) => (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/10 flex items-start justify-between gap-2">
        <div>
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="text-sm font-bold tracking-[0.2em] uppercase"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Klicseo<span className="text-[#C9A84C]">.</span>
          </Link>
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 mt-0.5">Admin</p>
        </div>
        {withBell && showBell && <NotificationBell items={reminders} align="left" />}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
              {group.title}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = isActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                        active
                          ? "bg-[#C9A84C]/15 text-[#E8CC7A] font-semibold ring-1 ring-[#C9A84C]/25"
                          : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                      }`}
                    >
                      <Icon
                        size={17}
                        className={active ? "text-[#C9A84C]" : "text-white/40 group-hover:text-white/70"}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-bold text-[#050E21]"
            style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white/80">{email}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/35">{ROLE_LABEL[role]}</p>
          </div>
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              title="Logout"
              className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:text-red-300 hover:bg-red-500/10"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#071029]/80 px-4 py-3 backdrop-blur">
        <Link href="/admin" className="text-sm font-bold tracking-[0.2em] uppercase" style={{ fontFamily: "var(--font-playfair)" }}>
          Klicseo<span className="text-[#C9A84C]">.</span>
        </Link>
        <div className="flex items-center gap-2">
          {showBell && <NotificationBell items={reminders} align="right" />}
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-white/70 hover:bg-white/10"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Desktop fixed rail */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-white/10 bg-[#071029]">
        {renderNav(true)}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[80%] border-r border-white/10 bg-[#071029] shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/10"
            >
              <X size={18} />
            </button>
            {renderNav(false)}
          </aside>
        </div>
      )}
    </>
  );
}
