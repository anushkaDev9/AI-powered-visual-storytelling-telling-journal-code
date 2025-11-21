import React from "react";

const API_BASE = "http://localhost:3000";

export default function SignButton({ setView, oauth = false, className = "" }) {
  const handleClick = () => {
    if (oauth) {
      // direct OAuth redirect
      window.location.assign(`${API_BASE}/google?next=${encodeURIComponent("/?view=books")}`);
      return;
    }
    if (typeof setView === "function") {
      setView("SignInButton");
      return;
    }
    // fallback: navigate to sign-in page
    window.location.assign(`${window.location.origin}?view=SignInButton`);
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 rounded-full bg-amber-400 text-slate-900 px-4 py-2 font-semibold shadow-md active:scale-[0.98] ${className}`}
    >
      Sign In
    </button>
  );
}
