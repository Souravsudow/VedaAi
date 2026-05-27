"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  ChevronDown,
  FileText,
  Grid2X2,
  Library,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  User,
  UsersRound
} from "lucide-react";
import { api } from "@/lib/api";

const nav = [
  { href: "/", label: "Home", icon: Grid2X2 },
  { href: "/history", label: "My Groups", icon: UsersRound },
  { href: "/", label: "Assignments", icon: FileText },
  { href: "/assignments/new", label: "AI Teacher's Toolkit", icon: BookOpen },
  { href: "/history", label: "My Library", icon: Library }
];

const demoTitlePattern = /Backend Smoke|Geometry Checkpoint|Algebra Foundations/i;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [profile, setProfile] = useState({
    name: "Sourav",
    email: "john.doe@school.edu"
  });

  const title = pathname === "/assignments/new" ? "Assignment" : pathname.startsWith("/assignments/") ? "Assignment" : "Assignment";
  const readyAssignments = assignments.filter((assignment) => assignment.status === "ready");
  const notifications = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.status === "ready" || assignment.status === "generating")
        .slice(0, 3)
        .map((assignment) => ({
          id: assignment._id,
          message:
            assignment.status === "ready"
              ? `${assignment.title} paper is ready`
              : `${assignment.title} generation is in progress`,
          time: assignment.status === "ready" ? "Ready now" : "Running"
        })),
    [assignments]
  );
  const hasNotifications = notifications.length > 0;

  useEffect(() => {
    let mounted = true;

    api
      .listAssignments()
      .then((items) => {
        if (!mounted) return;
        setAssignments((items || []).filter((assignment: any) => !assignment.title?.match(demoTitlePattern)));
      })
      .catch(() => {
        if (mounted) setAssignments([]);
      });

    return () => {
      mounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    const readProfile = () => {
      setProfile({
        name: localStorage.getItem("vedaProfileName") || "Sourav",
        email: localStorage.getItem("vedaProfileEmail") || "john.doe@school.edu"
      });
    };

    readProfile();
    window.addEventListener("veda-profile-updated", readProfile);
    window.addEventListener("storage", readProfile);

    return () => {
      window.removeEventListener("veda-profile-updated", readProfile);
      window.removeEventListener("storage", readProfile);
    };
  }, []);

  const profileInitials =
    profile.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "JD";

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
            const badge =
              item.label === "Assignments"
                ? assignments.length
                : item.label === "My Library"
                  ? readyAssignments.length
                  : 0;
            const active =
              item.label === "Assignments"
                ? pathname === "/" || (pathname.startsWith("/assignments/") && pathname !== "/assignments/new")
                : false;
            return (
              <Link key={`${item.label}-${item.href}`} href={item.href} className={`sidebar-link ${active ? "is-active" : ""}`}>
                <Icon size={22} />
                <span>{item.label}</span>
                {badge > 0 && <strong>{badge}</strong>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link href="/settings" className={`sidebar-link ${pathname === "/settings" ? "is-active" : ""}`}>
            <Settings size={22} />
            <span>Settings</span>
          </Link>

          {/* User Profile Card */}
          <div className="profile-card">
            <span className="avatar">{profileInitials}</span>
            <div className="profile-info">
              <strong>{profile.name}</strong>
              <p>Teacher</p>
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
            {/* Notifications */}
            <div className="notif-wrapper">
              <button 
                className="notification-button" 
                aria-label="Notifications"
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <Bell size={28} />
                {hasNotifications && <span className="notif-badge" />}
              </button>

              {notifOpen && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <strong>Notifications</strong>
                    {hasNotifications && <span>{notifications.length} new</span>}
                  </div>
                  {hasNotifications ? (
                    <div className="notif-list">
                      {notifications.map((notification) => (
                        <div className="notif-item" key={notification.id}>
                          <div className="notif-dot" />
                          <p>{notification.message}</p>
                          <span>{notification.time}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="notif-empty">No notifications yet</div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="profile-wrapper">
              <button 
                className="profile-trigger"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <span className="avatar small">{profileInitials}</span>
                <strong>{profile.name}</strong>
                <ChevronDown size={23} className={profileOpen ? "rotate" : ""} />
              </button>

              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-header">
                    <span className="avatar">{profileInitials}</span>
                    <div>
                      <strong>{profile.name}</strong>
                      <p>{profile.email}</p>
                    </div>
                  </div>
                  <div className="profile-menu">
                    <Link href="/settings" className="profile-item" onClick={() => setProfileOpen(false)}>
                      <Settings size={18} />
                      <span>Settings</span>
                    </Link>
                    <button className="profile-item" onClick={() => alert("Logout clicked")}>
                      <LogOut size={18} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="veda-content">{children}</main>
      </section>
    </div>
  );
}
