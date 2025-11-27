// src/comp/Books.jsx
import React from "react";
import Page from "./Page";

const API_BASE = "http://localhost:3000";

export default function Books({ setView, profile }) {
  const [loading, setLoading] = React.useState(true);
  const [stories, setStories] = React.useState([]);
 const handleOAuth = (provider) => {
    if (provider === "google") {
      window.location.assign("http://localhost:3000/google");
    }
    // pinterest logic placeholder
  };
  React.useEffect(() => {
    if (!profile) return; // only fetch when signed in
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/stories`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch stories");
        const data = await res.json();
        setStories(Array.isArray(data.stories) ? data.stories : []);
      } catch (e) {
        console.error(e);
        setStories([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  // -----------------------------
  // 1) Checking session
  // -----------------------------
  if (profile === undefined) {
    return (
      <Page title="My books">
        <div className="h-40 grid place-items-center text-slate-400 animate-pulse">
          Checking session…
        </div>
      </Page>
    );
  }

  // -----------------------------
  // 2) User NOT signed in → Show login box
  // -----------------------------
  if (profile === null) {
    return (
      <Page title="My books">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-slate-200 mb-3">
            You're not signed in
          </h2>

          <p className="text-slate-400 mb-6">
            To view your stories, please log in.
          </p>

          <div className="flex flex-col items-center gap-4">
            <a
            onClick={() => handleOAuth("google")}
              
              className="w-full max-w-xs rounded-full bg-white text-slate-900 px-5 py-2 font-semibold"
            >
              Continue with Google
            </a>

            <a
             onClick={() => handleOAuth("pinterest")}
             
              className="w-full max-w-xs rounded-full bg-red-500 text-white px-5 py-2 font-semibold"
            >
              Continue with Pinterest
            </a>
          </div>
        </div>
      </Page>
    );
  }

  // -----------------------------
  // 3) User signed in → show stories
  // -----------------------------
  return (
    <Page title="My books">
      {/* Signed-in header stays the same */}

      {loading ? (
        <div className="h-40 grid place-items-center text-slate-400 animate-pulse">
          Loading your stories…
        </div>
      ) : stories.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">
          No stories yet. Create your first one!
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((s) => {
            const imagesToShow =
              s.images && s.images.length > 0 ? s.images : [s.image];

            return (
              <div
                key={s.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="rounded-xl overflow-hidden ring-1 ring-slate-800">
                  {imagesToShow.length > 1 ? (
                    <div className="grid grid-cols-2 gap-0.5 h-48">
                      {imagesToShow.slice(0, 4).map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt="Story cover"
                          className="w-full h-full object-cover"
                        />
                      ))}
                    </div>
                  ) : (
                    <img
                      src={s.image}
                      alt="Story cover"
                      className="w-full h-48 object-cover"
                    />
                  )}
                </div>

                <button
                  onClick={() => setView("viewer", s)}
                  className="mt-4 w-full rounded-full bg-amber-400 text-slate-900 px-5 py-2 font-semibold"
                >
                  View
                </button>

                {s.createdAt && (
                  <div className="mt-2 text-xs text-slate-500">
                    {new Date(s.createdAt).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
}
