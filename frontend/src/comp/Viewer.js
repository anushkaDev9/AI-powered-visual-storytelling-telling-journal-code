import React from "react";
import Page from "./Page";
import { useState } from "react";
const Viewer = ({ setView, story }) => {
  // Viewer.js
  const shareText = encodeURIComponent(story.narrative || "Check out my AI-generated story!");
  const shareUrl = encodeURIComponent(window.location.href);

  const socialLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
    whatsapp: `https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`,
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this story?")) return;

    try {
      const res = await fetch(`http://localhost:3000/api/story/${story.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        alert("Story deleted successfully!");
        setView("books"); // navigate back to book list
      } else {
        alert("Failed to delete story.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting story.");
    }
  };

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

  // Determine images to show
  const imagesToShow = story.images && story.images.length > 0
    ? story.images
    : [story.image || require("../Images/book_image.PNG")];

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
        {/* Image + Share section */}
        <div className="rounded-2xl ring-1 ring-slate-800 p-8 bg-slate-900/60 flex flex-col items-center justify-center text-center space-y-6">

          {/* Image Grid */}
          <div className={`grid gap-4 w-full ${imagesToShow.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {imagesToShow.map((imgSrc, idx) => (
              <img
                key={idx}
                src={imgSrc}
                alt={`Story illustration ${idx + 1}`}
                className={`w-full object-cover rounded-xl shadow-lg ${imagesToShow.length === 1 ? 'max-w-sm h-64 mx-auto' : 'h-40'}`}
              />
            ))}
          </div>

          {/* Share buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={socialLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 text-sm font-medium shadow-sm transition-transform hover:scale-105"
            >
              <i className="fa-brands fa-twitter"></i> Twitter
            </a>

            <a
              href={socialLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm font-medium shadow-sm transition-transform hover:scale-105"
            >
              <i className="fa-brands fa-facebook-f"></i> Facebook
            </a>

            <a
              href={socialLinks.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-blue-800 hover:bg-blue-900 text-white px-3 py-1.5 text-sm font-medium shadow-sm transition-transform hover:scale-105"
            >
              <i className="fa-brands fa-linkedin-in"></i> LinkedIn
            </a>

            <a
              href={socialLinks.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-pink-500 hover:bg-pink-600 text-white px-3 py-1.5 text-sm font-medium shadow-sm transition-transform hover:scale-105"
            >
              <i className="fa-brands fa-instagram"></i> Instagram
            </a>
          </div>

        </div>





        {/* Text + Buttons */}
        <div className="rounded-2xl ring-1 ring-slate-800 bg-slate-900/60 p-6 flex flex-col">
          <p className="text-slate-200 leading-relaxed mt-4 text-base text-left">
            {story.narrative || "No description available."}
          </p>

          <div className="mt-auto pt-6 flex flex-wrap gap-3">
            <button
              onClick={() => {
                // Store the DB values so Compose can pick them up
                if (story?.image) localStorage.setItem("SHARED_IMAGE_DATAURL", story.image);
                if (story?.narrative) localStorage.setItem("AI_NARRATIVE", story.narrative);
                setView("compose");
              }}
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 text-slate-900 px-5 py-2 font-semibold"
            >
              Regenerate
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-full bg-slate-800 text-slate-200 px-5 py-2 font-semibold"
            >
              Delete
            </button>



          </div>
        </div>
      </div>
    </Page>
  );
};

export default Viewer;
