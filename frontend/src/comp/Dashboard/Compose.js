// Compose.js
import React, { useEffect, useState } from 'react';
import Page from '../Page';

const Compose = ({ setView, sharedImages }) => {
  const [text, setText] = useState(() => localStorage.getItem("AI_NARRATIVE") || "");
  const [perspective, setPerspective] = useState("first");
  const [tone, setTone] = useState("formal");
  const [loading, setLoading] = useState(false);

  const API_BASE = "http://localhost:3000";

  // Helper: dataURL -> File
  const dataURLtoFile = async (dataUrl, filename = "image.png") => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    // try to keep correct mime if possible
    const type = blob.type || "image/png";
    return new File([blob], filename, { type });
  };

  // Build a usable File array for uploads no matter where it came from
  const [imageFiles, setImageFiles] = useState([]);

  useEffect(() => {
    (async () => {
      // 1. Try props first (fresh upload)
      if (sharedImages && Array.isArray(sharedImages) && sharedImages.length > 0) {
        setImageFiles(sharedImages);
        return;
      }

      // 2. Fallback to localStorage (refresh or navigation)
      const savedDataUrls = localStorage.getItem("SHARED_IMAGE_DATAURLS");
      if (savedDataUrls) {
        try {
          const urls = JSON.parse(savedDataUrls);
          if (Array.isArray(urls) && urls.length > 0) {
            const files = await Promise.all(urls.map((url, i) => dataURLtoFile(url, `restored-${i}.png`)));
            setImageFiles(files);
            return;
          }
        } catch (e) {
          console.error("Failed to parse saved images", e);
        }
      }

      // 3. Legacy fallback (single image)
      const singleDataUrl = localStorage.getItem("SHARED_IMAGE_DATAURL");
      if (singleDataUrl) {
        const f = await dataURLtoFile(singleDataUrl, "restored-legacy.png");
        setImageFiles([f]);
      }
    })();
  }, [sharedImages]);

  const handleRegenerate = async () => {
    if (imageFiles.length === 0) {
      alert("No images found for regeneration. Please start over from Create Entry or Viewer.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();

      // Append all images
      imageFiles.forEach((file) => {
        formData.append("images", file);
      });

      formData.append("perspective", perspective);
      formData.append("tone", tone);
      formData.append("lineCount", 10);

      const response = await fetch(`${API_BASE}/ai/generate-narrative`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.narrative) {
        setText(data.narrative);
        localStorage.setItem("AI_NARRATIVE", data.narrative);
        alert("Narrative regenerated!");
      } else {
        alert("Failed to regenerate narrative.");
      }
    } catch (err) {
      console.error("Regeneration error:", err);
      alert("Error regenerating narrative.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (imageFiles.length === 0) {
      alert("No images found.");
      return;
    }
    const formData = new FormData();

    // Append all images
    imageFiles.forEach((file) => {
      formData.append("images", file);
    });

    formData.append("narrative", text);

    const res = await fetch(`${API_BASE}/ai/save-entry`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (res.ok) {
      alert("Story saved successfully!");
      setView("books");
    } else {
      const errData = await res.json();
      console.error("Save failed:", errData);
      alert(`Could not save: ${errData.error || "Unknown error"}`);
    }
  };

  const styles = [
    { id: "first", label: "First-Person (I Perspective)", type: "perspective" },
    { id: "third", label: "Third-Person (Story Mode)", type: "perspective" },
    { id: "formal", label: "Formal / Descriptive", type: "tone" },
    { id: "poetic", label: "Creative / Poetic", type: "tone" },
  ];

  return (
    <Page title="Compose">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-semibold text-slate-100">Create a new Story Entry</h2>
        <button onClick={() => setView("dashboard")} className="inline-flex items-center gap-2 text-slate-300 hover:text-amber-200">
          Back to Dashboard
        </button>
      </div>



      <div className="rounded-2xl ring-1 ring-slate-800 bg-slate-900/60 p-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full min-h-[220px] rounded-xl bg-slate-950 text-slate-100 border border-slate-800 p-4 outline-none focus:ring-2 focus:ring-amber-400/40"
        />

        <div className="mt-4">
          <p className="text-sm text-slate-400 mb-2">Regenerate with different style:</p>
          <div className="grid sm:grid-cols-4 gap-3">
            {styles.map((s) => {
              const isActive = s.type === "perspective" ? perspective === s.id : tone === s.id;
              return (
                <button
                  key={s.id + s.type}
                  onClick={() => s.type === "perspective" ? setPerspective(s.id) : setTone(s.id)}
                  className={`rounded-xl px-4 py-2 border transition ${isActive
                    ? "bg-amber-400 text-slate-900 border-amber-300 font-semibold"
                    : "bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-600"
                    }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleRegenerate}
            disabled={loading}
            className={`rounded-full px-5 py-2 font-semibold ${loading ? "bg-slate-600 text-slate-300" : "bg-amber-400 text-slate-900"}`}
          >
            {loading ? "Generating..." : "Generate Narrative"}
          </button>
          <button onClick={handleSave} className="rounded-full bg-slate-800 text-slate-200 px-5 py-2 font-semibold">
            Save Entry
          </button>
        </div>
      </div>
    </Page>
  );
};

export default Compose;
