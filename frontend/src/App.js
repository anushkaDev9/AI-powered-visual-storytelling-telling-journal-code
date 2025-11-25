// src/App.js
import "./App.css";
import Header from "./comp/Header";
import Hero from "./comp/Home.js/Hero";
import Works from "./comp/Home.js/Works";
import Dashboard from "./comp/Dashboard/Dashboard";
import { useEffect, useMemo, useState } from "react";
import CreateEntry from "./comp/Dashboard/CreateEntry";
import Compose from "./comp/Dashboard/Compose";
import Books from "./comp/Books";
import Viewer from "./comp/Viewer";
import SignInPage from "./comp/SignInButton";
import PhotosPicker from "./comp/PhotosPicker";
import MediaLibrary from "./comp/Dashboard/MediaLibrary";

const API_BASE = "http://localhost:3000";

export default function App() {
  // read initial view from URL (?view=...), fallback to "home"
  const initialView = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("view") || "home";
  }, []);

  const [view, setView] = useState(initialView);

  // profile: undefined = checking, null = not authed, object = authed
  const [profile, setProfile] = useState(undefined);

  // Shared images for Compose (array)
  const [sharedImages, setSharedImages] = useState(null);

  // NEW: active story to show in Viewer
  const [activeStory, setActiveStory] = useState(null);

  // keep URL in sync with view
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    window.history.replaceState({}, "", url.toString());
  }, [view]);

  // Check session/profile once on app mount
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/profile`, {
          credentials: "include",
        });
        if (r.ok) {
          const p = await r.json();
          setProfile(p);
        } else {
          setProfile(null);
        }
      } catch {
        setProfile(null);
      }
    })();
  }, []);

  // Wrap setView to also accept a payload (like a story)
  const setViewWithPayload = (nextView, payload = null) => {
    setView(nextView);
    setActiveStory(payload);

    // optional: persist for refreshes
    if (payload) {
      sessionStorage.setItem("activeStory", JSON.stringify(payload));
    } else {
      sessionStorage.removeItem("activeStory");
    }
  };

  // Restore persisted story on load (useful if Viewer refreshes)
  useEffect(() => {
    const saved = sessionStorage.getItem("activeStory");
    if (saved && !activeStory) {
      try {
        setActiveStory(JSON.parse(saved));
      } catch {
        sessionStorage.removeItem("activeStory");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="App">
      <div className="min-h-screen w-full bg-slate-950 text-slate-50 flex flex-col">
        <Header
          view={view}
          setView={setViewWithPayload}
          profile={profile}
          setProfile={setProfile}
        />

        <div className="flex-grow">
          {view === "home" && (
            <div key="home">
              <Hero setView={setViewWithPayload} />
              <Works />
            </div>
          )}

          {view === "dashboard" && (
            <div key="dashboard">
              <Dashboard setView={setViewWithPayload} setSharedImage={setSharedImages} />
            </div>
          )}

          {view === "create" && (
            <div key="create">
              <CreateEntry
                setView={setViewWithPayload}
                setSharedImages={setSharedImages}
              />
            </div>
          )}

          {view === "compose" && (
            <div key="compose">
              <Compose setView={setViewWithPayload} sharedImages={sharedImages} />
            </div>
          )}

          {view === "books" && (
            <div key="books">
              <Books
                setView={setViewWithPayload}
                profile={profile}
                setProfile={setProfile}
              />
            </div>
          )}

          {view === "viewer" && (
            <div key="viewer">
              <Viewer setView={setViewWithPayload} story={activeStory} />
            </div>
          )}

          {view === "SignInButton" && <SignInPage setView={setViewWithPayload} />}

          {view === "photosPicker" && <PhotosPicker setView={setViewWithPayload} />}

          {view === "media-library" && <MediaLibrary setView={setViewWithPayload} />}
        </div>

        <footer className="mt-10 border-t border-slate-800">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-400">
            © {new Date().getFullYear()} AIVision Journal 
          </div>
        </footer>
      </div>
    </div>
  );
}
