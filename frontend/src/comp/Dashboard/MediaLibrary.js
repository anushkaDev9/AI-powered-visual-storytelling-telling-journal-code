import React, { useEffect, useState, useRef } from 'react';
import Page from '../Page';
import { AiOutlineCloudUpload, AiOutlinePlus, AiOutlineCheck } from "react-icons/ai";

const MediaLibrary = ({ setView }) => {
    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]); // Array of URLs
    const fileInputRef = useRef(null);

    const API_BASE = "http://localhost:3000";
    const isPickMode = window.location.hash.includes("mode=pick");

    useEffect(() => {
        fetchMedia();
    }, []);

    const fetchMedia = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/media/list`, { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setMedia(data.items || []);
            }
        } catch (err) {
            console.error("Failed to load media", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("image", file);

        try {
            const res = await fetch(`${API_BASE}/api/media/upload`, {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            if (res.ok) {
                await fetchMedia(); // Refresh list
            } else {
                alert("Upload failed");
            }
        } catch (err) {
            console.error("Upload error", err);
        } finally {
            setUploading(false);
        }
    };

    const handleImageClick = (item) => {
        if (isPickMode) {
            setSelectedItems(prev => {
                if (prev.includes(item.imageUrl)) {
                    return prev.filter(url => url !== item.imageUrl);
                } else {
                    return [...prev, item.imageUrl];
                }
            });
        }
    };

    const handleDonePicking = () => {
        if (selectedItems.length > 0) {
            localStorage.setItem("pickedMediaUrls", JSON.stringify(selectedItems));
        }
        window.location.hash = ""; // Clear mode
        setView("create");
    };

    return (
        <Page title="Media Library">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-semibold text-slate-100">
                    {isPickMode ? "Pick Photos" : "Media Library"}
                </h2>
                <div className="flex gap-3">
                    {isPickMode && (
                        <button
                            onClick={handleDonePicking}
                            className="bg-amber-400 text-slate-900 px-4 py-2 rounded-full font-semibold hover:bg-amber-300 transition"
                        >
                            Done ({selectedItems.length})
                        </button>
                    )}
                    <button onClick={() => setView("dashboard")} className="text-slate-300 hover:text-amber-200 px-3 py-2">
                        {isPickMode ? "Cancel" : "Back to Dashboard"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* Upload Card */}
                <div className="aspect-square rounded-2xl border-2 border-dashed border-slate-700 hover:border-amber-400/50 bg-slate-900/30 flex flex-col items-center justify-center cursor-pointer transition group"
                    onClick={() => fileInputRef.current.click()}>
                    <div className="h-12 w-12 rounded-full bg-slate-800 group-hover:bg-amber-400/20 flex items-center justify-center mb-2 transition">
                        <AiOutlinePlus className="text-2xl text-slate-400 group-hover:text-amber-400" />
                    </div>
                    <span className="text-sm text-slate-400 group-hover:text-slate-200 font-medium">Upload Photo</span>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileUpload}
                    />
                </div>

                {/* Import from Google Photos Card */}
                <div className="aspect-square rounded-2xl border-2 border-dashed border-slate-700 hover:border-blue-400/50 bg-slate-900/30 flex flex-col items-center justify-center cursor-pointer transition group"
                    onClick={() => {
                        window.location.hash = "mode=library";
                        setView("photosPicker");
                    }}>
                    <div className="h-12 w-12 rounded-full bg-slate-800 group-hover:bg-blue-400/20 flex items-center justify-center mb-2 transition">
                        <AiOutlineCloudUpload className="text-2xl text-slate-400 group-hover:text-blue-400" />
                    </div>
                    <span className="text-sm text-slate-400 group-hover:text-slate-200 font-medium">Import from Google</span>
                </div>

                {/* Media Items */}
                {media.map((item) => {
                    const isSelected = selectedItems.includes(item.imageUrl);
                    return (
                        <div
                            key={item.id}
                            className={`aspect-square rounded-2xl overflow-hidden relative group border cursor-pointer transition-all ${isSelected
                                    ? "border-amber-400 ring-2 ring-amber-400/50 scale-95"
                                    : "border-slate-800 bg-slate-900 hover:border-slate-600"
                                }`}
                            onClick={() => handleImageClick(item)}
                        >
                            <img
                                src={item.imageUrl}
                                alt={item.filename}
                                className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                            />

                            {/* Selection Overlay */}
                            {isSelected && (
                                <div className="absolute inset-0 bg-amber-400/20 flex items-center justify-center">
                                    <div className="bg-amber-400 text-slate-900 rounded-full p-2">
                                        <AiOutlineCheck size={20} />
                                    </div>
                                </div>
                            )}

                            {!isSelected && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                    <p className="text-xs text-slate-300 truncate">{item.filename}</p>
                                </div>
                            )}
                        </div>
                    );
                })}

                {loading && (
                    <div className="col-span-full text-center py-10 text-slate-500">Loading media...</div>
                )}
            </div>

            {uploading && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 flex flex-col items-center">
                        <div className="animate-spin h-8 w-8 border-4 border-amber-400 border-t-transparent rounded-full mb-4"></div>
                        <p className="text-slate-200">Uploading...</p>
                    </div>
                </div>
            )}
        </Page>
    );
};

export default MediaLibrary;
