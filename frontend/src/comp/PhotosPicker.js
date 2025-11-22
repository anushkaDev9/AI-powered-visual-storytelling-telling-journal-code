import { useEffect, useState } from "react";

const API_BASE = "http://localhost:3000";

export default function PhotosPicker({ setView }) {
  const [status, setStatus] = useState("loading");
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/photos/recent`, { credentials: "include" });
        
        if (r.status === 401) {
          setStatus("error");
          setError("Please sign in first");
          return;
        }
        
        if (r.status === 403) {
          const errorData = await r.json();
          if (errorData.needsAuth) {
            setStatus("need_drive_auth");
            return;
          }
        }
        
        if (!r.ok) {
          throw new Error(`Failed to load Google Photos: ${r.status}`);
        }
        
        const data = await r.json();
        setItems(data.items || []);
        setStatus("ok");
      } catch (err) {
        setStatus("error");
        setError(err.message);
      }
    })();
  }, []);

  const choose = (baseUrl) => {
    localStorage.setItem("pickedPhotoUrl", baseUrl);
    setView("create"); // go back to CreateEntry
  };

  const handleDriveAuth = () => {
    window.location.assign(`${API_BASE}/photos/auth?next=${encodeURIComponent("/?view=photosPicker")}`);
  };

  if (status === "loading") return shell(<div className="text-slate-300">Loading photos…</div>);
  
  if (status === "need_drive_auth") {
    return shell(
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-4">Drive Access Required</h2>
        <p className="text-slate-400 mb-6">You need to grant access to your Google Drive to import images.</p>
        <div className="flex gap-3 justify-center">
          <button 
            onClick={handleDriveAuth}
            className="bg-amber-400 text-slate-900 px-6 py-2 rounded-lg font-semibold hover:bg-amber-300"
          >
            Grant Drive Access
          </button>
          <button 
            onClick={() => setView("create")}
            className="border border-slate-700 px-6 py-2 rounded-lg text-slate-200 hover:border-slate-600"
          >
            Back
          </button>
        </div>
        <div className="mt-4">
          <button 
            onClick={() => {
              // Clear any existing session and redirect to Drive auth
              fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' })
                .then(() => handleDriveAuth());
            }}
            className="text-slate-400 hover:text-amber-200 text-sm underline"
          >
            Clear session and retry
          </button>
        </div>
      </div>
    );
  }
  
  if (status === "error") {
    return shell(
      <div className="text-center py-8">
        <div className="text-rose-300 mb-4">Error: {error || "Couldn't load photos"}</div>
        <button 
          onClick={() => setView("create")}
          className="border border-slate-700 px-6 py-2 rounded-lg text-slate-200 hover:border-slate-600"
        >
          Back
        </button>
      </div>
    );
  }

  return shell(
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Pick a photo</h1>
        <button onClick={() => setView("create")} className="text-slate-300 hover:text-amber-200 text-sm">Back</button>
      </div>
      {items.length === 0 ? (
        <div className="text-slate-400">No photos found.</div>
      ) : (
        <>
          <div className="text-slate-400 text-sm mb-3">Found {items.length} images</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {items.map(m => (
              <button
                key={m.id}
                onClick={() => choose(m.baseUrl)}
                className="group relative aspect-square overflow-hidden rounded-xl border border-slate-700 hover:border-amber-300"
                title={m.filename}
              >
                <img
                  src={m.baseUrl}
                  alt={m.filename}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    console.error('Image failed to load:', m.baseUrl);
                    e.target.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', m.filename);
                  }}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function shell(children) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto p-6">{children}</div>
    </div>
  );
}
