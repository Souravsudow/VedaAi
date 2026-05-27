
"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Bell, CheckCircle2, Shield, Sun, User, Volume2 } from "lucide-react";

const DEFAULT_PROFILE = {
  name: "Sourav",
  email: "john.doe@school.edu",
  school: ""
};

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);
  const [email, setEmail] = useState(DEFAULT_PROFILE.email);
  const [name, setName] = useState(DEFAULT_PROFILE.name);
  const [school, setSchool] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  const initials = useMemo(
    () =>
      name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "JD",
    [name]
  );

  useEffect(() => {
    const savedName = localStorage.getItem("vedaProfileName");
    const savedEmail = localStorage.getItem("vedaProfileEmail");
    const savedSchool = localStorage.getItem("vedaProfileSchool");
    const savedDarkMode = localStorage.getItem("vedaDarkMode");
    const savedNotifications = localStorage.getItem("vedaNotifications");
    const savedSound = localStorage.getItem("vedaSound");

    setName(savedName || DEFAULT_PROFILE.name);
    setEmail(savedEmail || DEFAULT_PROFILE.email);
    setSchool(savedSchool || DEFAULT_PROFILE.school);
    setDarkMode(savedDarkMode === "true");
    setNotifications(savedNotifications !== "false");
    setSound(savedSound !== "false");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("veda-dark", darkMode);
    localStorage.setItem("vedaDarkMode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("vedaNotifications", String(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem("vedaSound", String(sound));
  }, [sound]);

  const handleSave = () => {
    const cleanName = name.trim() || DEFAULT_PROFILE.name;
    const cleanEmail = email.trim() || DEFAULT_PROFILE.email;
    const cleanSchool = school.trim();

    setName(cleanName);
    setEmail(cleanEmail);
    setSchool(cleanSchool);

    localStorage.setItem("vedaProfileName", cleanName);
    localStorage.setItem("vedaProfileEmail", cleanEmail);
    localStorage.setItem("vedaProfileSchool", cleanSchool);
    window.dispatchEvent(new Event("veda-profile-updated"));

    setSaveStatus("Settings saved");
    window.setTimeout(() => setSaveStatus(""), 2200);
  };

  return (
    <AppShell>
      <div className="page">
        <div className="section-title-row">
          <span className="green-dot" />
          <div>
            <h1>Settings</h1>
            <p>Manage your account preferences and notifications.</p>
          </div>
        </div>

        <div className="settings-grid">
          <section className="settings-card">
            <div className="settings-card-header">
              <User size={24} />
              <h2>Profile</h2>
            </div>
            <div className="settings-avatar-row">
              <span className="avatar large">{initials}</span>
              <button className="button-soft" type="button" onClick={handleSave}>
                Sync Profile
              </button>
            </div>
            <div className="settings-fields">
              <label className="form-label">
                Full Name
                <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="form-label">
                Email
                <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="form-label">
                School / Institution
                <input className="field" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Enter your school name..." />
              </label>
            </div>
          </section>

          <section className="settings-card">
            <div className="settings-card-header">
              <Shield size={24} />
              <h2>Preferences</h2>
            </div>
            <div className="settings-toggle-list">
              <div className="settings-toggle">
                <div className="toggle-info">
                  <Sun size={20} />
                  <div><strong>Dark Mode</strong><p>Switch between light and dark theme</p></div>
                </div>
                <button
                  className={`toggle-switch ${darkMode ? "on" : ""}`}
                  type="button"
                  aria-label="Toggle dark mode"
                  aria-pressed={darkMode}
                  onClick={() => setDarkMode(!darkMode)}
                >
                  <span />
                </button>
              </div>
              <div className="settings-toggle">
                <div className="toggle-info">
                  <Bell size={20} />
                  <div><strong>Notifications</strong><p>Receive alerts for new assignments</p></div>
                </div>
                <button
                  className={`toggle-switch ${notifications ? "on" : ""}`}
                  type="button"
                  aria-label="Toggle notifications"
                  aria-pressed={notifications}
                  onClick={() => setNotifications(!notifications)}
                >
                  <span />
                </button>
              </div>
              <div className="settings-toggle">
                <div className="toggle-info">
                  <Volume2 size={20} />
                  <div><strong>Sound Effects</strong><p>Play sounds for actions</p></div>
                </div>
                <button
                  className={`toggle-switch ${sound ? "on" : ""}`}
                  type="button"
                  aria-label="Toggle sound effects"
                  aria-pressed={sound}
                  onClick={() => setSound(!sound)}
                >
                  <span />
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="settings-actions">
          {saveStatus ? (
            <span className="settings-save-status">
              <CheckCircle2 size={20} />
              {saveStatus}
            </span>
          ) : null}
          <button className="button-dark save-settings" type="button" onClick={handleSave}>
            <Shield size={24} />Save Changes
          </button>
        </div>
      </div>
    </AppShell>
  );
}
