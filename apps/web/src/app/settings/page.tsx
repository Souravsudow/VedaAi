
"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Bell, Lock, Mail, Moon, Shield, Sun, User, Volume2 } from "lucide-react";

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);
  const [email, setEmail] = useState("john.doe@school.edu");
  const [name, setName] = useState("John Doe");
  const [school, setSchool] = useState("");

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
              <span className="avatar large">JD</span>
              <button className="button-soft">Change Avatar</button>
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
                <button className={`toggle-switch ${darkMode ? "on" : ""}`} onClick={() => setDarkMode(!darkMode)}><span /></button>
              </div>
              <div className="settings-toggle">
                <div className="toggle-info">
                  <Bell size={20} />
                  <div><strong>Notifications</strong><p>Receive alerts for new assignments</p></div>
                </div>
                <button className={`toggle-switch ${notifications ? "on" : ""}`} onClick={() => setNotifications(!notifications)}><span /></button>
              </div>
              <div className="settings-toggle">
                <div className="toggle-info">
                  <Volume2 size={20} />
                  <div><strong>Sound Effects</strong><p>Play sounds for actions</p></div>
                </div>
                <button className={`toggle-switch ${sound ? "on" : ""}`} onClick={() => setSound(!sound)}><span /></button>
              </div>
            </div>
          </section>

          <section className="settings-card">
            <div className="settings-card-header">
              <Lock size={24} />
              <h2>Security</h2>
            </div>
            <div className="settings-fields">
              <label className="form-label">Current Password<input className="field" type="password" placeholder="Enter current password" /></label>
              <label className="form-label">New Password<input className="field" type="password" placeholder="Enter new password" /></label>
              <label className="form-label">Confirm New Password<input className="field" type="password" placeholder="Confirm new password" /></label>
              <button className="button-dark mt-4"><Shield size={20} />Update Password</button>
            </div>
          </section>
        </div>

        <button className="button-dark save-settings"><Shield size={24} />Save Changes</button>
      </div>
    </AppShell>
  );
}
