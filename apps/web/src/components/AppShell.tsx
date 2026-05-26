"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  ChevronDown,
  FileText,
  Grid2X2,
  Library,
  Plus,
  Settings,
  Sparkles,
  UsersRound
} from "lucide-react";

const nav = [
  { href: "/", label: "Home", icon: Grid2X2 },
  { href: "/history", label: "My Groups", icon: UsersRound },
  { href: "/", label: "Assignments", icon: FileText, badge: "10" },
  { href: "/assignments/new", label: "AI Teacher's Toolkit", icon: BookOpen },
  { href: "/history", label: "My Library", icon: Library, badge: "32" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const title = pathname === "/assignments/new" ? "Assignment" : pathname.startsWith("/assignments/") ? "Assignment" : "Assignment";

  return (
    <div className={`app-frame ${sidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
      <aside className="veda-sidebar">
        <button className="veda-logo" type="button" onClick={() => setSidebarOpen((value) => !value)} aria-label="Toggle VedaAI sidebar">
          <span className="veda-logo-mark">V</span>
          <span>VedaAI</span>
        </button>

        <Link href="/assignments/new" className="sidebar-create">
          <Sparkles size={22} />
          Create Assignment
        </Link>

        <nav className="sidebar-nav">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              item.label === "Assignments"
                ? pathname === "/" || (pathname.startsWith("/assignments/") && pathname !== "/assignments/new")
                : false;
            return (
              <Link key={`${item.label}-${item.href}`} href={item.href} className={`sidebar-link ${active ? "is-active" : ""}`}>
                <Icon size={22} />
                <span>{item.label}</span>
                {item.badge && <strong>{item.badge}</strong>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link href="/history" className="sidebar-link">
            <Settings size={22} />
            <span>Settings</span>
          </Link>
          <div className="school-card">
            <span className="avatar">JD</span>
            <div>
              <strong>Delhi Public School</strong>
              <p>Bokaro Steel City</p>
            </div>
          </div>
        </div>
      </aside>

      <section className="veda-workspace">
        <header className="veda-toolbar">
          <div className="toolbar-left">
            <Link href="/" className="back-button">
              <ArrowLeft size={28} />
            </Link>
            <Grid2X2 className="toolbar-grid" size={25} />
            <span>{title}</span>
          </div>
          <div className="toolbar-right">
            <button className="notification-button" aria-label="Notifications">
              <Bell size={28} />
              <span />
            </button>
            <span className="avatar small">JD</span>
            <strong>John Doe</strong>
            <ChevronDown size={23} />
          </div>
        </header>

        <main className="veda-content">{children}</main>
      </section>
    </div>
  );
}
