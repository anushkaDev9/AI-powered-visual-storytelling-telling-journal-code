import React, { useState } from "react";
import Page from "../comp/Page";

const API_BASE = "http://localhost:3000";

export default function SignInPage({ setView, setProfile }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !pwd) return setError("Enter email and password");
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password: pwd }),
      });
      if (r.ok) {
        const body = await r.json().catch(() => ({}));
        // update app-level profile and go to books view
        if (typeof setProfile === "function" && body.profile) setProfile(body.profile);
        if (typeof setView === "function") setView("books");
      } else {
        const body = await r.json().catch(() => ({}));
        setError(body?.error || "Login failed");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !pwd) return setError("Enter email and password");
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pwd }),
      });
      if (r.ok) {
        // after signup, attempt login and update profile
        const loginResp = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password: pwd }),
        });
        if (loginResp.ok) {
          const body = await loginResp.json().catch(() => ({}));
          if (typeof setProfile === "function" && body.profile) setProfile(body.profile);
          if (typeof setView === "function") setView("books");
          return;
        }
        const body = await loginResp.json().catch(() => ({}));
        setError(body?.error || "Login after signup failed");
      } else {
        const body = await r.json().catch(() => ({}));
        setError(body?.error || "Signup failed");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-100 ">
      <Page title="SignIn">
        <div className="w-full max-w-md rounded-2xl bg-slate-900 p-8">
          <h2 className="text-2xl font-bold text-amber-300 mb-2">Sign In / Sign Up</h2>
          <p className="text-sm text-slate-400 mb-6">Use email & password or Google OAuth</p>

          <form className="grid gap-3" onSubmit={handleLogin}>
            <label className="text-sm text-slate-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
              required
            />

            <label className="text-sm text-slate-400">Password</label>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100"
              required
            />

            {error && <div className="text-sm text-rose-400">{error}</div>}

            <div className="grid grid-cols-2 gap-3 mt-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-amber-400 text-slate-900 px-4 py-2 font-semibold shadow"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <button
                type="button"
                onClick={handleSignup}
                disabled={loading}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-100"
              >
                {loading ? "Please wait..." : "Sign up"}
              </button>
            </div>
          </form>
        </div>
      </Page>
    </div>
  );
}

/* ---------- Icons (inline SVGs) ---------- */
const GoogleIcon = (
  <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 31.7 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1 7.4 2.8l5.7-5.7C33.7 6.5 29.1 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20 20-8.9 20-20c0-1.5-.2-3-.4-4.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.8 16.2 19 13 24 13c2.8 0 5.4 1 7.4 2.8l5.7-5.7C33.7 6.5 29.1 5 24 5c-7.4 0-13.7 4.1-17.1 9.7z" />
    <path fill="#4CAF50" d="M24 45c5.1 0 9.7-1.9 13.2-5.1l-6.1-5c-2 1.4-4.6 2.2-7.1 2.2-5.2 0-9.6-3.3-11.2-7.9l-6.6 5.1C10.3 40.9 16.6 45 24 45z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3.1 5.1-6.1 6.4l6.1 5C38.1 36.9 40 31.3 40 25c0-1.5-.2-3-.4-4.5z" />
  </svg>
);

const PinterestIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#E60023" />
    <path
      d="M12.1 6.5c-3 0-4.6 2-4.6 4 0 1 .4 1.9 1.5 2.2.2 0 .4 0 .5-.2.1-.2.4-1.4.4-1.6 0-.2-.1-.3-.2-.5-.3-.4-.4-1 .1-1.6.6-.7 1.6-.8 2.3-.8 2 0 3.1 1.2 3.1 2.8 0 2.1-.9 3.9-2.3 3.9-.8 0-1.4-.7-1.2-1.5.2-.9.5-1.8.5-2.4 0-.6-.3-1.1-1-1.1-.8 0-1.4.8-1.4 1.9 0 .7.3 1.1.3 1.1s-1 4.3-1.2 5.1c-.4 1.7-.1 3.8 0 4 .1.1.2.1.3 0 .1-.2 1.6-2.1 2-3.7.1-.5.8-3 .8-3 .4.7 1.3 1.1 2.2 1.1 2.9 0 4.8-2.5 4.8-5.8 0-2.5-2.1-4.9-5.2-4.9z"
      fill="#fff"
    />
  </svg>
);
