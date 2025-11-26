import React, { useState, useEffect, useRef } from 'react';
import Page from '../Page';
import { AiOutlineCloudUpload, AiOutlineClose } from "react-icons/ai";
import placeholderImage from '../../Images/book_image.PNG';

const CreateEntry = ({ setView, setSharedImages }) => {
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false); // Add loading state

  // ⭐ NEW: story line count instead of prompt
  const [lineCount, setLineCount] = useState(10);
  const [context, setContext] = useState("");

  const [selectedPerspective, setSelectedPerspective] = useState("first");
  const [selectedTone, setSelectedTone] = useState("formal");

  const fileInputRef = useRef(null);
  const API_BASE = "http://localhost:3000";

  // Load saved preview
  useEffect(() => {
    const savedPhoto = localStorage.getItem("pickedPhotoUrl");
    if (savedPhoto) {
      setSelectedPhotoUrls(prev => [...prev, savedPhoto]);
      localStorage.removeItem("pickedPhotoUrl"); // Clear after use
    }

    const savedMedia = localStorage.getItem("pickedMediaUrl");
    if (savedMedia) {
      setSelectedPhotoUrls(prev => [...prev, savedMedia]);
      localStorage.removeItem("pickedMediaUrl"); // Clear after use
    }

    const savedMediaList = localStorage.getItem("pickedMediaUrls");
    if (savedMediaList) {
      try {
        const urls = JSON.parse(savedMediaList);
        if (Array.isArray(urls)) {
          setSelectedPhotoUrls(prev => [...prev, ...urls]);
        }
      } catch (e) {
        console.error("Failed to parse picked media", e);
      }
      localStorage.removeItem("pickedMediaUrls");
    }
  }, []);

  // Import from device
  const handleDeviceImport = () => fileInputRef.current.click();

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Limit to 5 images total
    if (selectedFiles.length + files.length > 5) {
      alert("You can only upload up to 5 images.");
      return;
    }

    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);

    // Create URLs for preview
    const newUrls = files.map(file => URL.createObjectURL(file));
    setSelectedPhotoUrls(prev => [...prev, ...newUrls]);

    // Share all images with App
    if (newFiles.length > 0) {
      setSharedImages(newFiles);
    }
  };

  const removeImage = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = selectedPhotoUrls.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setSelectedPhotoUrls(newUrls);
    if (newFiles.length > 0) {
      setSharedImages(newFiles);
    } else {
      setSharedImages(null);
    }
  };

  // ⭐ Send to backend
  const sendToBackend = async () => {
    // Check if we have any images
    if (selectedPhotoUrls.length === 0) {
      alert("Please upload at least one image!");
      return;
    }

    // Prevent multiple clicks by setting loading state
    if (isGenerating) return;

    setIsGenerating(true);

    try {
      let formData = new FormData();

      // Append all files
      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      // Handle URL-based images (e.g. from Google Photos) that aren't in selectedFiles
      const remoteUrls = selectedPhotoUrls.filter(url => !url.startsWith('blob:'));

      for (const url of remoteUrls) {
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error("Failed to fetch one of the selected images");
        const blob = await response.blob();
        formData.append("images", blob, "imported-image.jpg");
      }

      formData.append("perspective", selectedPerspective);
      formData.append("tone", selectedTone);
      formData.append("lineCount", lineCount);
      formData.append("context", context);

      console.log("Sending FormData with", selectedFiles.length + remoteUrls.length, "images");

      const response = await fetch(`${API_BASE}/ai/generate-narrative`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("Backend responded:", data);

      if (data.error) {
        throw new Error(data.error);
      }

      localStorage.setItem("AI_NARRATIVE", data.narrative);

      // Save all image URLs for Compose to recover if needed
      if (selectedPhotoUrls.length > 0) {
        try {
          const dataUrls = [];

          // Helper to read file as dataURL
          const readFile = (file) => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });

          // Process files
          for (const file of selectedFiles) {
            const dUrl = await readFile(file);
            dataUrls.push(dUrl);
          }

          // Process remote URLs
          for (const url of remoteUrls) {
            dataUrls.push(url);
          }

          // Clear old keys to free up space
          localStorage.removeItem("SHARED_IMAGE_DATAURLS");
          localStorage.removeItem("SHARED_IMAGE_DATAURL");

          localStorage.setItem("SHARED_IMAGE_DATAURLS", JSON.stringify(dataUrls));

          // Legacy support
          if (dataUrls.length > 0) {
            localStorage.setItem("SHARED_IMAGE_DATAURL", dataUrls[0]);
          }
        } catch (storageErr) {
          console.warn("LocalStorage quota exceeded. Images will not be persisted for refresh.", storageErr);
        }
      }

      alert("Narrative generated!");
      setView("compose");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to send request: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const styles = [
    { id: "first", label: "First-Person (I Perspective)" },
    { id: "third", label: "Third-Person (Story Mode)" },
    { id: "formal", label: "Formal / Descriptive" },
    { id: "poetic", label: "Creative / Poetic" },
  ];

  return (
    <Page title="Create Entry">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-semibold text-slate-100">Create a new Entry</h2>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* LEFT SIDE */}
        <div className="rounded-2xl ring-1 ring-slate-800 overflow-hidden bg-slate-900/60 p-6">
          <div className="mx-auto max-w-md">
            <div className="h-14 w-14 rounded-xl bg-amber-400/15 border border-amber-300/30 grid place-items-center text-amber-200 mb-4">
              <AiOutlineCloudUpload />
            </div>

            <h3 className="text-xl font-semibold">Upload Photos</h3>
            <p className="text-slate-400 mt-2 text-sm">
              Drop Images here . Upload up to 5 images.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-amber-400 text-slate-900 px-4 py-2 font-semibold"
                onClick={handleDeviceImport}
              >
                Import from device
              </button>

              <input
                type="file"
                accept="image/*"
                multiple // ✅ Allow multiple files
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />

              <button
                className="rounded-full border border-slate-700 px-4 py-2 font-semibold text-slate-200"
                onClick={() =>
                  window.location.assign(
                    `${API_BASE}/photos/auth?next=${encodeURIComponent("/?view=photosPicker")}`
                  )
                }
              >
                Import from Google Photos
              </button>

              <button
                className="rounded-full border border-slate-700 px-4 py-2 font-semibold text-slate-200"
                onClick={() => {
                  window.location.hash = "mode=pick";
                  setView("media-library");
                }}
              >
                Import from Media Library
              </button>
            </div>

            {/* Image Grid */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              {selectedPhotoUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Selected ${index}`}
                    className="w-full h-32 object-cover rounded-xl border border-slate-700"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <AiOutlineClose size={14} />
                  </button>
                </div>
              ))}
              {selectedPhotoUrls.length === 0 && (
                <div className="col-span-2 flex justify-center">
                  <img
                    src={placeholderImage}
                    alt="Placeholder"
                    className="w-1/2 opacity-50 rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Debug info */}
            {selectedPhotoUrls.length > 0 && (
              <div className="mt-2 text-xs text-slate-400">
                {selectedFiles.length} files selected.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="rounded-2xl ring-1 ring-slate-800 bg-slate-900/60 p-6">
          {/* Perspective */}
          <p className="text-sm text-slate-300 mb-2">Choose Perspective</p>
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {styles.slice(0, 2).map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPerspective(p.id)}
                className={`rounded-xl px-4 py-3 text-left border transition ${selectedPerspective === p.id
                  ? "bg-amber-400 text-slate-900 border-amber-300"
                  : "bg-slate-900/40 border-slate-700 text-slate-200 hover:border-slate-600"
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Tone */}
          <p className="text-sm text-slate-300 mb-2">Choose Tone</p>
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {styles.slice(2).map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTone(t.id)}
                className={`rounded-xl px-4 py-3 text-left border transition ${selectedTone === t.id
                  ? "bg-amber-400 text-slate-900 border-amber-300"
                  : "bg-slate-900/40 border-slate-700 text-slate-200 hover:border-slate-600"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ⭐ NEW — Line Count Input */}
          <div className="mt-8">
            <p className="text-sm text-slate-300 mb-2">How many lines should the story be?</p>

            <input
              type="number"
              min="1"
              max="50"
              value={lineCount}
              onChange={(e) => setLineCount(e.target.value)}
              className="w-full rounded-xl bg-slate-950 text-slate-100 border border-slate-800 p-3 outline-none focus:ring-2 focus:ring-amber-400/40"
            />
          </div>

          {/* ⭐ NEW — Context / Keywords Input */}
          <div className="mt-6">
            <p className="text-sm text-slate-300 mb-2">Add Context or Keywords (Optional)</p>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="E.g., This was a sunny day at the beach..."
              className="w-full rounded-xl bg-slate-950 text-slate-100 border border-slate-800 p-3 outline-none focus:ring-2 focus:ring-amber-400/40 min-h-[100px]"
            />
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={sendToBackend}
              disabled={isGenerating}
              className={`rounded-full px-5 py-2 font-semibold transition-all duration-200 flex items-center gap-2 ${isGenerating
                ? "bg-amber-400/50 text-slate-700 cursor-not-allowed"
                : "bg-amber-400 text-slate-900 hover:bg-amber-300"
                }`}
            >
              {isGenerating && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-700 border-t-transparent"></div>
              )}
              {isGenerating ? "Generating..." : "Generate Narrative"}
            </button>
          </div>
        </div>
      </div>
    </Page>
  );
};

export default CreateEntry;
