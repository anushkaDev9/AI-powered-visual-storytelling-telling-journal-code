import React, { useState } from "react";
import Page from "../comp/Page";

const API_BASE = "http://localhost:3000";

export default function SignInPage({ setView }) {
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
        window.location.assign(`${window.location.origin}?view=books`);
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
        // after signup, attempt login
        await handleLogin(e);
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

