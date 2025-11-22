import React from "react";
import Page from "./Page";
import { useState } from "react";
const Viewer = ({ setView, story }) => {
  const styleBtns = [
    "First-Person (I Perspective)",
    "Third-Person (Story Mode)",
    "Creative / Poetic",
    "Formal / Descriptive",
  ];
 const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // ⭐ NEW: story line count instead of prompt
  const [lineCount, setLineCount] = useState(10);
  const [context, setContext] = useState("");

  const [selectedPerspective, setSelectedPerspective] = useState("first");
  const [selectedTone, setSelectedTone] = useState("formal");
   const styles = [
    { id: "first", label: "First-Person (I Perspective)" },
    { id: "third", label: "Third-Person (Story Mode)" },
    { id: "formal", label: "Formal / Descriptive" },
    { id: "poetic", label: "Creative / Poetic" },
  ];
  if (!story) {
    return (
      <Page title="Viewer">
        <div className="h-40 grid place-items-center text-slate-400">
          No story selected. Go back to your books.
        </div>
        <div className="mt-6 text-center">
          <button
            onClick={() => setView("books")}
            className="rounded-full bg-amber-400 text-slate-900 px-5 py-2 font-semibold"
          >
            Back to My Books
          </button>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Viewer">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-semibold text-slate-100">Storybook</h2>
        <button
          onClick={() => setView("books")}
          className="inline-flex items-center gap-2 text-slate-300 hover:text-amber-200"
        >
          Back to My books
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
  {/* Image + description in one box */}
  <div className="rounded-2xl overflow-hidden ring-1 ring-slate-800 p-4 bg-slate-900/60 text-center">
    <img
      src={story.image || require("../Images/book_image.PNG")}
      alt="Story illustration"
      className="w-full max-w-sm mx-auto h-64 object-cover rounded-xl shadow-lg"
    />
    <p className="text-slate-200 leading-relaxed mt-4 text-base text-left">
      {story.narrative || "No description available."}
    </p>
  </div>



        {/* Text + Buttons */}
        <div className="rounded-2xl ring-1 ring-slate-800 bg-slate-900/60 p-6 flex flex-col">
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

          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            {styleBtns.map((b) => (
              <button
                key={b}
                className="rounded-xl bg-slate-800 text-slate-200 px-4 py-2 border border-slate-700 hover:border-slate-600 text-sm"
              >
                {b}
              </button>
            ))}
          </div>

          <div className="mt-auto pt-6 flex flex-wrap gap-3">
            <button
              onClick={() => alert("Regenerated!")}
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 text-slate-900 px-5 py-2 font-semibold"
            >
              Regenerate
            </button>
            <button className="inline-flex items-center gap-2 rounded-full bg-slate-800 text-slate-200 px-5 py-2 font-semibold">
              Save
            </button>
            <button className="inline-flex items-center gap-2 rounded-full bg-slate-800 text-slate-200 px-5 py-2 font-semibold">
              Share
            </button>
          </div>
        </div>
      </div>
    </Page>
  );
};

export default Viewer;
