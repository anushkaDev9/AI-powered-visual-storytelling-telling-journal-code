import React, { useState } from "react";
import Page from "../comp/Page";

export default function SignInPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder for future backend integration
    alert(`${isSignUp ? "Sign Up" : "Sign In"} with: ${JSON.stringify(formData)}`);
  };

  const handleOAuth = (provider) => {
    if (provider === "google") {
      window.location.assign("http://localhost:3000/google");
    }
    // pinterest logic placeholder
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-100">
      <Page title={isSignUp ? "Sign Up" : "Sign In"}>
        <div className="w-full max-w-md rounded-3xl bg-slate-900 shadow-2xl ring-1 ring-slate-800 p-8 flex flex-col gap-6">

          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-amber-300">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h1>
            <p className="mt-2 text-slate-400">
              {isSignUp ? "Start your visual storytelling journey" : "Continue to your AI Vision Journal"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition"
                  placeholder="John Doe"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-amber-400 text-slate-900 font-bold py-3 hover:bg-amber-300 transition shadow-lg shadow-amber-400/20"
            >
              {isSignUp ? "Sign Up" : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">Or continue with</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Google Button */}
            <button
              onClick={() => handleOAuth("google")}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-semibold hover:bg-slate-700 transition"
            >
              <span className="w-5 h-5">{GoogleIcon}</span>
              <span>Google</span>
            </button>

            {/* Pinterest Button */}
            <button
              onClick={() => handleOAuth("pinterest")}
              className="flex items-center justify-center gap-2 rounded-xl border border-rose-900/30 bg-rose-950/20 py-3 text-sm font-semibold text-rose-200 hover:bg-rose-900/40 transition"
            >
              <span className="w-5 h-5">{PinterestIcon}</span>
              <span>Pinterest</span>
            </button>
          </div>

          {/* Toggle */}
          <div className="text-center text-sm text-slate-400">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-amber-400 font-semibold hover:underline focus:outline-none"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>

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
